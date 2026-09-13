import type { Scene } from './scene';
import { CameraController, CancelledSession, cameraErrorMessage } from './camera';
import { renderGuides } from './guides';
import { emptyInteraction, interpretTracking } from './gestures';
import type { Tracker } from './tracking';
import type { SimulationFrame } from './simulation';
import { registerAppTools } from './webmcp';
import { DemoController } from './demo';
import { hasAdultConsent } from './interface';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let initialized = false;
let startSession: (() => Promise<void>) | undefined;

export function initializeSession(scene: Scene, startNow = true) {
  if (initialized) {
    if (startNow) void startSession?.();
    return;
  }
  initialized = true;
  let tracker: Tracker | null = null;
  let ticket = 0;
  let starting = false;
  let cameraPaused = false;
  let lastUi = 0;
  let lastAnnouncement = '';
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const camera = new CameraController(scene.video, constraints => navigator.mediaDevices.getUserMedia(constraints));
  const start = $<HTMLButtonElement>('#start-camera');
  const feedback = $('#feedback');
  const progress = $<HTMLProgressElement>('#load-progress');
  const demo = new DemoController(scene);

  function text(selector: string, value: string) {
    const element = $(selector);
    if (element.textContent !== value) element.textContent = value;
  }

  function showFeedback(title: string, copy: string, percent?: number, error = false) {
    if (error) start.before(feedback);
    else $('main').append(feedback);
    text('#feedback-title', title);
    text('#feedback-copy', copy);
    progress.hidden = percent === undefined;
    if (percent !== undefined) progress.value = percent;
    feedback.classList.toggle('error', error);
    feedback.hidden = false;
  }

  function setActive(active: boolean) {
    document.body.classList.toggle('session-active', active);
    document.body.classList.toggle('demo-on', scene.demoActive);
    $('.welcome').hidden = active;
    $('.live-coach').hidden = !active;
    $('.session-controls').hidden = !active;
    $('#demo-controls').hidden = !scene.demoActive;
    $('#guides-control').hidden = scene.demoActive;
    $('.tracking-pills').hidden = scene.demoActive;
    text('#session-status', scene.demoActive ? 'Demo · camera is off' : active ? 'Camera is on · local only' : 'Camera is off');
  }

  function resetSimulation(announce = false) {
    tracker?.resetSamples();
    scene.resetInteraction();
    demo.reset();
    lastAnnouncement = '';
    lastUi = 0;
    document.body.classList.remove('device-held');
    text('#vapor-status', 'Touch the tip to your mouth to get ready');
    if (announce) text('#interaction-status', 'Device and virtual cloud reset. Close your hand around the vape to pick it up.');
  }

  function stop(focus = false) {
    ticket++;
    starting = false;
    cameraPaused = false;
    clearTimeout(watchdog);
    scene.cameraActive = false;
    scene.demoActive = false;
    scene.demoMouth = null;
    camera.stop();
    tracker?.close();
    tracker = null;
    resetSimulation();
    start.disabled = false;
    text('#start-label', 'Turn on my camera');
    text('#stop-camera', 'Turn camera off ×');
    feedback.hidden = true;
    setActive(false);
    if (focus) start.focus({ preventScroll: true });
  }

  function fail(title: string, message: string) {
    stop();
    text('#start-label', 'Try camera again');
    showFeedback(title, message, undefined, true);
    start.focus({ preventScroll: true });
  }

  startSession = async () => {
    if (!hasAdultConsent() || starting || scene.active) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showFeedback('A secure camera connection is needed', 'Open this page over HTTPS or on localhost in a browser that supports camera access.', undefined, true);
      return;
    }
    resetSimulation();
    starting = true;
    const current = ++ticket;
    start.disabled = true;
    text('#start-label', 'Opening camera…');
    setActive(true);
    text('#session-status', 'Waiting for camera permission');
    text('#stop-camera', 'Cancel camera ×');
    text('#coach-step', 'GETTING READY');
    text('#coach-title', 'Getting ready.');
    text('#coach-hint', 'Allow camera access in your browser to begin.');
    text('#face-pill', 'Looking for face');
    text('#hand-pill', 'Looking for hands');
    $('#face-pill').classList.remove('found');
    $('#hand-pill').classList.remove('found');
    showFeedback('Your camera, your control', 'Choose Allow when your browser asks. You can cancel at any time.');
    try {
      const stream = await camera.start();
      if (current !== ticket) return;
      scene.cameraActive = true;
      cameraPaused = false;
      setActive(true);
      text('#stop-camera', 'Turn camera off ×');
      for (const track of stream.getVideoTracks()) {
        track.addEventListener('ended', () => {
          if (current === ticket) fail('Your camera disconnected', 'Reconnect your camera, then try again.');
        }, { once: true });
        track.addEventListener('mute', () => {
          if (current !== ticket) return;
          cameraPaused = true;
          resetSimulation();
          showFeedback('Camera is paused', 'Your browser or device paused the camera. Return to this page or check its permissions.');
        });
        track.addEventListener('unmute', () => {
          if (current !== ticket) return;
          cameraPaused = false;
          resetSimulation();
          if (tracker?.ready) feedback.hidden = true;
        });
      }
    } catch (error) {
      if (current !== ticket || error instanceof CancelledSession) return;
      const detail = cameraErrorMessage(error);
      fail(detail.title, detail.message);
      return;
    }

    // Model downloads are separate from frame processing. No camera frames are
    // recorded, sent to the server, or included in the optional app controls.
    try {
      showFeedback('Preparing on-device tracking', 'The first visit downloads the hand and face models. Keep this tab open.', 0);
      watchdog = setTimeout(() => {
        if (current === ticket) fail('Tracking took too long to load', 'Check your connection and try again. Your camera has been turned off.');
      }, 90_000);
      const { Tracker: VisionTracker } = await import('./tracking');
      if (current !== ticket) return;
      const activeTracker = new VisionTracker();
      tracker = activeTracker;
      await activeTracker.load((label, percent) => {
        if (current === ticket && !cameraPaused) showFeedback(label, 'Processing stays on this device. Nothing is recorded.', percent);
      });
      if (current !== ticket) { activeTracker.close(); return; }
      clearTimeout(watchdog);
      if (!cameraPaused) feedback.hidden = true;
      starting = false;
      lastUi = 0;
      $('#stop-camera').focus({ preventScroll: true });
    } catch {
      if (current !== ticket) return;
      fail('Tracking could not load', 'Check your connection and try again. If the problem continues, use another browser. Your camera has been turned off.');
    }
  };

  scene.onFrame = time => {
    if (scene.paused || document.hidden) { scene.interaction = emptyInteraction(); return; }
    if (scene.demoActive) { scene.interaction = demo.input(time); return; }
    if (!scene.cameraActive || cameraPaused || document.hidden) {
      scene.interaction = emptyInteraction();
      return;
    }
    try { tracker?.detect(scene.video, time); }
    catch {
      fail('Tracking was interrupted', 'Try starting the camera again. If it keeps happening, close other tabs or use another browser.');
      return;
    }
    const { width, height } = scene.viewport;
    scene.interaction = tracker?.ready
      ? interpretTracking(tracker.snapshot, width, height, scene.video.videoWidth, scene.video.videoHeight, time)
      : emptyInteraction();
  };

  function coaching(frame: SimulationFrame): [string, string, string] {
    const { face, hands } = scene.interaction;
    if (scene.demoActive) return ['CAMERA-FREE DEMO', 'Move it your way.', 'Drag the device or use the controls below. Choose a cloud, ring, or burst to release vapor instantly.'];
    if (cameraPaused) return ['PAUSED', 'Camera paused.', 'The device is back on its stand. Resume your camera to continue.'];
    if (!tracker?.ready) return ['GETTING READY', 'Getting ready.', 'Your camera is ready. Hand and face tracking are loading.'];
    if (frame.trackingLost) return ['FINDING YOUR HAND', 'Hold that thought.', 'Bring your closed hand back into view. The device will return to its stand if tracking is lost.'];
    if (!face) return ['GETTING IN FRAME', 'A little more light.', 'Keep your face in view so vapor can follow your mouth.'];
    if (frame.state === 'exhaling') return ['STEP 3 OF 3', 'Let it drift.', 'Round your lips for rings, or open your mouth wider for a burst.'];
    if (frame.atMouth) return ['READY', 'Ready. No waiting.', 'Move the vape away, then open or round your lips to release vapor immediately.'];
    if (frame.ready) return ['STEP 3 OF 3', 'Your cloud is ready.', 'Open your mouth for a cloud. Make an O with your lips for rings. Relax your lips to pause.'];
    if (frame.held) return ['STEP 2 OF 3', 'Bring it closer.', 'Bring the mouthpiece tip to your mouth. Keep your hand closed around the device.'];
    if (!hands.length) return ['STEP 1 OF 3', 'Raise a hand.', 'Keep your hand in view, then close it around the illustrated vape.'];
    return ['STEP 1 OF 3', 'Pick it up.', 'Close your hand around the vape inside the outline. Open your hand to let go.'];
  }

  scene.onSimulationFrame = (frame, time) => {
    if (!scene.active || scene.paused) return;
    document.body.classList.toggle('device-held', frame.held);
    $('.vapor-status').dataset.state = frame.ready ? 'ready' : 'idle';
    if (time - lastUi < 160) return;
    lastUi = time;
    text('#vapor-status', frame.state === 'exhaling' ? 'Releasing vapor' : frame.ready ? 'Ready · no refill needed' : 'Touch the tip to your mouth to get ready');
    const faceFound = !!scene.interaction.face;
    const handCount = scene.interaction.hands.length;
    text('#face-pill', faceFound ? 'Face in view' : 'Looking for face');
    $('#face-pill').classList.toggle('found', faceFound);
    text('#hand-pill', handCount ? `${handCount === 1 ? 'One hand' : 'Both hands'} in view` : 'Looking for hands');
    $('#hand-pill').classList.toggle('found', handCount > 0);
    const [step, title, hint] = coaching(frame);
    text('#coach-step', step); text('#coach-title', title); text('#coach-hint', hint);
    text('#effect-hint', frame.state === 'exhaling'
      ? frame.emission?.kind === 'ring' ? 'Vapor rings · controlled by your lip shape.' : frame.emission?.kind === 'burst' ? 'Vapor burst · a wider mouth makes a larger cloud.' : 'Soft cloud · relax your lips to pause.'
      : scene.demoActive ? 'Press 1, 2, or 3 for effects. Press R to reset.' : 'Open your hand to let go. Press R to reset.');
    const announcement = `${step}|${title}`;
    if (lastAnnouncement !== announcement) {
      lastAnnouncement = announcement;
      text('#interaction-status', `${title} ${hint}`);
    }
  };

  scene.drawGuides = (ctx, width, height) => {
    if (tracker && !cameraPaused) renderGuides(ctx, width, height, scene.video, tracker.snapshot, performance.now());
  };
  $('#stop-camera').addEventListener('click', () => stop(true));
  $('#start-demo').addEventListener('click', () => {
    if (!hasAdultConsent()) return;
    stop();
    scene.demoActive = true;
    resetSimulation();
    setActive(true);
    text('#stop-camera', 'Exit demo ×');
    $('#demo-mouth').focus({ preventScroll: true });
  });
  $('#reset-simulation').addEventListener('click', () => resetSimulation(true));
  $<HTMLInputElement>('#show-guides').addEventListener('change', event => {
    scene.showGuides = (event.target as HTMLInputElement).checked;
  });
  document.addEventListener('keydown', event => {
    const target = event.target as HTMLElement | null;
    if (!scene.active || scene.paused || event.repeat || event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable || target?.closest('input, textarea, select, dialog, [role="dialog"]')) return;
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); resetSimulation(true); }
  });
  document.addEventListener('visibilitychange', () => resetSimulation());
  window.addEventListener('pagehide', () => stop());
  registerAppTools({
    status: () => ({ cameraOn: scene.cameraActive, demoActive: scene.demoActive, trackingReady: !!tracker?.ready, guidesVisible: scene.showGuides, state: scene.simulation.frame.state, vaporReady: scene.simulation.frame.ready, vaporStrength: Math.round(scene.simulation.frame.charge * 100) }),
    stop: () => stop(true),
    reset: () => resetSimulation(true),
    setGuides: visible => { scene.showGuides = visible; $<HTMLInputElement>('#show-guides').checked = visible; },
  });
  if (startNow) void startSession();
}

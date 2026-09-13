import type { Scene } from './scene';
import { CameraController, CancelledSession, cameraErrorMessage } from './camera';
import { renderGuides } from './guides';
import { isFresh } from './geometry';
import type { Tracker } from './tracking';
import { registerAppTools } from './webmcp';
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let initialized = false;
let startSession: (() => Promise<void>) | undefined;
export function initializeSession(scene: Scene, startNow = true) {
    if (initialized) {
        if (startNow)
            void startSession?.();
        return;
    }
    initialized = true;
    let tracker: Tracker | null = null, ticket = 0, starting = false, lastUi = 0, sessionStarted = 0;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const camera = new CameraController(scene.video, c => navigator.mediaDevices.getUserMedia(c));
    const start = $<HTMLButtonElement>('#start-camera'), feedback = $('#feedback'), progress = $<HTMLProgressElement>('#load-progress');
    function showFeedback(title: string, copy: string, percent?: number, error = false) {
        if (error)
            start.before(feedback);
        else
            $('main').append(feedback);
        $('#feedback-title').textContent = title;
        $('#feedback-copy').textContent = copy;
        progress.hidden = percent === undefined;
        if (percent !== undefined)
            progress.value = percent;
        feedback.classList.toggle('error', error);
        feedback.hidden = false;
    }
    function setActive(active: boolean) {
        document.body.classList.toggle('camera-on', active);
        $('.welcome').hidden = active;
        $('.live-coach').hidden = !active;
        $('.session-controls').hidden = !active;
        $('#session-status').textContent = active ? 'Camera is on · local only' : 'Camera is off';
    }
    function stop(focus = false) {
        ticket++;
        starting = false;
        clearTimeout(watchdog);
        scene.cameraActive = false;
        camera.stop();
        tracker?.close();
        tracker = null;
        start.disabled = false;
        $('#start-label').textContent = 'Turn on my camera';
        $('#stop-camera').textContent = 'Turn camera off ×';
        feedback.hidden = true;
        setActive(false);
        if (focus)
            start.focus({ preventScroll: true });
    }
    function fail(title: string, message: string) { stop(); $('#start-label').textContent = 'Try camera again'; showFeedback(title, message, undefined, true); start.focus({ preventScroll: true }); }
    startSession = async () => {
        if (starting || scene.cameraActive)
            return;
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            showFeedback('A secure camera connection is needed', 'Open this page over HTTPS or on localhost in a browser that supports camera access.', undefined, true);
            return;
        }
        starting = true;
        const current = ++ticket;
        start.disabled = true;
        $('#start-label').textContent = 'Opening camera…';
        setActive(true);
        $('#session-status').textContent = 'Waiting for camera permission';
        $('#stop-camera').textContent = 'Cancel camera ×';
        $('#coach-title').innerHTML = 'Getting <em>ready.</em>';
        $('#coach-hint').textContent = 'Allow camera access in your browser to begin.';
        showFeedback('Your camera, your control', 'Choose Allow when your browser asks. You can cancel at any time.');
        try {
            const stream = await camera.start();
            if (current !== ticket)
                return;
            scene.cameraActive = true;
            sessionStarted = performance.now();
            setActive(true);
            $('#stop-camera').textContent = 'Turn camera off ×';
            for (const track of stream.getVideoTracks()) {
                track.addEventListener('ended', () => { if (current === ticket)
                    fail('Your camera disconnected', 'Reconnect your camera, then try again.'); }, { once: true });
                track.addEventListener('mute', () => { if (current === ticket) {
                    tracker?.resetSamples();
                    showFeedback('Camera is paused', 'Your browser or device paused the camera. Return to this page or check its permissions.');
                } });
                track.addEventListener('unmute', () => { if (current === ticket && tracker?.ready)
                    feedback.hidden = true; });
            }
        }
        catch (error) {
            if (current !== ticket || error instanceof CancelledSession)
                return;
            const detail = cameraErrorMessage(error);
            fail(detail.title, detail.message);
            return;
        }
        // Models load only after the user starts the camera. Frames stay in browser memory.
        try {
            showFeedback('Preparing on-device tracking', 'The first visit downloads the hand and face models. Keep this tab open.', 0);
            watchdog = setTimeout(() => { if (current === ticket)
                fail('Tracking took too long to load', 'Check your connection and try again. Your camera has been turned off.'); }, 90000);
            const { Tracker: VisionTracker } = await import('./tracking');
            if (current !== ticket)
                return;
            const activeTracker = new VisionTracker();
            tracker = activeTracker;
            await activeTracker.load((label, percent) => { if (current === ticket)
                showFeedback(label, 'Processing stays on this device. Nothing is recorded.', percent); });
            if (current !== ticket) {
                activeTracker.close();
                return;
            }
            clearTimeout(watchdog);
            feedback.hidden = true;
            starting = false;
            $('#coach-title').innerHTML = 'Hello, <em>you.</em>';
            $('#stop-camera').focus({ preventScroll: true });
        }
        catch {
            if (current !== ticket)
                return;
            fail('Tracking could not load', 'Check your connection and try again. If the problem continues, use another browser. Your camera has been turned off.');
        }
    };
    scene.onFrame = time => {
        if (!scene.cameraActive)
            return;
        try {
            tracker?.detect(scene.video, time);
        }
        catch {
            fail('Tracking was interrupted', 'Try starting the camera again. If it keeps happening, close other tabs or use another browser.');
            return;
        }
        if (time - lastUi < 250)
            return;
        lastUi = time;
        const sample = tracker?.snapshot, hasFace = !!sample?.face && isFresh(sample.faceTime, time), handCount = sample && isFresh(sample.handTime, time) ? sample.hands.length : 0;
        $('#face-pill').textContent = hasFace ? 'Face in view' : 'Looking for face';
        $('#face-pill').classList.toggle('found', hasFace);
        $('#hand-pill').textContent = handCount ? `${handCount === 1 ? 'One hand' : 'Both hands'} in view` : 'Looking for hands';
        $('#hand-pill').classList.toggle('found', handCount > 0);
        if (!tracker?.ready) {
            $('#coach-hint').textContent = 'Your camera is ready. Tracking is loading.';
            return;
        }
        $('#coach-hint').textContent = hasFace && handCount ? 'You’re in frame. Move your hands and watch the guides follow.' : !hasFace && !handCount && time - sessionStarted > 7000 ? 'Face the camera in good light, then raise an open hand.' : !hasFace ? 'Keep your face in view so we can find your mouth.' : 'Raise an open hand, with your fingers inside the frame.';
    };
    scene.drawGuides = (ctx, w, h) => { if (tracker)
        renderGuides(ctx, w, h, scene.video, tracker.snapshot, performance.now()); };
    $('#stop-camera').addEventListener('click', () => stop(true));
    $<HTMLInputElement>('#show-guides').addEventListener('change', event => { scene.showGuides = (event.target as HTMLInputElement).checked; });
    document.addEventListener('visibilitychange', () => tracker?.resetSamples());
    window.addEventListener('pagehide', () => stop());
    registerAppTools({ status: () => ({ cameraOn: scene.cameraActive, trackingReady: !!tracker?.ready, guidesVisible: scene.showGuides }), stop: () => stop(true), setGuides: visible => { scene.showGuides = visible; $<HTMLInputElement>('#show-guides').checked = visible; } });
    if (startNow)
        void startSession();
}

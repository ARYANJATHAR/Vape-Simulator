import './style.css';
import { Scene } from './scene';
import { initializeSession } from './session';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="scene" aria-label="Illustrated vape and camera scene"></canvas>
  <video id="camera" autoplay playsinline muted aria-hidden="true"></video>
  <div class="scene-wash" aria-hidden="true"></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Vape Studio home"><span class="brand-mark" aria-hidden="true">◎</span><span>Vape <em>Studio</em><small>A CAMERA SIMULATION</small></span></a>
    <span class="edition">THE CAMERA EDITION <span>01 / 02</span></span>
  </header>
  <main>
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="eyebrow"><span>VIRTUAL DEVICE. REAL GESTURES.</span><span class="age-badge">18+</span></div>
      <h1 id="welcome-title">A little cloud.<br>A little <em>hand magic.</em></h1>
      <p class="intro-copy">Your hands are the controller.<br>Let’s get your camera ready.</p>
      <div class="instructions"><p><span>01</span>Allow your camera.</p><p><span>02</span>Keep your face and hands in view.</p></div>
      <button class="primary" id="start-camera" type="button"><span class="camera-icon" aria-hidden="true"></span><span id="start-label">Turn on my camera</span><span aria-hidden="true">↗</span></button>
      <p class="privacy">On-device tracking. No recording. No microphone.</p>
      <p class="scope-note">Camera & tracking preview · Pickup and vapor come next.</p>
    </section>
    <section class="live-coach" aria-labelledby="coach-title" hidden>
      <p class="eyebrow">GETTING IN FRAME</p>
      <h1 id="coach-title">Hello, <em>you.</em></h1>
      <p id="coach-hint">Keep your face and an open hand in view.</p>
      <div class="tracking-pills"><span id="face-pill">Looking for face</span><span id="hand-pill">Looking for hands</span></div>
      <p class="scope-note">Tracking preview · The device stays on its stand for now.</p>
    </section>
    <section class="feedback" id="feedback" hidden aria-live="polite" aria-atomic="true"><strong id="feedback-title"></strong><p id="feedback-copy"></p><progress id="load-progress" max="100" value="0" aria-label="Loading camera tracking"></progress></section>
  </main>
  <aside class="device-caption"><span class="caption-line" aria-hidden="true"></span><span>THE STUDIO POD<small>Slate / No. 01</small></span></aside>
  <footer class="footer">
    <p class="legal">A simulation, for adults.<br>No tobacco, nicotine, or real vapor.</p>
    <div class="session-controls" hidden><label class="toggle"><input id="show-guides" type="checkbox" checked /><span>Tracking guides</span></label><button id="stop-camera" class="quiet-button" type="button">Turn camera off <span aria-hidden="true">×</span></button></div>
    <span class="local-note"><i aria-hidden="true"></i><span id="session-status">Camera is off</span></span>
  </footer>
`;
const scene = new Scene(document.querySelector<HTMLCanvasElement>('#scene')!, document.querySelector<HTMLVideoElement>('#camera')!);
scene.start();
initializeSession(scene, false);
document.querySelector<HTMLButtonElement>('#start-camera')!.addEventListener('click', () => {
    initializeSession(scene);
});

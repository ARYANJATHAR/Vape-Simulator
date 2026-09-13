import './style.css';
import { Scene } from './scene';
import { initializeSession } from './session';
import { setupInterface } from './interface';
import { THEMES } from './themes';
import { setupMobileLayout } from './mobile';
import { inject } from '@vercel/analytics';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="scene" aria-label="Illustrated vape and camera scene"></canvas>
  <video id="camera" autoplay playsinline muted aria-hidden="true"></video>
  <div class="scene-wash" aria-hidden="true"></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Vape Studio home"><span class="brand-mark" aria-hidden="true">◎</span><span>Vape <em>Studio</em><small>A CAMERA SIMULATION</small></span></a>
    <button class="header-help" data-open-dialog="help-dialog" aria-haspopup="dialog" aria-controls="help-dialog" aria-expanded="false">How it works <span aria-hidden="true">?</span></button>
  </header>
  <main>
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="eyebrow"><span>VIRTUAL DEVICE. REAL GESTURES.</span><span class="age-badge">18+</span></div>
      <h1 id="welcome-title">A little cloud.<br>A little <em>hand magic.</em></h1>
      <div id="age-screen">
        <h2 class="age-question">Are you 18 or older?</h2>
        <p class="intro-copy">An adults-only camera simulation. No tobacco, nicotine, or real vapor. This is not an invitation to vape.</p>
        <div class="age-actions"><button id="age-yes" class="primary">Yes, I’m 18 or older</button><button id="age-no" class="secondary">No</button></div>
      </div>
      <div id="age-denied" hidden tabindex="-1" role="status"><h2 class="age-question">This experience is for adults.</h2><p class="intro-copy">You can close this page. No camera access has been requested.</p></div>
      <div id="ready-screen" hidden>
        <ol class="instructions"><li><span>01</span>Close your hand around the vape.</li><li><span>02</span>Bring the tip to your mouth. It’s ready instantly.</li><li><span>03</span>Move it away and open your mouth for a cloud.</li></ol>
        <button class="theme-opener" data-open-dialog="theme-dialog" aria-haspopup="dialog" aria-controls="theme-dialog" aria-expanded="false"><span><small>Your atmosphere</small><strong data-current-theme>Slate</strong></span><span aria-hidden="true">↗</span></button>
        <button class="primary" id="start-camera" type="button"><span class="camera-icon" aria-hidden="true"></span><span id="start-label">Turn on my camera</span><span aria-hidden="true">↗</span></button>
        <button class="demo-start secondary" id="start-demo">Try without a camera</button>
        <p class="privacy">On-device tracking. No recording. No microphone.</p>
        <p class="scope-note">Lip gestures control the effect. Breathing isn’t measured.</p>
      </div>
    </section>
    <section class="live-coach" aria-labelledby="coach-title" hidden>
      <p class="eyebrow" id="coach-step">GETTING IN FRAME</p>
      <h2 id="coach-title">Hello, you.</h2>
      <p id="coach-hint">Keep your face and an open hand in view.</p>
      <div class="tracking-pills"><span id="face-pill">Looking for face</span><span id="hand-pill">Looking for hands</span></div>
      <p class="vapor-status"><span class="status-dot" aria-hidden="true"></span><span id="vapor-status">Touch the tip to your mouth</span></p>
      <p class="scope-note" id="effect-hint">Open your hand to release the device.</p>
      <p class="sr-only" id="interaction-status" role="status" aria-live="polite"></p>
    </section>
    <section class="feedback" id="feedback" hidden aria-live="polite" aria-atomic="true"><strong id="feedback-title"></strong><p id="feedback-copy"></p><progress id="load-progress" max="100" value="0" aria-label="Loading camera tracking"></progress></section>
  </main>
  <aside class="device-caption"><span class="caption-line" aria-hidden="true"></span><span>THE STUDIO POD<small><span data-current-theme>Slate</span> / No. 01</small></span></aside>
  <section id="demo-controls" class="demo-controls" hidden aria-label="Camera-free controls">
    <p>Drag the vape, or use the controls.</p>
    <div class="demo-row"><button id="demo-mouth">To mouth</button><button id="demo-away">Move away</button><button id="demo-drop">Let go</button></div>
    <div class="demo-row effects"><button data-demo-effect="cloud" aria-keyshortcuts="1">Cloud <kbd>1</kbd></button><button data-demo-effect="ring" aria-keyshortcuts="2">Ring <kbd>2</kbd></button><button data-demo-effect="burst" aria-keyshortcuts="3">Burst <kbd>3</kbd></button></div>
  </section>
  <p id="theme-toast" class="toast" role="status" aria-live="polite" hidden></p>
  <footer class="footer">
    <div class="footer-about"><p class="legal">A simulation, for adults.<br>No tobacco, nicotine, or real vapor.</p><nav class="creator-links" aria-label="Creator profiles"><span>Made by Aryan Jathar</span><a href="https://github.com/ARYANJATHAR" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://www.linkedin.com/in/aryanjathar07/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></nav></div>
    <div class="session-controls" hidden>
      <button class="quiet-button theme-small" data-open-dialog="theme-dialog" aria-haspopup="dialog" aria-controls="theme-dialog" aria-expanded="false"><span data-current-theme>Slate</span> <span aria-hidden="true">↗</span></button>
      <label class="toggle" id="guides-control"><input id="show-guides" type="checkbox" checked /><span>Guides</span></label>
      <button id="reset-simulation" class="quiet-button" aria-keyshortcuts="R" title="Reset device and vapor (R)">Reset</button>
      <button id="stop-camera" class="quiet-button">Turn camera off <span aria-hidden="true">×</span></button>
    </div>
    <span class="local-note"><i aria-hidden="true"></i><span id="session-status">Camera is off</span></span>
  </footer>
  <dialog id="theme-dialog" class="studio-dialog" aria-labelledby="theme-title" aria-describedby="theme-description">
    <div class="dialog-top"><span class="eyebrow">THE STUDIO COLLECTION / 06</span><form method="dialog"><button class="close-button" aria-label="Close theme picker">×</button></form></div>
    <h2 id="theme-title">Pick your <em>atmosphere.</em></h2>
    <p id="theme-description">A color for your device. A different kind of drift.</p>
    <div class="theme-grid" role="group" aria-label="Visual themes">${THEMES.map(theme => `
      <button class="theme-choice" data-theme="${theme.id}" aria-pressed="false" style="--swatch:${theme.accent};--swatch-paper:${theme.pale}"><span class="theme-swatch" aria-hidden="true">◎</span><span class="theme-name">${theme.name}<span class="theme-check" aria-hidden="true">✓</span></span><small>${theme.note}</small></button>`).join('')}
    </div>
    <div class="dialog-bottom"><span>Cosmetic themes. Saved on this device.</span><button id="theme-random" class="text-button">Surprise me ↗</button></div>
  </dialog>
  <dialog id="help-dialog" class="studio-dialog help-dialog" aria-labelledby="help-title">
    <div class="dialog-top"><span class="eyebrow">A SMALL GUIDE</span><form method="dialog"><button class="close-button" aria-label="Close instructions">×</button></form></div>
    <h2 id="help-title">All in your <em>hands.</em></h2>
    <ol class="help-steps"><li><strong>Pick it up.</strong> Close your hand around the illustrated vape. Keep your hand and face in good light.</li><li><strong>Bring it close.</strong> Touch the mouthpiece to your mouth. Vapor is ready immediately—there’s no meter to fill.</li><li><strong>Let it drift.</strong> Move the device away, then open your mouth for a cloud. Round your lips for rings; open wider for a burst. Relax your lips to stop.</li></ol>
    <div class="help-notes"><p><strong>No camera?</strong> Choose “Try without a camera.” Drag the device or use To mouth and Move away. Click Cloud, Ring, or Burst for an instant effect.</p><p><strong>Start over.</strong> Open your hand to let go. Press <kbd>R</kbd> to reset. In the demo, <kbd>1</kbd>, <kbd>2</kbd>, and <kbd>3</kbd> create the three effects.</p><p><strong>Your camera stays local.</strong> There is no recording, microphone, or frame upload. Camera access starts only when you choose it, and ends when you turn it off or leave. Motion follows your device’s reduced-motion setting.</p></div>
  </dialog>
`;

const scene = new Scene(document.querySelector<HTMLCanvasElement>('#scene')!, document.querySelector<HTMLVideoElement>('#camera')!);
setupInterface(scene);
setupMobileLayout();
initializeSession(scene, false);
scene.start();
document.querySelector<HTMLButtonElement>('#start-camera')!.addEventListener('click', () => initializeSession(scene));

// Initialize Vercel Web Analytics
inject();

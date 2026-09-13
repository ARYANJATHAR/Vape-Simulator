import './style.css';
import './mobile.css';
import { Scene } from './scene';
import { initializeSession } from './session';
import { setupInterface } from './interface';
import { THEMES } from './themes';
import { setupMobileLayout } from './mobile';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <canvas id="scene" aria-label="Illustrated vape and camera scene"></canvas>
  <video id="camera" autoplay playsinline muted aria-hidden="true"></video>
  <div class="scene-wash" aria-hidden="true"></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Online Vape home"><img class="brand-mark" src="/logo.svg" width="45" height="45" alt="" /><span>Online Vape<small>Saste Nashe</small></span></a>
    <nav class="creator-links" aria-label="Creator profiles"><span class="creator-name"><small>BUILT BY</small>Aryan Jathar</span><a href="https://github.com/ARYANJATHAR" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://www.linkedin.com/in/aryanjathar07/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></nav>
    <button class="header-help" data-open-dialog="help-dialog" aria-haspopup="dialog" aria-controls="help-dialog" aria-expanded="false">How it works <span aria-hidden="true">?</span></button>
  </header>
  <main>
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="eyebrow"><span>INTERACTIVE CAMERA PLAYGROUND</span><span class="age-badge">18+</span></div>
      <h1 id="welcome-title">A little cloud.<br>A little <em>hand magic.</em></h1>
      <div id="age-screen">
        <h2 class="age-question">Are you 18 or older?</h2>
        <p class="intro-copy">An adults-only camera simulation. No tobacco, nicotine, or real vapor. This is not an invitation to vape.</p>
        <div class="age-actions"><button id="age-yes" class="primary">Yes, I’m 18 or older</button><button id="age-no" class="secondary">No</button></div>
      </div>
      <div id="age-denied" hidden tabindex="-1" role="status"><h2 class="age-question">This experience is for adults.</h2><p class="intro-copy">You can close this page. No camera access has been requested.</p></div>
      <div id="ready-screen" hidden>
        <ol class="instructions"><li><span>01</span>Close your hand around the vape.</li><li><span>02</span>Bring the tip to your mouth. It’s ready instantly.</li><li><span>03</span>Move it away and open your mouth for a cloud.</li></ol>
        <button class="theme-opener" data-open-dialog="theme-dialog" aria-haspopup="dialog" aria-controls="theme-dialog" aria-expanded="false"><span><small>Virtual flavor</small><strong data-current-theme>Mango</strong></span><span aria-hidden="true">↗</span></button>
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
  <section id="demo-controls" class="demo-controls" hidden aria-label="Camera-free controls">
    <p>Pick up the vape, then choose an effect.</p>
    <div class="demo-row"><button id="demo-mouth">To mouth</button><button id="demo-away">Move away</button><button id="demo-drop">Let go</button></div>
    <div class="demo-row effects"><button data-demo-effect="cloud" disabled aria-keyshortcuts="1">Cloud <kbd>1</kbd></button><button data-demo-effect="ring" disabled aria-keyshortcuts="2">Ring <kbd>2</kbd></button><button data-demo-effect="burst" disabled aria-keyshortcuts="3">Burst <kbd>3</kbd></button></div>
  </section>
  <p id="theme-toast" class="toast" role="status" aria-live="polite" hidden></p>
  <footer class="footer">
    <div class="footer-about"><p class="legal">100% virtual. Adults only.<br>No tobacco, nicotine, or real vapor.</p></div>
    <div class="session-controls" hidden>
      <button class="quiet-button theme-small" data-open-dialog="theme-dialog" aria-haspopup="dialog" aria-controls="theme-dialog" aria-expanded="false"><span data-current-theme>Mango</span> <span aria-hidden="true">↗</span></button>
      <label class="toggle" id="guides-control"><input id="show-guides" type="checkbox" checked /><span>Guides</span></label>
      <button id="reset-simulation" class="quiet-button" aria-keyshortcuts="R" title="Reset device and vapor (R)">Reset</button>
      <button id="stop-camera" class="quiet-button">Turn camera off <span aria-hidden="true">×</span></button>
    </div>
    <span class="local-note"><i aria-hidden="true"></i><span id="session-status">Camera is off</span></span>
  </footer>
  <dialog id="theme-dialog" class="studio-dialog" aria-labelledby="theme-title" aria-describedby="theme-description">
    <div class="dialog-top"><span class="eyebrow">EIGHT VIRTUAL FLAVORS.</span><form method="dialog"><button class="close-button" aria-label="Close flavor picker">×</button></form></div>
    <h2 id="theme-title">Choose a <em>flavor.</em></h2>
    <p id="theme-description">Flavor-inspired presets with matching device and vapor colors. This simulation creates no actual taste or scent.</p>
    <div class="theme-grid" role="group" aria-label="Virtual flavors">${THEMES.map(theme => `
      <button class="theme-choice" data-theme="${theme.id}" aria-pressed="false" style="--swatch:${theme.accent};--swatch-paper:${theme.pale}"><span class="theme-swatch" aria-hidden="true"><i></i></span><span class="theme-name">${theme.name}<span class="theme-check" aria-hidden="true">✓</span></span><small>${theme.note}</small></button>`).join('')}
    </div>
    <div class="dialog-bottom"><span>Your virtual flavor is saved on this device.</span><button id="theme-random" class="text-button">Surprise me ↗</button></div>
  </dialog>
  <dialog id="help-dialog" class="studio-dialog help-dialog" aria-labelledby="help-title">
    <div class="dialog-top"><span class="eyebrow">THE CONTROLS</span><form method="dialog"><button class="close-button" aria-label="Close instructions">×</button></form></div>
    <h2 id="help-title">Three moves.<br><em>Start here.</em></h2>
    <ol class="help-steps"><li><strong>Pick it up.</strong> Close your hand around the illustrated vape. Keep your hand and face in good light.</li><li><strong>Bring it close.</strong> Touch the mouthpiece to your mouth. Vapor is ready immediately—there’s no meter to fill.</li><li><strong>Let it drift.</strong> Move the device away, then open your mouth for a cloud. Round your lips for rings; open wider for a burst. Relax your lips to stop.</li></ol>
    <div class="help-notes"><p><strong>No camera?</strong> Choose “Try without a camera.” Drag the device or use To mouth and Move away. First pick up the vape by dragging it or choosing To mouth. Then click Cloud, Ring, or Burst for an instant effect.</p><p><strong>Start over.</strong> Open your hand to let go. Press <kbd>R</kbd> to reset. In the demo, <kbd>1</kbd>, <kbd>2</kbd>, and <kbd>3</kbd> create the three effects.</p><p><strong>Your camera stays local.</strong> There is no recording, microphone, or frame upload. Camera access starts only when you choose it, and ends when you turn it off or leave. Motion follows your device’s reduced-motion setting.</p></div>
  </dialog>
`;

const scene = new Scene(document.querySelector<HTMLCanvasElement>('#scene')!, document.querySelector<HTMLVideoElement>('#camera')!);
setupInterface(scene);
setupMobileLayout();
initializeSession(scene, false);
scene.start();
document.querySelector<HTMLButtonElement>('#start-camera')!.addEventListener('click', () => initializeSession(scene));




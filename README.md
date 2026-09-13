# Online Vape — Saste Nashe

A camera-based simulator built with TypeScript, Vite, Canvas 2D and on-device hand/face tracking. The current source includes hand-controlled device movement, instant vapor gestures, six cosmetic themes, and a camera-free demo.

## Run locally

Requires Node.js 22.12 or newer. From this folder:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Confirm you are an adult, then choose **Turn on my camera** or **Try without a camera**. Model/WASM assets are bundled in `public`; `npm run prepare:vision` restores those assets if they are missing.

## Camera interaction

Close your hand around the illustrated device. Bring the tip to your mouth: vapor becomes ready immediately. Move the device away, then open your mouth for a cloud, round your lips for rings, or open wider for a burst. Relax your lips to stop. There is no charge meter, fill duration, refill requirement, or artificial release delay. Breathing is not measured. The first camera session still needs to load its tracking models before gestures can be recognized.

Open your hand to release the device. **Reset** or **R** clears readiness and particles and returns the device to its stand. **Turn camera off** stops the stream and releases tracking resources. Leaving the page stops the camera; hiding the page, camera interruptions, and resizing reset interaction state.

## Camera-free demo and themes

Drag the illustrated device with a mouse or touch, or use **To mouth**, **Move away**, and **Let go**. **Cloud**, **Ring**, and **Burst** release an effect immediately; keyboard shortcuts are **1**, **2**, and **3**. **R** resets. The demo does not start the camera or load tracking models.

Choose Slate, Glacier, Rose, Amber, Meadow, or Violet from the theme dialog, or select **Surprise me**. Themes change the device, vapor color, and particle movement; the interface retains its charcoal and orange identity. Existing particles keep their original theme until they fade. The selection is saved locally when browser storage is available. Native dialogs support Escape, focus containment, and focus return; simulation input pauses while a dialog is open.

## Modules

- `src/scene.ts`: mirrored camera, procedural device, demo mouth marker and render loop.
- `src/device.ts`: cached device artwork with brushed metal, tinted cartridge internals, molded mouthpiece, casing details and rotation-sensitive reflections.
- `src/camera.ts`, `src/tracking.ts`: camera lifecycle, model loading, fallback and tracking.
- `src/geometry.ts`, `src/guides.ts`, `src/gestures.ts`: coordinate mapping and fresh gesture inputs.
- `src/simulation.ts`: pickup, smoothing, mouth proximity, immediate readiness and gesture emission.
- `src/vapor.ts`: cached sprites, immediate first particles, themed motion and adaptive budgets.
- `src/themes.ts`: six theme definitions and resilient preference storage.
- `src/demo.ts`: mouse, touch, button and keyboard input without a camera.
- `src/interface.ts`: adult onboarding, help, theme selection and modal lifecycle.
- `src/session.ts`: camera/demo lifecycle, recovery messages, coaching and reset.
- `src/webmcp.ts`: optional local status, stop, reset and guide controls.

## Privacy

No microphone, recording, frame uploads or analytics are implemented. Camera frames and landmarks stay in browser memory. Theme preference uses localStorage; adult confirmation uses sessionStorage. Model/WASM assets are served from the app. Google Fonts and the host receive ordinary resource requests. See `THIRD-PARTY-NOTICES.txt` for model and runtime attribution.

## Validation status

Mobile refinements reserve measured space for controls, adapt the demo canvas to portrait/landscape, handle safe areas, and use pointer capture for touch dragging. Theme/help dialogs remain scrollable. The camera constraint fallback retains a preference for the front camera. These are source changes, not a claim of verified phone compatibility.

Before release, check the camera and demo on actual iPhone/Android devices in both orientations, then make a production build and deploy over HTTPS. A phone accessing a computer's plain HTTP LAN address does not get the localhost secure-context exception. No mobile checks or deployment were performed by the assistant.

Creator links: [GitHub](https://github.com/ARYANJATHAR) and [LinkedIn](https://www.linkedin.com/in/aryanjathar07/), supplied by the user and displayed in the persistent header.

This update was written and reviewed as source only. No tests, compilation, production build, browser checks, camera activation or deployment were performed, as requested. Phase 6 verification/delivery checks remain for the user; code completion does not establish runtime correctness. Earlier phase 1–2 test results do not validate this version. Previously built or published output remains unchanged until rebuilt and deployed.



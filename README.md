# Vape Studio — phases 1 and 2

A camera-based vape simulator prototype, inspired by the reference's visual direction and implemented independently. Phase 1 provides the responsive illustrated scene. Phase 2 adds local camera, hand and face tracking. Device pickup, draw gestures, vapor and themes belong to later phases and are intentionally not active.

## Run

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run prepare:vision
npm run dev
```

Open the local URL and select **Turn on my camera**. Use good lighting and keep your face and an open hand visible. Guides mark hand joints and the mouth position. **Turn camera off** releases the stream and tracking resources. The camera also stops when leaving the page. Cancelled and superseded requests release late-arriving streams.

```sh
npm test
npm run build
npm run preview
```

## Modules

- `src/scene.ts`: responsive Canvas 2D scene, mirrored camera, procedural device.
- `src/camera.ts`: cancellable camera lifecycle and recovery messages.
- `src/tracking.ts`: MediaPipe model loading, GPU/CPU fallback, throttled detection and landmark smoothing.
- `src/geometry.ts`: shared camera-cover and mirrored-landmark transformations.
- `src/guides.ts`: hand, face and mouth guides.
- `src/session.ts`: loading, cancellation, disconnection and UI state.
- `src/webmcp.ts`: optional status, camera-off and guide controls for supporting browsers.

## Privacy and assets

No microphone, recording, frame uploads, analytics or persistence are implemented. Model and WASM assets are served from this app. Fonts currently load from Google Fonts; hosting infrastructure may receive ordinary page requests. Camera frames and landmark data remain in browser memory.

MediaPipe Tasks Vision is pinned to 0.10.21. `prepare:vision` copies its runtime and downloads the official version-1 float16 hand and face models from Google. The checked-in assets allow the deployed app to load them from its own origin. See `THIRD-PARTY-NOTICES.md`.

## Validation scope

Automated tests cover portrait/landscape crop alignment, mirroring, landmark freshness, smoothing and camera cancellation/cleanup with mock streams. They do not establish actual tracking accuracy or mobile performance. A live camera check remains necessary on target desktop and mobile devices; camera activation requires the user's browser permission.

Manual acceptance: start/stop twice; deny permission and retry; cancel during startup; test an unplugged/busy camera; show either/both hands; hide and restore the face; rotate the phone; hide the tab and return; switch guides off/on. Confirm the camera indicator switches off after stopping.

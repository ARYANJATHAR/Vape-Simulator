import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraController, CancelledSession, cameraErrorMessage } from '../src/camera';
function fixture() {
    let stops = 0;
    const stream = { getTracks: () => [{ stop: () => stops++ }] } as unknown as MediaStream;
    const video = { srcObject: null, play: async () => { }, pause: () => { } } as unknown as HTMLVideoElement;
    return { stream, video, stops: () => stops };
}
test('camera requests video only and releases all tracks on stop', async () => {
    const f = fixture();
    let constraints: MediaStreamConstraints | undefined;
    const c = new CameraController(f.video, async (input) => { constraints = input; return f.stream; });
    await c.start();
    assert.equal(constraints?.audio, false);
    assert.equal(f.video.srcObject, f.stream);
    c.stop();
    assert.equal(f.stops(), 1);
    assert.equal(f.video.srcObject, null);
});
test('cancelling permission startup stops a stream that resolves late', async () => {
    const f = fixture();
    let resolve!: (s: MediaStream) => void;
    const c = new CameraController(f.video, () => new Promise(r => { resolve = r; }));
    const pending = c.start();
    c.stop();
    resolve(f.stream);
    await assert.rejects(pending, CancelledSession);
    assert.equal(f.stops(), 1);
    assert.equal(f.video.srcObject, null);
});
test('a superseded camera request cannot overwrite a newer stream', async () => {
    const a = fixture(), b = fixture();
    let first!: (s: MediaStream) => void, calls = 0;
    const c = new CameraController(a.video, () => ++calls === 1 ? new Promise(r => { first = r; }) : Promise.resolve(b.stream));
    const old = c.start();
    await c.start();
    first(a.stream);
    await assert.rejects(old, CancelledSession);
    assert.equal(a.video.srcObject, b.stream);
    assert.equal(a.stops(), 1);
    c.stop();
});
test('unsupported preferred constraints fall back to a basic video request', async () => {
    const f = fixture();
    let calls = 0;
    const c = new CameraController(f.video, async (constraints) => { if (++calls === 1)
        throw new DOMException('Unsupported', 'OverconstrainedError'); assert.equal(constraints.video, true); assert.equal(constraints.audio, false); return f.stream; });
    await c.start();
    assert.equal(calls, 2);
    c.stop();
});
test('permission denial does not request the camera again', async () => {
    const f = fixture();
    let calls = 0;
    const c = new CameraController(f.video, async () => { calls++; throw new DOMException('Denied', 'NotAllowedError'); });
    await assert.rejects(c.start());
    assert.equal(calls, 1);
    assert.equal(f.video.srcObject, null);
});
test('playback failure cleans up the camera', async () => {
    const f = fixture();
    f.video.play = async () => { throw new Error('Playback failed'); };
    const c = new CameraController(f.video, async () => f.stream);
    await assert.rejects(c.start());
    assert.equal(f.stops(), 1);
    assert.equal(f.video.srcObject, null);
});
test('camera errors provide distinct recovery instructions', () => {
    assert.match(cameraErrorMessage(new DOMException('', 'NotAllowedError')).message, /site settings/);
    assert.match(cameraErrorMessage(new DOMException('', 'NotReadableError')).message, /other app/);
    assert.match(cameraErrorMessage(new DOMException('', 'NotFoundError')).title, /No camera/);
});

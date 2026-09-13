import test from 'node:test';
import assert from 'node:assert/strict';
import { coverTransform, mirrorPoint, smoothPoints, isFresh } from '../src/geometry';
test('mirrored 16:9 camera keeps the center and reverses left/right', () => {
    const t = coverTransform(1280, 720, 1280, 720);
    assert.deepEqual(mirrorPoint({ x: .5, y: .5 }, t), { x: 640, y: 360 });
    assert.deepEqual(mirrorPoint({ x: 0, y: 0 }, t), { x: 1280, y: 0 });
});
test('portrait cover crop uses the same scale for camera and landmarks', () => {
    const t = coverTransform(390, 844, 1280, 720);
    assert.equal(t.height, 844);
    assert.ok(t.offsetX < 0);
    assert.deepEqual(mirrorPoint({ x: .5, y: .5 }, t), { x: 195, y: 422 });
    assert.equal(t.width + 2 * t.offsetX, 390);
});
test('ultrawide viewport crops the top and bottom', () => {
    const t = coverTransform(1800, 600, 1280, 720);
    assert.equal(t.width, 1800);
    assert.ok(t.offsetY < 0);
    assert.deepEqual(mirrorPoint({ x: .5, y: .5 }, t), { x: 900, y: 300 });
});
test('unavailable video sizes fail instead of producing invalid coordinates', () => {
    assert.throws(() => coverTransform(390, 844, 0, 0));
    assert.throws(() => coverTransform(NaN, 720, 1280, 720));
});
test('smoothing does not mutate original samples and resets after sample loss', () => {
    const previous = [{ x: 0, y: 0 }], next = [{ x: 1, y: 1 }];
    assert.deepEqual(smoothPoints(previous, next, .5).map(({ x, y }) => ({ x, y })), [{ x: .5, y: .5 }]);
    assert.deepEqual(previous, [{ x: 0, y: 0 }]);
    assert.deepEqual(smoothPoints(undefined, next), next);
    assert.notEqual(smoothPoints(undefined, next)[0], next[0]);
});
test('tracking samples disappear when frames stop arriving', () => {
    assert.equal(isFresh(1000, 1300), true);
    assert.equal(isFresh(1000, 1800), false);
    assert.equal(isFresh(0, 100), false);
    assert.equal(isFresh(2000, 1000), false);
});

import { FaceLandmarker, FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { Point } from './geometry';
import { isFresh, smoothPoints } from './geometry';
export interface TrackedHand {
    points: Point[];
    side: string;
}
export interface TrackingSnapshot {
    hands: TrackedHand[];
    face: Point[] | null;
    expressions: Record<string, number>;
    handTime: number;
    faceTime: number;
}
export const emptySnapshot = (): TrackingSnapshot => ({ hands: [], face: null, expressions: {}, handTime: 0, faceTime: 0 });
async function readModel(url: string, signal: AbortSignal, report: (percent: number) => void) {
    const response = await fetch(url, { signal });
    if (!response.ok || response.headers.get('content-type')?.includes('text/html'))
        throw new Error('Tracking model could not be downloaded.');
    const total = Number(response.headers.get('content-length'));
    if (!response.body)
        return new Uint8Array(await response.arrayBuffer());
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        chunks.push(value);
        size += value.length;
        if (total > 0)
            report(Math.min(95, size / total * 95));
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}
export class Tracker {
    private hands: HandLandmarker | null = null;
    private face: FaceLandmarker | null = null;
    private abort = new AbortController();
    private disposed = false;
    private lastFrame = -1;
    private lastDetection = 0;
    private turn = 0;
    private failures = { hands: 0, face: 0 };
    public snapshot = emptySnapshot();
    public ready = false;
    async load(report: (label: string, percent: number) => void) {
        report('Preparing on-device tracking', 0);
        const files = await FilesetResolver.forVisionTasks('/vision');
        this.ensureActive();
        const handBuffer = await readModel('/models/hand_landmarker.task', this.abort.signal, n => report('Loading hand tracking', n * .45));
        this.ensureActive();
        report('Starting hand tracking', 44);
        for (const delegate of ['GPU', 'CPU'] as const) {
            try {
                this.hands = await HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetBuffer: handBuffer, delegate }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
                this.ensureActive();
                break;
            }
            catch (error) {
                if (this.disposed || delegate === 'CPU')
                    throw error;
            }
        }
        const faceBuffer = await readModel('/models/face_landmarker.task', this.abort.signal, n => report('Loading face tracking', 45 + n * .5));
        this.ensureActive();
        report('Starting face tracking', 96);
        for (const delegate of ['GPU', 'CPU'] as const) {
            try {
                this.face = await FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetBuffer: faceBuffer, delegate }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5, minTrackingConfidence: .5 });
                this.ensureActive();
                break;
            }
            catch (error) {
                if (this.disposed || delegate === 'CPU')
                    throw error;
            }
        }
        this.ready = true;
        report('Tracking is ready', 100);
    }
    private ensureActive() { if (this.disposed) {
        this.hands?.close();
        this.face?.close();
        this.hands = null;
        this.face = null;
        throw new DOMException('Tracking cancelled.', 'AbortError');
    } }
    detect(video: HTMLVideoElement, time: number) {
        if (this.disposed || video.readyState < 2 || !video.videoWidth || time - this.lastDetection < 45 || video.currentTime === this.lastFrame)
            return;
        this.lastFrame = video.currentTime;
        this.lastDetection = time;
        const model = this.hands && (!this.face || this.turn++ % 2 === 0) ? 'hands' : 'face';
        try {
            // Alternate models, leaving time for rendering and camera controls between detections.
            if (model === 'hands' && this.hands) {
                const result = this.hands.detectForVideo(video, time);
                this.snapshot.hands = result.landmarks.map((points, index) => {
                    const side = result.handedness[index]?.[0]?.categoryName || String(index);
                    const last = isFresh(this.snapshot.handTime, time) ? this.snapshot.hands.find(h => h.side === side)?.points : undefined;
                    const previous = last && Math.hypot(last[0].x - points[0].x, last[0].y - points[0].y) < .18 ? last : undefined;
                    return { points: smoothPoints(previous, points), side };
                });
                this.snapshot.handTime = time;
            }
            else if (this.face) {
                const result = this.face.detectForVideo(video, time);
                this.snapshot.face = result.faceLandmarks[0] ? smoothPoints(isFresh(this.snapshot.faceTime, time) ? this.snapshot.face ?? undefined : undefined, result.faceLandmarks[0], .7) : null;
                this.snapshot.expressions = Object.fromEntries((result.faceBlendshapes[0]?.categories ?? []).map(c => [c.categoryName, c.score]));
                this.snapshot.faceTime = time;
            }
            this.failures[model] = 0;
        }
        catch (error) {
            if (model === 'hands') {
                this.snapshot.hands = [];
                this.snapshot.handTime = 0;
            } else {
                this.snapshot.face = null;
                this.snapshot.faceTime = 0;
                this.snapshot.expressions = {};
            }
            if (++this.failures[model] >= 5)
                throw error;
        }
    }
    resetSamples() { this.snapshot = emptySnapshot(); this.lastFrame = -1; this.lastDetection = 0; this.failures = { hands: 0, face: 0 }; }
    close() { this.disposed = true; this.abort.abort(); this.ready = false; this.hands?.close(); this.face?.close(); this.hands = null; this.face = null; this.resetSamples(); }
}

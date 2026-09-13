export class CancelledSession extends Error {
    constructor() { super('Camera session was cancelled.'); this.name = 'CancelledSession'; }
}
export class CameraController {
    private stream: MediaStream | null = null;
    private generation = 0;
    constructor(private video: HTMLVideoElement, private request: (constraints: MediaStreamConstraints) => Promise<MediaStream>) { }
    async start() {
        this.stop();
        const ticket = this.generation;
        let stream: MediaStream;
        try {
            stream = await this.request({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user', frameRate: { ideal: 30, max: 30 } }, audio: false });
        }
        catch (error) {
            if (ticket !== this.generation)
                throw new CancelledSession();
            if (error instanceof Error && error.name === 'OverconstrainedError')
                stream = await this.request({ video: true, audio: false });
            else
                throw error;
        }
        if (ticket !== this.generation) {
            stream.getTracks().forEach(t => t.stop());
            throw new CancelledSession();
        }
        this.stream = stream;
        this.video.srcObject = stream;
        try {
            await this.video.play();
        }
        catch (error) {
            if (ticket !== this.generation)
                throw new CancelledSession();
            this.stop();
            throw error;
        }
        if (ticket !== this.generation)
            throw new CancelledSession();
        return stream;
    }
    stop() { this.generation++; this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; this.video.pause(); this.video.srcObject = null; }
}
export function cameraErrorMessage(error: unknown) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError')
        return { title: 'Camera access is blocked', message: 'Allow camera access in your browser’s site settings, then try again. You can also open this page directly in your browser.' };
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
        return { title: 'No camera found', message: 'Connect a camera, or open this page on a device with a front camera, then try again.' };
    if (['NotReadableError', 'TrackStartError', 'AbortError'].includes(name))
        return { title: 'Your camera could not start', message: 'Close any other app using your camera and try again. Check your device’s camera permissions too.' };
    return { title: 'Something interrupted the camera', message: 'Try again, or open this page in another browser.' };
}

export interface Point {
    x: number;
    y: number;
    z?: number;
}
export interface CoverTransform {
    scale: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
}
export function coverTransform(viewWidth: number, viewHeight: number, videoWidth: number, videoHeight: number): CoverTransform {
    if ([viewWidth, viewHeight, videoWidth, videoHeight].some(n => !Number.isFinite(n) || n <= 0))
        throw new Error('Dimensions must be positive.');
    const scale = Math.max(viewWidth / videoWidth, viewHeight / videoHeight);
    const width = videoWidth * scale, height = videoHeight * scale;
    return { scale, offsetX: (viewWidth - width) / 2, offsetY: (viewHeight - height) / 2, width, height };
}
export function mirrorPoint(p: Point, t: CoverTransform): Point { return { x: t.offsetX + (1 - p.x) * t.width, y: t.offsetY + p.y * t.height }; }
export function smoothPoints(previous: Point[] | undefined, next: Point[], amount = .65): Point[] {
    if (!previous || previous.length !== next.length)
        return next.map(p => ({ ...p }));
    return next.map((p, i) => ({ x: previous[i].x + (p.x - previous[i].x) * amount, y: previous[i].y + (p.y - previous[i].y) * amount, z: p.z }));
}
export function isFresh(sampleTime: number, now: number, maxAge = 650) { return sampleTime > 0 && now >= sampleTime && now - sampleTime <= maxAge; }

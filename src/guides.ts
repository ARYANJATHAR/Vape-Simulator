import { coverTransform, isFresh, mirrorPoint } from './geometry';
import type { Point } from './geometry';
import type { TrackingSnapshot } from './tracking';
const HAND_CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
export function renderGuides(ctx: CanvasRenderingContext2D, width: number, height: number, video: HTMLVideoElement, snapshot: TrackingSnapshot, now: number) {
    if (!video.videoWidth || !video.videoHeight)
        return;
    const transform = coverTransform(width, height, video.videoWidth, video.videoHeight);
    const map = (p: Point) => mirrorPoint(p, transform);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(20,32,48,.6)';
    ctx.shadowBlur = 5;
    if (isFresh(snapshot.handTime, now))
        for (const hand of snapshot.hands) {
            const points = hand.points.map(map);
            ctx.strokeStyle = 'rgba(255,255,234,.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (const [a, b] of HAND_CONNECTIONS) {
                ctx.moveTo(points[a].x, points[a].y);
                ctx.lineTo(points[b].x, points[b].y);
            }
            ctx.stroke();
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                ctx.fillStyle = i % 4 === 0 ? '#ffffe9' : '#c6dbe4';
                ctx.beginPath();
                ctx.arc(p.x, p.y, i % 4 === 0 ? 4 : 2.6, 0, Math.PI * 2);
                ctx.fill();
            }
            const palm = map(hand.points[9]);
            ctx.strokeStyle = '#e5f1eb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(palm.x, palm.y, 12, 0, Math.PI * 2);
            ctx.stroke();
        }
    if (snapshot.face && isFresh(snapshot.faceTime, now)) {
        const face = snapshot.face, left = map(face[234]), right = map(face[454]), top = map(face[10]), bottom = map(face[152]);
        const x = Math.min(left.x, right.x) - 14, y = top.y - 14, w = Math.abs(right.x - left.x) + 28, h = bottom.y - top.y + 28, l = Math.min(23, w * .18);
        ctx.strokeStyle = 'rgba(255,255,234,.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
            ctx.moveTo(cx, cy + dy * l);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx + dx * l, cy);
        }
        ctx.stroke();
        const a = map(face[13]), b = map(face[14]), c = map(face[61]), d = map(face[291]);
        ctx.strokeStyle = '#ffffe9';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(10, Math.hypot(c.x - d.x, c.y - d.y) / 2 + 5), Math.max(6, Math.hypot(a.x - b.x, a.y - b.y) / 2 + 5), Math.atan2(d.y - c.y, d.x - c.x), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

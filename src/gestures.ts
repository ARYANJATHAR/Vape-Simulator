import { coverTransform, isFresh, mirrorPoint } from './geometry';
import type { Point } from './geometry';
import type { TrackingSnapshot } from './tracking';

export interface HandPose {
  center: Point;
  axis: Point;
  width: number;
  grip: number;
  side: string;
}

export interface FacePose {
  mouth: Point;
  width: number;
  mouthWidth: number;
  yaw: number;
  pucker: number;
  funnel: number;
  jaw: number;
  cheeks: number;
}

export interface InteractionInput {
  hands: HandPose[];
  face: FacePose | null;
  pointerControl?: boolean;
}

export const emptyInteraction = (): InteractionInput => ({ hands: [], face: null });
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function mean(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function handGrip(points: Point[]) {
  // Distances are in screen pixels, not raw normalized coordinates, so portrait
  // cropping cannot distort the relationship between palm and finger lengths.
  let total = 0;
  for (const [base, tip] of [[5, 8], [9, 12], [13, 16], [17, 20]]) {
    const palmLength = Math.max(1, distance(points[base], points[0]));
    const wristRatio = distance(points[tip], points[0]) / palmLength;
    const foldRatio = distance(points[tip], points[base]) / palmLength;
    total += clamp((1.8 - wristRatio) / .8) * .55 + clamp((1.05 - foldRatio) / .65) * .45;
  }
  return total / 4;
}

export function interpretTracking(
  snapshot: TrackingSnapshot | undefined,
  viewWidth: number,
  viewHeight: number,
  videoWidth: number,
  videoHeight: number,
  now: number,
): InteractionInput {
  if (!snapshot || [viewWidth, viewHeight, videoWidth, videoHeight].some(value => !Number.isFinite(value) || value <= 0)) return emptyInteraction();
  const transform = coverTransform(viewWidth, viewHeight, videoWidth, videoHeight);
  const map = (point: Point) => mirrorPoint(point, transform);
  const input = emptyInteraction();

  // Guides can fade for longer, but interaction never consumes old poses.
  if (isFresh(snapshot.handTime, now, 250)) {
    for (const hand of snapshot.hands) {
      if (hand.points.length < 21 || hand.points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;
      const points = hand.points.map(map);
      const width = distance(points[5], points[17]);
      if (width < 12) continue;
      const axisLength = Math.max(1, distance(points[0], points[9]));
      input.hands.push({
        center: mean([points[0], points[5], points[9], points[13], points[17]]),
        axis: { x: (points[9].x - points[0].x) / axisLength, y: (points[9].y - points[0].y) / axisLength },
        width,
        grip: handGrip(points),
        side: hand.side,
      });
    }
  }

  if (snapshot.face && snapshot.face.length >= 468 && isFresh(snapshot.faceTime, now, 250)) {
    const points = snapshot.face;
    if ([1, 13, 14, 33, 61, 234, 263, 291, 454].some(i => !Number.isFinite(points[i].x) || !Number.isFinite(points[i].y))) return input;
    const left = map(points[234]), right = map(points[454]), nose = map(points[1]);
    const width = Math.max(distance(left, right), distance(map(points[33]), map(points[263])) * 1.6);
    if (width < 35) return input;
    const shape = (name: string) => clamp(snapshot.expressions[name] || 0);
    input.face = {
      mouth: mean([map(points[13]), map(points[14])]),
      mouthWidth: distance(map(points[61]), map(points[291])),
      width,
      yaw: clamp((nose.x - (left.x + right.x) / 2) / Math.max(1, Math.abs(left.x - right.x) / 2), -1, 1),
      pucker: shape('mouthPucker'),
      funnel: shape('mouthFunnel'),
      jaw: shape('jawOpen'),
      cheeks: shape('cheekPuff'),
    };
  }
  return input;
}

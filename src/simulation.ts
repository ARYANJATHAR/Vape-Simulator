import type { Point } from './geometry';
import { clamp, distance } from './gestures';
import type { FacePose, HandPose, InteractionInput } from './gestures';

export type SimulationState = 'idle' | 'holding' | 'at-mouth' | 'drawing' | 'exhaling';
export type VaporKind = 'cloud' | 'ring' | 'burst';
export interface DevicePose extends Point { angle: number; scale: number }
export interface VaporEmission { kind: VaporKind; origin: Point; mouthWidth: number; yaw: number; strength: number }
export interface SimulationFrame {
  state: SimulationState;
  pose: DevicePose;
  tip: Point;
  held: boolean;
  trackingLost: boolean;
  atMouth: boolean;
  ready: boolean;
  // Current vapor strength, not a reservoir or loading progress.
  charge: number;
  drawIntensity: number;
  pickupProgress: number;
  emission: VaporEmission | null;
}

export const DEVICE_TIP_Y = -190;
const GRIP_ON = .58;
const RELEASE_DELAY = .45;
const LOST_HAND_DELAY = 1.2;

function openHand(hand: HandPose) {
  return hand.open ?? hand.grip < .16;
}

export function restingDevice(width: number, height: number): DevicePose {
  const mobile = width < 760;
  return {
    x: width * (mobile ? .19 : .235),
    y: height * (mobile ? height < 500 ? .62 : .78 : .64),
    angle: -.12,
    scale: mobile ? Math.min(.66, width / 650, height / (height < 500 ? 700 : 1150)) : Math.min(1.12, height / 780, width / 1300),
  };
}

export function devicePoint(pose: DevicePose, localX: number, localY: number): Point {
  const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle);
  return { x: pose.x + (localX * cos - localY * sin) * pose.scale, y: pose.y + (localX * sin + localY * cos) * pose.scale };
}

function approach(from: number, to: number, rate: number, dt: number) {
  return from + (to - from) * (1 - Math.exp(-rate * dt));
}

function approachAngle(from: number, to: number, dt: number) {
  const shortest = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + shortest * (1 - Math.exp(-12 * dt));
}

function distanceToDevice(point: Point, pose: DevicePose) {
  const a = devicePoint(pose, 0, -125), b = devicePoint(pose, 0, 125);
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / Math.max(1, dx * dx + dy * dy));
  return distance(point, { x: a.x + t * dx, y: a.y + t * dy });
}

function exhaleSignal(face: FacePose): { kind: VaporKind; strength: number } | null {
  if (face.cheeks > .32 || face.jaw > .68) return { kind: 'burst', strength: 1 };
  if (face.funnel > .42 && face.jaw > .055 && face.jaw < .42) return { kind: 'ring', strength: clamp(face.funnel, .45, 1) };
  const signal = Math.max((face.funnel - .22) / .78, (face.pucker - .34) / .66, (face.jaw - .16) / .5);
  return signal > 0 ? { kind: 'cloud', strength: clamp(.25 + signal, 0, 1) } : null;
}

export class VapeSimulation {
  private owner: { center: Point; width: number; side: string } | null = null;
  private lostFor = 0;
  private openFor = 0;
  private grabFor = 0;
  private candidate: Point | null = null;
  private cooldown = 0;
  private previousWidth = 0;
  private previousHeight = 0;
  public frame: SimulationFrame = this.empty(restingDevice(1, 1));

  private empty(pose: DevicePose): SimulationFrame {
    return { state: 'idle', pose, tip: devicePoint(pose, 0, DEVICE_TIP_Y), held: false, trackingLost: false, atMouth: false, ready: false, charge: 0, drawIntensity: 0, pickupProgress: 0, emission: null };
  }

  reset(width = this.previousWidth, height = this.previousHeight) {
    this.previousWidth = Math.max(1, width); this.previousHeight = Math.max(1, height);
    this.owner = null; this.lostFor = 0; this.openFor = 0; this.grabFor = 0;
    this.candidate = null; this.cooldown = .2;
    this.frame = this.empty(restingDevice(this.previousWidth, this.previousHeight));
  }

  private release() {
    this.owner = null; this.lostFor = 0; this.openFor = 0;
    this.cooldown = .45; this.frame.atMouth = false;
    this.frame.held = false;
    this.frame.charge = 0; this.frame.ready = false;
    this.frame.emission = null; this.frame.drawIntensity = 0;
  }

  pickUp(hand: HandPose) {
    this.owner = { center: { ...hand.center }, width: hand.width, side: hand.side };
    this.lostFor = 0; this.openFor = 0; this.grabFor = 0;
    this.frame.held = true;
  }

  letGo() { this.release(); this.frame.held = false; }
  readyVapor() { if (this.owner) this.frame.ready = true; }

  private findHand(hands: HandPose[], dt: number, pointerControl = false): HandPose | null {
    if (this.owner) {
      // Position continuity takes precedence over handedness, which can flip when
      // a fist turns. A remote second hand must not steal the device.
      const owner = this.owner;
      const candidates = hands
        .filter(hand => (pointerControl && hand.side === 'pointer') || distance(hand.center, owner.center) < Math.max(100, Math.max(owner.width, hand.width) * 2.8) * (1 + Math.min(this.lostFor, .4)))
        .sort((a, b) => (distance(a.center, owner.center) + (a.side === owner.side ? 0 : 12)) - (distance(b.center, owner.center) + (b.side === owner.side ? 0 : 12)));
      const hand = candidates[0];
      if (!hand) {
        this.lostFor += dt;
        if (this.lostFor > LOST_HAND_DELAY) this.release();
        return null;
      }
      this.lostFor = 0;
      this.openFor = openHand(hand) ? this.openFor + dt : 0;
      if (this.openFor > RELEASE_DELAY) { this.release(); return null; }
      this.owner = { center: { ...hand.center }, width: hand.width, side: hand.side };
      return hand;
    }
    const hand = this.cooldown <= 0 ? hands
      .filter(candidate => candidate.grip >= GRIP_ON && distanceToDevice(candidate.center, this.frame.pose) < Math.max(38, this.frame.pose.scale * 75, candidate.width * .7))
      .sort((a, b) => distanceToDevice(a.center, this.frame.pose) - distanceToDevice(b.center, this.frame.pose))[0] : undefined;
    if (!hand) { this.grabFor = 0; this.candidate = null; return null; }
    if (this.candidate && distance(this.candidate, hand.center) > hand.width) this.grabFor = 0;
    this.candidate = { ...hand.center }; this.grabFor += dt;
    if (this.grabFor < .12) return null;
    this.owner = { center: { ...hand.center }, width: hand.width, side: hand.side };
    this.grabFor = 0; this.candidate = null;
    return hand;
  }

  update(input: InteractionInput, elapsed: number, width: number, height: number): SimulationFrame {
    if (width !== this.previousWidth || height !== this.previousHeight) this.reset(width, height);
    const dt = clamp(elapsed, 0, .05);
    const f = this.frame;
    const wasDrawing = f.state === 'drawing';
    const wasAtMouth = f.atMouth;
    this.cooldown = Math.max(0, this.cooldown - dt);
    f.emission = null; f.drawIntensity = 0; f.charge = 0;
    const hand = this.findHand(input.hands, dt, input.pointerControl);
    f.held = this.owner !== null;
    f.trackingLost = f.held && !hand;
    // Hold the last pose through brief occlusion. No hand means no emission,
    // but readiness survives recovery of the same held device. Release clears it.
    if (hand && openHand(hand)) f.ready = false;

    const target = hand ? {
      ...hand.center,
      scale: clamp(hand.width * .95 / 128, .2, .66),
      angle: Math.atan2(hand.axis.y, hand.axis.x) + Math.PI / 2,
    } : f.held ? { ...f.pose } : restingDevice(width, height);
    // A modest snap assists alignment only when the actual tip is already close.
    if (hand && input.face) {
      const rawTip = devicePoint(target, 0, DEVICE_TIP_Y);
      if (distance(rawTip, input.face.mouth) < input.face.width * .3) {
        target.x += (input.face.mouth.x - rawTip.x) * .55;
        target.y += (input.face.mouth.y - rawTip.y) * .55;
      }
    }
    const rate = hand ? 18 : 6;
    f.pose.x = approach(f.pose.x, target.x, rate, dt);
    f.pose.y = approach(f.pose.y, target.y, rate, dt);
    f.pose.scale = approach(f.pose.scale, target.scale, 9, dt);
    f.pose.angle = approachAngle(f.pose.angle, target.angle, dt);
    f.tip = devicePoint(f.pose, 0, DEVICE_TIP_Y);
    f.pickupProgress = clamp(this.grabFor / .12);

    const face = input.face;
    const mouthRadius = face ? Math.max(17, face.width * (wasAtMouth ? .29 : .21)) : 0;
    const controlTip = hand ? devicePoint(target, 0, DEVICE_TIP_Y) : f.tip;
    // Mouth contact makes vapor ready immediately; there is no fill timer.
    f.atMouth = !!hand && !openHand(hand) && !!face && distance(controlTip, face.mouth) < mouthRadius;
    f.state = f.atMouth ? 'at-mouth' : f.held ? 'holding' : 'idle';
    if (f.atMouth && face) {
      f.ready = true;
      const pursed = face.pucker >= (wasDrawing ? .25 : .4) && face.jaw < .42;
      if (pursed) {
        f.state = 'drawing';
        f.drawIntensity = clamp(.35 + face.pucker * .8);
      }
    } else {
      // Missing tracking pauses the draw/exhale loop; it is not an exhale gesture.
      // Use the fresh hand target as well as the smoothed drawing position so
      // render interpolation does not introduce an extra release delay.
      const deviceAway = !!face && distance(controlTip, face.mouth) > mouthRadius;
      if (face && hand && !openHand(hand) && f.held && deviceAway && !f.trackingLost && f.ready) {
        const signal = exhaleSignal(face);
        if (signal) {
          f.charge = signal.strength;
          f.state = 'exhaling';
          f.emission = { ...signal, origin: { ...face.mouth }, mouthWidth: Math.max(12, face.mouthWidth), yaw: face.yaw };
        }
      }
    }
    return f;
  }
}

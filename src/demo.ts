import type { Scene } from './scene';
import type { InteractionInput, HandPose } from './gestures';
import { clamp, distance } from './gestures';
import type { VaporKind } from './simulation';
import type { Point } from './geometry';

export class DemoController {
  private held = false;
  private pointer: Point = { x: 0, y: 0 };
  private angle = 0;
  private scale = .45;
  private drag: number | null = null;
  private offset: Point = { x: 0, y: 0 };
  private effect: VaporKind = 'cloud';
  private effectUntil = 0;
  private size = '';
  private capture: Element | null = null;

  constructor(private scene: Scene) {
    window.addEventListener('pointerdown', event => {
      if (!scene.demoActive || scene.paused || event.button !== 0 || this.drag !== null) return;
      if ((event.target as HTMLElement).closest('button, input, a, label, dialog, select')) return;
      const pose = scene.simulation.frame.pose;
      const bounds = scene.canvasBounds;
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      const dx = x - pose.x, dy = y - pose.y;
      const localX = (dx * Math.cos(pose.angle) + dy * Math.sin(pose.angle)) / pose.scale;
      const localY = (-dx * Math.sin(pose.angle) + dy * Math.cos(pose.angle)) / pose.scale;
      if (Math.abs(localX) > 90 || localY < -220 || localY > 195) return;
      event.preventDefault();
      this.pointer = { x: pose.x, y: pose.y };
      this.angle = pose.angle;
      this.offset = { x: pose.x - x, y: pose.y - y };
      this.drag = event.pointerId;
      this.capture = event.target instanceof Element ? event.target : null;
      try { this.capture?.setPointerCapture(event.pointerId); } catch { /* Window listeners remain available. */ }
      this.pickUp();
    }, { passive: false });
    window.addEventListener('pointermove', event => {
      if (event.pointerId !== this.drag || !scene.demoActive || scene.paused) return;
      event.preventDefault();
      const { width, height } = scene.viewport;
      const bounds = scene.canvasBounds;
      this.pointer = { x: clamp(event.clientX - bounds.left + this.offset.x, 15, width - 15), y: clamp(event.clientY - bounds.top + this.offset.y, 25, Math.max(25, height - 25)) };
    }, { passive: false });
    const endDrag = (event: PointerEvent) => { if (event.pointerId === this.drag) this.endDrag(); };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('lostpointercapture', endDrag);
    window.addEventListener('blur', () => this.endDrag());
    document.querySelector('#demo-mouth')!.addEventListener('click', () => this.toMouth());
    document.querySelector('#demo-away')!.addEventListener('click', () => this.moveAway());
    document.querySelector('#demo-drop')!.addEventListener('click', () => this.drop());
    document.querySelectorAll<HTMLButtonElement>('[data-demo-effect]').forEach(button => {
      button.addEventListener('click', () => this.emit(button.dataset.demoEffect as VaporKind));
    });
    document.addEventListener('keydown', event => {
      if (!scene.demoActive || scene.paused || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || target.closest('input,textarea,select,dialog')) return;
      const kind = ({ '1': 'cloud', '2': 'ring', '3': 'burst' } as const)[event.key as '1' | '2' | '3'];
      if (kind) { event.preventDefault(); this.emit(kind); }
    });
  }

  private mouth(): Point {
    const { width, height } = this.scene.viewport;
    return { x: width * .59, y: height * .4 };
  }

  private endDrag() {
    const pointer = this.drag;
    this.drag = null;
    if (pointer !== null && this.capture?.hasPointerCapture(pointer)) this.capture.releasePointerCapture(pointer);
    this.capture = null;
  }

  private hand(): HandPose {
    return { center: { ...this.pointer }, axis: { x: Math.sin(this.angle), y: -Math.cos(this.angle) }, width: this.scale * 128 / .95, grip: .95, side: 'pointer' };
  }

  private pickUp() {
    this.held = true;
    this.scene.simulation.pickUp(this.hand());
  }

  reset() {
    this.held = false; this.endDrag(); this.effectUntil = 0;
    this.angle = 0;
    this.scale = clamp(Math.min(this.scene.viewport.width / 1100, this.scene.viewport.height / 650), .2, .48);
    this.pointer = { ...this.scene.simulation.frame.pose };
    this.size = `${this.scene.viewport.width}:${this.scene.viewport.height}`;
  }

  toMouth() {
    if (!this.scene.demoActive || this.scene.paused) return;
    const mouth = this.mouth();
    this.angle = 0;
    this.pointer = { x: mouth.x, y: mouth.y + 190 * this.scale };
    this.pickUp();
    this.scene.simulation.readyVapor();
  }

  moveAway() {
    if (!this.scene.demoActive || this.scene.paused) return;
    const mouth = this.mouth();
    this.angle = -.3;
    this.pointer = { x: Math.max(35, mouth.x - Math.max(80, this.scene.viewport.width * .14)), y: Math.min(this.scene.viewport.height - 40, mouth.y + 190 * this.scale) };
    this.pickUp();
  }

  drop() { this.held = false; this.effectUntil = 0; this.endDrag(); this.scene.simulation.letGo(); }

  emit(kind: VaporKind) {
    if (!this.scene.demoActive || this.scene.paused || !this.held) return;
    this.effect = kind;
    this.effectUntil = performance.now() + 850;
    this.moveAway();
    this.scene.simulation.readyVapor();
  }

  input(time: number): InteractionInput {
    const { width, height } = this.scene.viewport;
    if (this.size !== `${width}:${height}`) this.reset();
    const mouth = this.mouth();
    this.scene.demoMouth = mouth;
    const emitting = time < this.effectUntil;
    return {
      pointerControl: true,
      hands: this.held ? [this.hand()] : [],
      face: {
        mouth, width: Math.min(width, height) * .3, mouthWidth: width < 760 ? 30 : 45, yaw: .15,
        pucker: !emitting && this.held && distance({ x: this.pointer.x + Math.sin(this.angle) * 190 * this.scale, y: this.pointer.y - Math.cos(this.angle) * 190 * this.scale }, mouth) < 45 ? .6 : 0,
        funnel: emitting && this.effect === 'ring' ? .8 : 0,
        jaw: emitting ? this.effect === 'burst' ? .85 : this.effect === 'ring' ? .18 : .38 : 0,
        cheeks: 0,
      },
    };
  }
}

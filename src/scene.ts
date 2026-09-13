import { coverTransform } from './geometry';
import { emptyInteraction } from './gestures';
import type { InteractionInput } from './gestures';
import { restingDevice, VapeSimulation } from './simulation';
import type { DevicePose, SimulationFrame } from './simulation';
import { VaporSystem } from './vapor';
import { THEMES } from './themes';
import { DeviceRenderer } from './device';
import type { StudioTheme } from './themes';
import type { Point } from './geometry';
export class Scene {
    private context: CanvasRenderingContext2D;
    private width = 0;
    private height = 0;
    private frame = 0;
    private lastTime = 0;
    private running = false;
    private observer: ResizeObserver;
    private vapor = new VaporSystem();
    private device = new DeviceRenderer();
    private motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    public simulation = new VapeSimulation();
    public interaction: InteractionInput = emptyInteraction();
    public cameraActive = false;
    public demoActive = false;
    public paused = false;
    public demoMouth: Point | null = null;
    public theme: StudioTheme = THEMES[0];
    public showGuides = true;
    public onFrame: ((time: number) => void) | null = null;
    public onSimulationFrame: ((frame: SimulationFrame, time: number) => void) | null = null;
    public drawGuides: ((ctx: CanvasRenderingContext2D, width: number, height: number) => void) | null = null;
    constructor(private canvas: HTMLCanvasElement, public video: HTMLVideoElement) {
        const context = canvas.getContext('2d', { alpha: false });
        if (!context)
            throw new Error('Your browser does not support Canvas 2D.');
        this.context = context;
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(canvas);
        this.resize();
    }
    private resize() {
        this.width = Math.max(1, this.canvas.clientWidth);
        this.height = Math.max(1, this.canvas.clientHeight);
        const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2400000 / Math.max(1, this.width * this.height)));
        this.canvas.width = Math.round(this.width * ratio);
        this.canvas.height = Math.round(this.height * ratio);
        this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.vapor.resize(this.width, this.height);
        this.resetInteraction();
    }
    get viewport() { return { width: this.width, height: this.height }; }
    get canvasBounds() { return this.canvas.getBoundingClientRect(); }
    get active() { return this.cameraActive || this.demoActive; }
    setTheme(theme: StudioTheme) { this.theme = theme; this.vapor.setTheme(theme); }
    resetInteraction() {
        this.interaction = emptyInteraction();
        this.simulation.reset(this.width, this.height);
        this.vapor.clear();
        this.lastTime = 0;
    }
    start() {
        if (this.running) return;
        this.running = true;
        const draw = (time: number) => {
            this.frame = requestAnimationFrame(draw);
            if (document.hidden) {
                this.lastTime = 0;
                return;
            }
            const elapsed = this.lastTime ? (time - this.lastTime) / 1000 : 1 / 60;
            this.lastTime = time;
            const ctx = this.context;
            const w = this.width;
            const h = this.height;
            ctx.fillStyle = '#8b90a5';
            ctx.fillRect(0, 0, w, h);
            if (this.cameraActive && this.video.readyState >= 2 && this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                const { width: vw, height: vh, offsetX, offsetY } = coverTransform(w, h, this.video.videoWidth, this.video.videoHeight);
                ctx.save();
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(this.video, offsetX, offsetY, vw, vh);
                ctx.restore();
            }
            else {
                const bg = ctx.createRadialGradient(w * .4, h * .4, 0, w * .5, h * .5, w * .8);
                bg.addColorStop(0, this.theme.backdrop[0]);
                bg.addColorStop(.65, this.theme.backdrop[1]);
                bg.addColorStop(1, this.theme.backdrop[2]);
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, w, h);
            }
            this.onFrame?.(time);
            const result = this.paused ? this.simulation.frame : this.simulation.update(this.active ? this.interaction : emptyInteraction(), elapsed, w, h);
            this.vapor.update(elapsed, this.active && !this.paused ? result.emission : null, this.motionPreference.matches);
            this.drawStand(ctx, restingDevice(w, h), result, time);
            if (this.demoActive && this.demoMouth) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,234,.8)'; ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(this.demoMouth.x, this.demoMouth.y, 28, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]); ctx.fillStyle = '#ffffe9'; ctx.font = '12px Manrope, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('Mouth position', this.demoMouth.x, this.demoMouth.y - 43);
                ctx.restore();
            }
            if (this.cameraActive && this.showGuides)
                this.drawGuides?.(ctx, w, h);
            this.drawDevice(ctx, result.pose, result.drawIntensity);
            this.vapor.draw(ctx);
            this.onSimulationFrame?.(result, time);
        };
        this.frame = requestAnimationFrame(draw);
    }
    private drawStand(ctx: CanvasRenderingContext2D, pose: DevicePose, state: SimulationFrame, time: number) {
        ctx.save();
        ctx.translate(pose.x, pose.y);
        ctx.scale(pose.scale, pose.scale);
        ctx.globalAlpha = state.held ? .35 : 1;
        ctx.fillStyle = 'rgba(36,43,70,.18)';
        ctx.beginPath();
        ctx.ellipse(0, 184, 126, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,235,.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 184, 151, 31, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (this.active && !state.held) {
            const pulse = this.motionPreference.matches ? .5 : .5 + .5 * Math.sin(time / 620);
            ctx.save();
            ctx.strokeStyle = `rgba(255,255,234,${.25 + pulse * .25})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(state.pose.x, state.pose.y, Math.max(37, state.pose.scale * 89) + pulse * 4, Math.max(70, state.pose.scale * 160) + pulse * 4, state.pose.angle, 0, Math.PI * 2);
            ctx.stroke();
            if (state.pickupProgress > 0) {
                ctx.lineWidth = 3; ctx.strokeStyle = '#ffffe9'; ctx.beginPath();
                ctx.arc(state.pose.x, state.pose.y, 27, -Math.PI / 2, -Math.PI / 2 + state.pickupProgress * Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        }
    }
    private drawDevice(ctx: CanvasRenderingContext2D, pose: DevicePose, glow: number) {
        this.device.draw(ctx, pose, this.theme, glow);
    }
    destroy() {
        cancelAnimationFrame(this.frame);
        this.running = false;
        this.observer.disconnect();
        this.onFrame = null;
        this.onSimulationFrame = null;
        this.drawGuides = null;
        this.resetInteraction();
    }
}


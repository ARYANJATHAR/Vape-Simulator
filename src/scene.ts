import { coverTransform } from './geometry';
export class Scene {
    private context: CanvasRenderingContext2D;
    private width = 0;
    private height = 0;
    private frame = 0;
    public cameraActive = false;
    public showGuides = true;
    public onFrame: ((time: number) => void) | null = null;
    public drawGuides: ((ctx: CanvasRenderingContext2D, width: number, height: number) => void) | null = null;
    constructor(private canvas: HTMLCanvasElement, public video: HTMLVideoElement) {
        const context = canvas.getContext('2d', { alpha: false });
        if (!context)
            throw new Error('Your browser does not support Canvas 2D.');
        this.context = context;
        new ResizeObserver(() => this.resize()).observe(canvas);
        this.resize();
    }
    private resize() {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2400000 / Math.max(1, this.width * this.height)));
        this.canvas.width = Math.round(this.width * ratio);
        this.canvas.height = Math.round(this.height * ratio);
        this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    start() {
        const draw = (time: number) => {
            this.frame = requestAnimationFrame(draw);
            if (document.hidden)
                return;
            const ctx = this.context;
            const w = this.width;
            const h = this.height;
            ctx.fillStyle = '#8b90a5';
            ctx.fillRect(0, 0, w, h);
            if (this.cameraActive && this.video.readyState >= 2) {
                const { width: vw, height: vh, offsetX, offsetY } = coverTransform(w, h, this.video.videoWidth, this.video.videoHeight);
                ctx.save();
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(this.video, offsetX, offsetY, vw, vh);
                ctx.restore();
            }
            else {
                const bg = ctx.createRadialGradient(w * .4, h * .4, 0, w * .5, h * .5, w * .8);
                bg.addColorStop(0, '#b1b4c3');
                bg.addColorStop(.65, '#868ca2');
                bg.addColorStop(1, '#626c84');
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, w, h);
            }
            this.onFrame?.(time);
            if (this.cameraActive && this.showGuides)
                this.drawGuides?.(ctx, w, h);
            this.drawDevice(ctx, w, h);
        };
        this.frame = requestAnimationFrame(draw);
    }
    private drawDevice(ctx: CanvasRenderingContext2D, w: number, h: number) {
        const mobile = w < 760;
        const scale = mobile ? Math.min(.66, w / 650, h / 1150) : Math.min(1.12, h / 780, w / 1300);
        const x = mobile ? w * .19 : w * .235;
        const y = mobile ? h * .78 : h * .64;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(36,43,70,.18)';
        ctx.beginPath();
        ctx.ellipse(0, 184, 126, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,235,.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 184, 151, 31, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate(-.12);
        // The device is procedural scene geometry so future phases can move and recolor it.
        const body = ctx.createLinearGradient(-66, 0, 66, 0);
        body.addColorStop(0, '#414e6d');
        body.addColorStop(.17, '#7c8baa');
        body.addColorStop(.55, '#657596');
        body.addColorStop(1, '#394762');
        ctx.shadowColor = 'rgba(22,29,55,.25)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 15;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.roundRect(-64, -80, 128, 251, [15, 15, 31, 31]);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#a8b3c9';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-60, -76, 120, 242, [14, 14, 27, 27]);
        ctx.stroke();
        ctx.fillStyle = '#cbd1dd';
        ctx.beginPath();
        ctx.roundRect(-62, -86, 124, 12, 4);
        ctx.fill();
        const pod = ctx.createLinearGradient(-54, -160, 54, -80);
        pod.addColorStop(0, '#d6dce8');
        pod.addColorStop(.45, '#a0aabd');
        pod.addColorStop(1, '#66738b');
        ctx.fillStyle = pod;
        ctx.beginPath();
        ctx.roundRect(-54, -161, 108, 76, [18, 18, 5, 5]);
        ctx.fill();
        ctx.fillStyle = 'rgba(237,241,249,.35)';
        ctx.beginPath();
        ctx.roundRect(-43, -150, 10, 54, 5);
        ctx.fill();
        ctx.fillStyle = '#343e55';
        ctx.beginPath();
        ctx.roundRect(-40, -197, 80, 43, [16, 16, 5, 5]);
        ctx.fill();
        ctx.fillStyle = '#59657c';
        ctx.beginPath();
        ctx.ellipse(0, -190, 29, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#202b42';
        ctx.beginPath();
        ctx.ellipse(0, -190, 17, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(249,249,234,.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 4, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 4, 9, 16, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#edeedb';
        ctx.font = '12px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('S T U D I O', 0, 45);
        ctx.fillStyle = '#c2d6dc';
        ctx.beginPath();
        ctx.roundRect(-10, 126, 20, 3, 2);
        ctx.fill();
        ctx.restore();
    }
    destroy() { cancelAnimationFrame(this.frame); }
}

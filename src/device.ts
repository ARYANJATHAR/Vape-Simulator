import type { DevicePose } from './simulation';
import type { StudioTheme } from './themes';
import { rgba } from './themes';

// Keep the same body bounds and mouth anchor as the interaction model.
const LEFT = -82, TOP = -213, WIDTH = 164, HEIGHT = 400;
const RESOLUTION = 2;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number | number[]) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
}

function gradient(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const result = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [position, color] of stops) result.addColorStop(position, color);
  return result;
}

export class DeviceRenderer {
  private surfaces = new Map<string, HTMLCanvasElement>();

  private surface(theme: StudioTheme) {
    const existing = this.surfaces.get(theme.id);
    if (existing) return existing;
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH * RESOLUTION; canvas.height = HEIGHT * RESOLUTION;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.scale(RESOLUTION, RESOLUTION); ctx.translate(-LEFT, -TOP);

    // Anodized shell: narrow edge reflections and a broad, darker front face.
    ctx.fillStyle = gradient(ctx, -64, 0, 64, 0, [
      [0, '#17202a'], [.035, theme.body[0]], [.085, theme.pale], [.14, theme.body[1]],
      [.3, theme.body[2]], [.7, theme.body[0]], [.88, theme.body[2]], [.95, theme.body[0]], [1, '#18212a'],
    ]);
    rounded(ctx, -64, -80, 128, 251, [17, 17, 30, 30]); ctx.fill();
    ctx.save(); rounded(ctx, -64, -80, 128, 251, [17, 17, 30, 30]); ctx.clip();
    ctx.fillStyle = gradient(ctx, 0, -80, 0, 173, [[0, '#ffffff28'], [.15, '#ffffff00'], [.65, '#00000000'], [1, '#08121e80']]);
    ctx.fillRect(-64, -80, 128, 253);
    // Deterministic fine machining lines are rasterized once per theme.
    for (let i = 0; i < 160; i++) {
      const x = -61 + i * .77;
      ctx.strokeStyle = i % 3 === 0 ? '#ffffff0c' : '#1018240c';
      ctx.lineWidth = .3; ctx.beginPath(); ctx.moveTo(x, -72); ctx.lineTo(x, 169); ctx.stroke();
    }
    ctx.strokeStyle = '#f4f8ff5c'; ctx.lineWidth = .8;
    rounded(ctx, -61.5, -77, 123, 245, [15, 15, 28, 28]); ctx.stroke();
    // Slim raised edge and darker side seam establish thickness.
    ctx.strokeStyle = '#ffffff50'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-48, -70); ctx.lineTo(-48, 141); ctx.quadraticCurveTo(-48, 160, -32, 163); ctx.stroke();
    ctx.strokeStyle = '#0b142c55'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(47, -70); ctx.lineTo(47, 143); ctx.quadraticCurveTo(47, 160, 31, 163); ctx.stroke();
    ctx.restore();

    // Recessed pod seat, metal collar, and the dark gasket between materials.
    ctx.fillStyle = '#10171fe6'; rounded(ctx, -59, -91, 118, 14, 5); ctx.fill();
    ctx.fillStyle = gradient(ctx, -62, 0, 62, 0, [[0, '#39434e'], [.12, '#c6d1d7'], [.27, '#e0e6e9'], [.48, '#7c8b97'], [.84, '#a9b5bc'], [1, '#384451']]);
    rounded(ctx, -62, -84, 124, 9, 3); ctx.fill();
    ctx.fillStyle = '#eef6fa69'; ctx.fillRect(-48, -83, 83, 1);

    // Smoked transparent cartridge. Its central chimney and lower cartridge
    // assembly remain visible through the tint, instead of a solid color block.
    ctx.save(); rounded(ctx, -53, -164, 106, 78, [17, 17, 7, 7]); ctx.clip();
    ctx.fillStyle = gradient(ctx, -53, 0, 53, 0, [[0, '#151e29df'], [.18, '#788b94a8'], [.5, '#65747d85'], [.82, '#2f3c49cf'], [1, '#101923eb']]);
    ctx.fillRect(-53, -164, 106, 78);
    ctx.fillStyle = gradient(ctx, 0, -144, 0, -87, [[0, '#c6a46b12'], [.3, '#af925435'], [1, '#78624365']]);
    rounded(ctx, -45, -140, 90, 52, 8); ctx.fill();
    ctx.strokeStyle = '#f3e4b62f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, -137, 42, 3, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = gradient(ctx, -11, 0, 11, 0, [[0, '#202d38'], [.24, '#a8b4b8'], [.46, '#d9dfe0'], [.65, '#7b8b92'], [1, '#293741']]);
    rounded(ctx, -11, -159, 22, 60, 3); ctx.fill();
    ctx.fillStyle = gradient(ctx, -23, 0, 23, 0, [[0, '#27313b'], [.25, '#9fa9ad'], [.52, '#6f7f88'], [1, '#23303a']]);
    rounded(ctx, -23, -114, 46, 27, 5); ctx.fill();
    ctx.fillStyle = '#111c27b5';
    for (const x of [-15, -4, 7]) { rounded(ctx, x, -106, 7, 10, 2); ctx.fill(); }
    ctx.fillStyle = '#0b152171'; ctx.fillRect(-52, -94, 104, 8);
    ctx.fillStyle = gradient(ctx, -47, -161, 34, -85, [[0, '#ffffff70'], [.1, '#ffffff14'], [.37, '#ffffff00'], [.63, '#d5e7ed12'], [1, '#ffffff00']]);
    ctx.fillRect(-53, -164, 106, 78);
    ctx.fillStyle = '#e7f3f459'; rounded(ctx, -43, -151, 5, 52, 2.5); ctx.fill();
    ctx.fillStyle = '#f2fcff24'; rounded(ctx, -35, -155, 2, 38, 1); ctx.fill();
    ctx.strokeStyle = '#e5f3ff45'; ctx.lineWidth = 1;
    rounded(ctx, -52, -163, 104, 76, [16, 16, 7, 7]); ctx.stroke();
    ctx.restore();

    // Tapered molded mouthpiece, with an inset oval opening at y = -190.
    ctx.fillStyle = gradient(ctx, -46, -193, 45, -153, [[0, '#10171d'], [.17, '#56616b'], [.33, '#2b333b'], [.68, '#171f27'], [1, '#080e15']]);
    ctx.beginPath(); ctx.moveTo(-45, -155);
    ctx.bezierCurveTo(-46, -170, -39, -189, -32, -195);
    ctx.bezierCurveTo(-23, -202, 22, -202, 32, -195);
    ctx.bezierCurveTo(40, -187, 46, -168, 45, -155);
    ctx.quadraticCurveTo(0, -149, -45, -155); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b9c6d04d'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-40, -159); ctx.bezierCurveTo(-40, -176, -33, -191, -27, -193); ctx.stroke();
    ctx.fillStyle = gradient(ctx, 0, -198, 0, -184, [[0, '#58646d'], [.45, '#39454e'], [1, '#0c141c']]);
    ctx.beginPath(); ctx.ellipse(0, -190, 28, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#050b10'; ctx.beginPath(); ctx.ellipse(0, -190, 19, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#becad144'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.ellipse(0, -190, 19, 3.4, 0, 0, Math.PI); ctx.stroke();

    // A small recessed control, subtle engraving, and real hardware details.
    ctx.fillStyle = '#10202d9c'; rounded(ctx, -17, -25, 34, 35, 17); ctx.fill();
    ctx.fillStyle = gradient(ctx, -13, -22, 14, 8, [[0, '#d6e1e578'], [.2, theme.body[1]], [.55, theme.body[0]], [1, '#1a2634']]);
    rounded(ctx, -14, -23, 28, 29, 14); ctx.fill();
    ctx.strokeStyle = '#e1edf63a'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.arc(0, -9, 11, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.font = '9px Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#f1f5f870'; ctx.fillText('O N L I N E', 0, 53);
    ctx.fillStyle = '#0715217a'; rounded(ctx, -12, 114, 24, 6, 3); ctx.fill();
    ctx.fillStyle = '#bed2df9c'; rounded(ctx, -8, 116, 16, 2, 1); ctx.fill();
    ctx.fillStyle = '#0a131ce6'; rounded(ctx, -14, 149, 28, 9, 4); ctx.fill();
    ctx.strokeStyle = '#c9d6e251'; ctx.lineWidth = .8;
    rounded(ctx, -14, 149, 28, 9, 4); ctx.stroke();
    ctx.fillStyle = '#76868f'; rounded(ctx, -8, 153, 16, 1.5, .75); ctx.fill();
    for (const x of [-37, 37]) {
      ctx.fillStyle = '#192734bf'; ctx.beginPath(); ctx.ellipse(x, 144, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9d5df48'; ctx.fillRect(x - 1, 143.8, 2, .6);
    }
    this.surfaces.set(theme.id, canvas);
    return canvas;
  }

  draw(ctx: CanvasRenderingContext2D, pose: DevicePose, theme: StudioTheme, glow: number) {
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.angle); ctx.scale(pose.scale, pose.scale);
    ctx.shadowColor = '#0a142841'; ctx.shadowBlur = 14 * pose.scale; ctx.shadowOffsetY = 8 * pose.scale;
    ctx.drawImage(this.surface(theme), LEFT, TOP, WIDTH, HEIGHT);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // The broad reflection shifts subtly as the user rotates the device.
    ctx.save(); rounded(ctx, -63, -79, 126, 249, [16, 16, 29, 29]); ctx.clip();
    const reflectionX = -25 + Math.sin(pose.angle) * 30;
    ctx.fillStyle = gradient(ctx, reflectionX - 22, 0, reflectionX + 22, 0, [[0, '#ffffff00'], [.48, '#f1f6ff12'], [.56, '#f1f6ff20'], [1, '#ffffff00']]);
    ctx.fillRect(-64, -80, 128, 251); ctx.restore();
    if (glow > .01) {
      // Contact lights the cartridge and front indicator immediately, even
      // before the user purses their lips. Keep the spill inside the device.
      ctx.save();
      rounded(ctx, -51, -161, 102, 73, [15, 15, 6, 6]); ctx.clip();
      const light = ctx.createRadialGradient(0, -105, 2, 0, -105, 60);
      light.addColorStop(0, `rgba(245,255,249,${.95 * glow})`);
      light.addColorStop(.45, rgba(theme.vapor, .6 * glow));
      light.addColorStop(1, rgba(theme.vapor, 0));
      ctx.fillStyle = light; ctx.fillRect(-53, -164, 106, 78);
      ctx.restore();
      // A bright front control and a larger LED remain readable at hand scale.
      ctx.fillStyle = '#dcffe8';
      ctx.shadowColor = '#86ffc1'; ctx.shadowBlur = Math.max(9, 24 * pose.scale);
      ctx.beginPath(); ctx.arc(0, -9, 8, 0, Math.PI * 2); ctx.fill();
      rounded(ctx, -12, 113, 24, 8, 4); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff';
      rounded(ctx, -8, 115, 16, 3, 1.5); ctx.fill();
    }
    ctx.restore();
  }
}

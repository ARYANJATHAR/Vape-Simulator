import type { VaporEmission } from './simulation';
import { clamp } from './gestures';
import { THEMES, rgba } from './themes';
import type { StudioTheme } from './themes';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  lifetime: number;
  rotation: number;
  spin: number;
  seed: number;
  ring: boolean;
  aspect: number;
  theme: StudioTheme;
}

export class VaporSystem {
  private particles: Particle[] = [];
  private layer = document.createElement('canvas');
  private context = this.layer.getContext('2d');
  private theme = THEMES[0];
  private sprites = new Map<string, { cloud: HTMLCanvasElement; ring: HTMLCanvasElement }>();
  private lastKind: VaporEmission['kind'] | null = null;
  private width = 0;
  private height = 0;
  private debt = 0;
  private ringCooldown = 0;
  private budget = 300;
  private averageFrame = 1 / 60;

  private makeSprite(ring: boolean, theme: StudioTheme) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    if (ring) {
      gradient.addColorStop(0, rgba(theme.vapor, 0));
      gradient.addColorStop(.43, rgba(theme.vapor, 0));
      gradient.addColorStop(.52, rgba(theme.vapor, .14));
      gradient.addColorStop(.63, rgba(theme.vapor, .8));
      gradient.addColorStop(.74, rgba(theme.vapor, .23));
      gradient.addColorStop(1, rgba(theme.vapor, 0));
    } else {
      gradient.addColorStop(0, rgba(theme.vapor, .85));
      gradient.addColorStop(.3, rgba(theme.vapor, .67));
      gradient.addColorStop(.6, rgba(theme.vapor, .3));
      gradient.addColorStop(1, rgba(theme.vapor, 0));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 96, 96);
    if (!ring) {
      // Soft gaps break up the circular sprite without per-frame blur filters.
      ctx.globalCompositeOperation = 'destination-out';
      for (const [x, y, r] of [[25, 29, 22], [63, 62, 27], [38, 75, 17]]) {
        const gap = ctx.createRadialGradient(x, y, 0, x, y, r);
        gap.addColorStop(0, 'rgba(0,0,0,.5)'); gap.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gap; ctx.fillRect(0, 0, 96, 96);
      }
    }
    return canvas;
  }

  setTheme(theme: StudioTheme) {
    this.theme = theme;
    if (!this.sprites.has(theme.id)) this.sprites.set(theme.id, { cloud: this.makeSprite(false, theme), ring: this.makeSprite(true, theme) });
  }

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = width; this.height = height;
    this.layer.width = Math.max(1, Math.ceil(width / 2));
    this.layer.height = Math.max(1, Math.ceil(height / 2));
    this.clear();
  }

  clear() {
    this.particles.length = 0; this.debt = 0; this.ringCooldown = 0; this.lastKind = null;
    this.context?.clearRect(0, 0, this.layer.width, this.layer.height);
  }

  private spawn(emission: VaporEmission, ring: boolean, reducedMotion: boolean) {
    if (this.particles.length >= this.budget) return;
    if (!this.sprites.has(this.theme.id)) this.setTheme(this.theme);
    const front = 1 - Math.abs(emission.yaw);
    const direction = Math.atan2(-.22, emission.yaw * 1.5);
    const spread = ring ? .05 : emission.kind === 'burst' ? 1.2 : .25 + front * .9;
    const angle = direction + (Math.random() - .5) * spread * 2;
    const sceneScale = clamp(this.height / 720, .5, 1.5);
    const speed = (ring ? 105 : emission.kind === 'burst' ? 200 : 110) * (.5 + Math.random() * .5) * sceneScale * (reducedMotion ? .5 : 1);
    this.particles.push({
      x: emission.origin.x + (Math.random() - .5) * emission.mouthWidth * .35,
      y: emission.origin.y + (Math.random() - .5) * emission.mouthWidth * .1,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.max(8, emission.mouthWidth * (ring ? .9 : .35 + Math.random() * .25)),
      age: 0,
      lifetime: (ring ? 3.4 : 2.3 + Math.random() * 1.2) * (reducedMotion ? .7 : 1) * this.theme.life,
      rotation: ring ? emission.yaw * .3 : Math.random() * Math.PI * 2,
      spin: (Math.random() - .5) * (reducedMotion ? .03 : .22),
      seed: Math.random() * Math.PI * 2,
      ring,
      aspect: ring ? .4 + front * .6 : .75 + Math.random() * .3,
      theme: this.theme,
    });
  }

  update(elapsed: number, emission: VaporEmission | null, reducedMotion: boolean) {
    this.averageFrame += (Math.min(elapsed, .2) - this.averageFrame) * .025;
    const baseBudget = this.width < 760 ? 170 : 300;
    this.budget = Math.round(baseBudget * (this.averageFrame > .045 ? .6 : 1) * (reducedMotion ? .5 : 1));
    if (this.particles.length > this.budget) this.particles.splice(0, this.particles.length - this.budget);
    const dt = clamp(elapsed, 0, .05);
    this.ringCooldown = Math.max(0, this.ringCooldown - dt);
    if (emission && emission.strength > 0) {
      // Seed the first visible particles in this very frame, rather than waiting
      // for a fractional spawn counter or a fade-in to accumulate.
      if (this.lastKind !== emission.kind) {
        this.ringCooldown = 0;
        if (emission.kind !== 'ring') {
          for (let i = 0; i < (reducedMotion ? 2 : emission.kind === 'burst' ? 10 : 6); i++) this.spawn(emission, false, reducedMotion);
        }
      }
      this.lastKind = emission.kind;
      if (emission.kind === 'ring') {
        this.debt = 0;
        if (this.ringCooldown === 0) {
          this.spawn(emission, true, reducedMotion);
          this.ringCooldown = reducedMotion ? .7 : .43;
        }
      } else {
        this.debt += emission.strength * dt * (emission.kind === 'burst' ? 175 : 75) * (reducedMotion ? .45 : 1);
        const count = Math.floor(this.debt);
        this.debt -= count;
        for (let i = 0; i < count; i++) this.spawn(emission, false, reducedMotion);
      }
    } else { this.debt = 0; this.lastKind = null; this.ringCooldown = 0; }

    const motion = reducedMotion ? .45 : 1;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.vx *= Math.exp(-dt * .75); p.vy *= Math.exp(-dt * .6);
      p.vx += Math.sin(p.age * 1.8 + p.seed + p.y * .01) * 20 * dt * motion * p.theme.curl;
      p.vy += (Math.cos(p.age + p.seed) * 9 * p.theme.curl - 14 * p.theme.lift) * dt * motion;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.radius += (p.ring ? 24 : 30) * dt * motion * p.theme.growth;
      p.rotation += p.spin * dt;
      if (p.age >= p.lifetime || p.x < -p.radius * 2 || p.x > this.width + p.radius * 2 || p.y < -p.radius * 2 || p.y > this.height + p.radius * 2) this.particles.splice(i, 1);
    }
  }

  draw(target: CanvasRenderingContext2D) {
    const ctx = this.context;
    if (!ctx || !this.particles.length) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.layer.width, this.layer.height);
    ctx.scale(this.layer.width / this.width, this.layer.height / this.height);
    for (const p of this.particles) {
      const life = clamp(1 - p.age / p.lifetime);
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.pow(life, .8) * (p.ring ? .7 : .31) * p.theme.density);
      ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      const sprites = this.sprites.get(p.theme.id)!;
      ctx.drawImage(p.ring ? sprites.ring : sprites.cloud, -p.radius, -p.radius * p.aspect, p.radius * 2, p.radius * p.aspect * 2);
      ctx.restore();
    }
    target.save(); target.imageSmoothingEnabled = true;
    target.drawImage(this.layer, 0, 0, this.width, this.height);
    target.restore();
  }
}

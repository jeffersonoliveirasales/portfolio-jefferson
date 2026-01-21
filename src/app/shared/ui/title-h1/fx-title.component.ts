import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostBinding,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';

type FxSize = 'hero' | 'section' | 'small';

@Component({
  selector: 'app-fx-title',
  standalone: true,
  templateUrl: './fx-title.component.html',
  styleUrls: ['./fx-title.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FxTitleComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input({ required: true }) text = '';
  @Input() size: FxSize = 'hero';

  @HostBinding('attr.tabindex') tabindex = 0;

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChildren('ch') chRefs!: QueryList<ElementRef<HTMLElement>>;

  chars: string[] = [];

  private ro?: ResizeObserver;
  private raf = 0;
  private running = false;

  private reduceMotion = false;
  private scrollEl?: HTMLElement;
  private scrollTimeout = 0;
  private isScrolling = false;

  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;

  // letras: bounds relativos ao host
  private bounds: DOMRect[] = [];
  private activeIndex = -1;

  // ponteiro
  private pointer = { x: 0, y: 0, inside: false };
  private intensity = 0;
  private targetIntensity = 0;

  // partículas de fundo + burst
  private ambient: Particle[] = [];
  private bursts: BurstParticle[] = [];

  constructor(private zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text']) {
      this.chars = [...(this.text ?? '')];
      // bounds vão ser recalculados no AfterViewInit / QueryList changes
    }
  }

  ngAfterViewInit(): void {
    this.reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

    this.ctx = this.canvasRef.nativeElement.getContext('2d', { alpha: true });

    this.bindEvents();
    this.setupResizeObserver();

    this.setupScrollPause();

    // quando as letras renderizam/re-renderizam
    this.chRefs.changes.subscribe(() => {
      this.computeLetterBounds();
      this.reseedAmbient();
      this.drawOnce();
    });

    this.resize();
    this.computeLetterBounds();
    this.reseedAmbient();
    this.drawOnce();
  }

  ngOnDestroy(): void {
    this.stop();
    this.ro?.disconnect();
    this.unbindEvents();

    if (this.scrollEl) {
      this.scrollEl.removeEventListener('scroll', this.onScroll, { capture: true } as any);
    }
    if (this.scrollTimeout) window.clearTimeout(this.scrollTimeout);
  }

  // ---------------- Events ----------------
  private onPointerMove = (ev: PointerEvent) => {
    const host = this.hostRef.nativeElement;
    const rect = host.getBoundingClientRect();

    this.pointer.x = ev.clientX - rect.left;
    this.pointer.y = ev.clientY - rect.top;

    host.style.setProperty('--mx', `${this.pointer.x}px`);
    host.style.setProperty('--my', `${this.pointer.y}px`);

    const idx = this.hitTestLetter(this.pointer.x, this.pointer.y);
    if (idx !== this.activeIndex && idx !== -1) {
      this.setActiveLetter(idx);
      if (!this.reduceMotion) this.explodeAtLetter(idx); // <<< efeito explosão por letra
    }

    this.ensureRunning();
  };

  private onPointerEnter = () => {
    this.pointer.inside = true;
    this.targetIntensity = 1;
    this.ensureRunning();
  };

  private onPointerLeave = () => {
    this.pointer.inside = false;
    this.targetIntensity = 0;
    this.clearActiveLetter();
    this.ensureRunning();
  };

  private onFocus = () => {
    this.pointer.inside = true;
    this.targetIntensity = 1;
    this.ensureRunning();
  };

  private onBlur = () => {
    this.pointer.inside = false;
    this.targetIntensity = 0;
    this.clearActiveLetter();
    this.ensureRunning();
  };

  private bindEvents(): void {
    const host = this.hostRef.nativeElement;
    host.addEventListener('pointermove', this.onPointerMove, { passive: true });
    host.addEventListener('pointerenter', this.onPointerEnter, { passive: true });
    host.addEventListener('pointerleave', this.onPointerLeave, { passive: true });
    host.addEventListener('focus', this.onFocus);
    host.addEventListener('blur', this.onBlur);
  }

  private onScroll = () => {
    this.isScrolling = true;
    this.stop();

    if (this.scrollTimeout) window.clearTimeout(this.scrollTimeout);
    this.scrollTimeout = window.setTimeout(() => {
      this.isScrolling = false;
      if (this.pointer.inside || this.bursts.length > 0) this.ensureRunning();
    }, 140);
  };

  private setupScrollPause(): void {
    const scroller = document.querySelector<HTMLElement>('[data-scroll-container]');
    if (!scroller) return;
    this.scrollEl = scroller;
    scroller.addEventListener('scroll', this.onScroll, { passive: true, capture: true } as any);
  }

  private unbindEvents(): void {
    const host = this.hostRef.nativeElement;
    host.removeEventListener('pointermove', this.onPointerMove);
    host.removeEventListener('pointerenter', this.onPointerEnter);
    host.removeEventListener('pointerleave', this.onPointerLeave);
    host.removeEventListener('focus', this.onFocus);
    host.removeEventListener('blur', this.onBlur);
  }

  // ---------------- Bounds letra por letra ----------------
  private computeLetterBounds(): void {
    const host = this.hostRef.nativeElement;
    const hostRect = host.getBoundingClientRect();

    this.bounds = this.chRefs.toArray().map(r => {
      const b = r.nativeElement.getBoundingClientRect();
      // normaliza para coordenadas relativas ao host
      return new DOMRect(
        b.left - hostRect.left,
        b.top - hostRect.top,
        b.width,
        b.height
      );
    });
  }

  private hitTestLetter(x: number, y: number): number {
    // simples: acha o primeiro rect que contém o ponteiro
    for (let i = 0; i < this.bounds.length; i++) {
      const b = this.bounds[i];
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        // ignora “espaços” (muito finos)
        const c = this.chars[i];
        if (c === ' ') return -1;
        return i;
      }
    }
    return -1;
  }

  private setActiveLetter(idx: number): void {
    this.clearActiveLetter();
    this.activeIndex = idx;

    const el = this.chRefs.get(idx)?.nativeElement;
    if (el) el.classList.add('is-active');
  }

  private clearActiveLetter(): void {
    if (this.activeIndex >= 0) {
      const el = this.chRefs.get(this.activeIndex)?.nativeElement;
      if (el) el.classList.remove('is-active');
    }
    this.activeIndex = -1;
  }

  // ---------------- Resize ----------------
  private setupResizeObserver(): void {
    this.ro = new ResizeObserver(() => {
      this.resize();
      this.computeLetterBounds();
      this.reseedAmbient();
      this.drawOnce();
    });
    this.ro.observe(this.hostRef.nativeElement);
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const host = this.hostRef.nativeElement;
    const rect = host.getBoundingClientRect();

    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.floor(w * this.dpr);
    canvas.height = Math.floor(h * this.dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = this.ctx;
    if (ctx) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    }
  }

  // ---------------- Partículas ----------------
  private reseedAmbient(): void {
    const hostRect = this.hostRef.nativeElement.getBoundingClientRect();
    const w = Math.max(1, hostRect.width);
    const h = Math.max(1, hostRect.height);

    const base = this.size === 'hero' ? 70 : this.size === 'section' ? 55 : 40;
    const areaFactor = Math.sqrt((w * h) / (800 * 160));
    const target = clamp(Math.round(base * areaFactor), 30, 120);

    this.ambient = createParticles(target, w, h);
  }

  private explodeAtLetter(idx: number): void {
    const b = this.bounds[idx];
    if (!b) return;

    // centro da letra
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    // quantidade da explosão depende do tamanho
    const count = this.size === 'hero' ? 26 : 18;

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 2.2;

      this.bursts.push({
        x: cx + (Math.random() - 0.5) * 6,
        y: cy + (Math.random() - 0.5) * 6,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        r: 0.8 + Math.random() * 1.8,
      });
    }

    // mantém lista enxuta
    if (this.bursts.length > 220) this.bursts.splice(0, this.bursts.length - 220);
  }

  // ---------------- Loop ----------------
  private start(): void {
    if (this.running) return;
    this.running = true;

    this.zone.runOutsideAngular(() => {
      const loop = (t: number) => {
        this.raf = requestAnimationFrame(loop);
        this.tick(t);
      };
      this.raf = requestAnimationFrame(loop);
    });
  }

  private stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private ensureRunning(): void {
    if (this.reduceMotion) {
      this.drawOnce();
      return;
    }
    if (this.isScrolling) return;
    if (!this.running) this.start();
  }

  private tick(_t: number): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const host = this.hostRef.nativeElement;
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    // suaviza intensidade
    this.intensity = lerp(this.intensity, this.targetIntensity, 0.10);

    // atualiza partículas ambiente (bem leve)
    const speed = 0.35 + this.intensity * 0.6;
    for (const p of this.ambient) {
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      p.x = clamp(p.x, 0, w);
      p.y = clamp(p.y, 0, h);
    }

    // atualiza bursts (explosão)
    for (const b of this.bursts) {
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.985;
      b.vy *= 0.985;
      b.life -= 0.03; // some rápido, efeito “pop”
    }
    this.bursts = this.bursts.filter(b => b.life > 0);

    // limpar
    ctx.clearRect(0, 0, w, h);

    // desenhar: rede localizada na letra ativa + bursts
    this.drawLocalNetwork(ctx, w, h);
    this.drawAmbientDots(ctx);
    this.drawBursts(ctx);

    // se não está interagindo e não tem bursts, para
    const idle = this.intensity < 0.01 && this.bursts.length === 0 && !this.pointer.inside;
    if (idle) this.stop();
  }

  private drawLocalNetwork(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // sem letra ativa? nada
    const idx = this.activeIndex;
    if (idx < 0) return;

    const b = this.bounds[idx];
    if (!b) return;

    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    const radius = (this.size === 'hero' ? 120 : 95) + this.intensity * 60;
    const maxDist2 = radius * radius;

    // conecta apenas partículas perto do centro da letra ativa
    for (let i = 0; i < this.ambient.length; i++) {
      const a = this.ambient[i];
      const dxA = a.x - cx;
      const dyA = a.y - cy;
      if (dxA * dxA + dyA * dyA > maxDist2) continue;

      for (let j = i + 1; j < this.ambient.length; j++) {
        const bb = this.ambient[j];
        const dxB = bb.x - cx;
        const dyB = bb.y - cy;
        if (dxB * dxB + dyB * dyB > maxDist2) continue;

        const dx = a.x - bb.x;
        const dy = a.y - bb.y;
        const d2 = dx * dx + dy * dy;

        const link = 70 + this.intensity * 60;
        if (d2 > link * link) continue;

        const d = Math.sqrt(d2);
        const proximity = 1 - clamp(d / link, 0, 1);

        const alpha = (0.02 + this.intensity * 0.16) * proximity;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(bb.x, bb.y);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private drawAmbientDots(ctx: CanvasRenderingContext2D): void {
    for (const p of this.ambient) {
      const alpha = 0.10 + this.intensity * 0.15;
      ctx.save();
      ctx.shadowColor = `rgba(255,255,255,${alpha})`;
      ctx.shadowBlur = 1 + this.intensity * 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBursts(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bursts) {
      const a = clamp(b.life, 0, 1);
      ctx.save();
      ctx.shadowColor = `rgba(255,255,255,${0.35 * a})`;
      ctx.shadowBlur = 10 * a;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + (1 - a) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`;
      ctx.fill();
      ctx.restore();
    }
  }

  private drawOnce(): void {
    // desenha um frame (quando resize/reseed)
    const ctx = this.ctx;
    if (!ctx) return;

    const host = this.hostRef.nativeElement;
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    ctx.clearRect(0, 0, w, h);
    this.drawLocalNetwork(ctx, w, h);
    this.drawAmbientDots(ctx);
    this.drawBursts(ctx);
  }
}

// ---------- types/helpers ----------
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
}

interface BurstParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; // 0..1
  r: number;
}

function createParticles(count: number, w: number, h: number): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 0.7 + Math.random() * 1.2,
    });
  }
  return arr;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

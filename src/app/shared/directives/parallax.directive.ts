import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  inject,
} from '@angular/core';

type ParallaxAxis = 'x' | 'y';

type ParallaxOrigin = 'center' | 'top' | 'bottom';

@Directive({
  selector: '[appParallax]',
  standalone: true,
})
export class ParallaxDirective implements AfterViewInit, OnDestroy {
  @Input() parallaxSpeed = 0.12;
  @Input() parallaxAxis: ParallaxAxis = 'y';
  @Input() parallaxMaxPx = 28;
  @Input() parallaxLerp = 0.12;
  @Input() parallaxContainerSelector = '[data-scroll-container]';
  @Input() parallaxOrigin: ParallaxOrigin = 'center';

  private readonly elRef = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);

  private containerEl?: HTMLElement;
  private rafId = 0;
  private rafPending = false;
  private ro?: ResizeObserver;
  private io?: IntersectionObserver;
  private visible = true;

  private reduceMotion = false;

  private currentX = 0;
  private currentY = 0;

  ngAfterViewInit(): void {
    this.reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

    if (this.reduceMotion) return;

    this.containerEl =
      document.querySelector<HTMLElement>(this.parallaxContainerSelector) ?? undefined;

    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.requestUpdate());
      this.ro.observe(this.elRef.nativeElement);
      if (this.containerEl) this.ro.observe(this.containerEl);

      this.io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          this.visible = entry.isIntersecting;
          if (this.visible) this.requestUpdate();
        },
        {
          root: this.containerEl ?? null,
          threshold: 0,
        }
      );
      this.io.observe(this.elRef.nativeElement);

      if (this.containerEl) {
        this.containerEl.addEventListener('scroll', this.onScroll, { passive: true });
      } else {
        window.addEventListener('scroll', this.onScroll, { passive: true });
      }

      this.requestUpdate();
    });
  }

  ngOnDestroy(): void {
    this.cancelRaf();
    this.ro?.disconnect();
    this.io?.disconnect();

    if (this.containerEl) {
      this.containerEl.removeEventListener('scroll', this.onScroll);
    } else {
      window.removeEventListener('scroll', this.onScroll);
    }

    if (this.reduceMotion) return;
    const el = this.elRef.nativeElement;
    el.style.removeProperty('--parallax-x');
    el.style.removeProperty('--parallax-y');

    this.currentX = 0;
    this.currentY = 0;
  }

  private onScroll = () => {
    this.requestUpdate();
  };

  private requestUpdate(): void {
    if (this.reduceMotion) return;
    if (!this.visible) return;

    if (this.rafPending) return;
    this.rafPending = true;

    this.rafId = requestAnimationFrame(() => {
      this.rafPending = false;
      this.apply();
    });
  }

  private cancelRaf(): void {
    if (!this.rafId) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.rafPending = false;
  }

  private apply(): void {
    const el = this.elRef.nativeElement;
    const rect = el.getBoundingClientRect();

    const container = this.containerEl;
    const containerRect = container?.getBoundingClientRect();

    // viewport do "mundo" do parallax
    const viewH = containerRect?.height ?? window.innerHeight;

    // centro do container em coordenada local (0..viewH)
    const viewCenterLocal = viewH / 2;

    // posição do elemento em coordenada local do container
    const topLocal = containerRect ? rect.top - containerRect.top : rect.top;
    const bottomLocal = containerRect ? rect.bottom - containerRect.top : rect.bottom;

    let anchorLocal = topLocal + rect.height / 2;
    if (this.parallaxOrigin === 'top') anchorLocal = topLocal;
    if (this.parallaxOrigin === 'bottom') anchorLocal = bottomLocal;

    const normalized = (anchorLocal - viewCenterLocal) / Math.max(1, viewH); // ~ -0.5..0.5

    let delta = -normalized * this.parallaxSpeed * viewH;
    const target = clamp(delta, -this.parallaxMaxPx, this.parallaxMaxPx);

    const targetX = this.parallaxAxis === 'x' ? target : 0;
    const targetY = this.parallaxAxis === 'y' ? target : 0;

    const lerp = clamp(this.parallaxLerp, 0, 1);
    this.currentX += (targetX - this.currentX) * lerp;
    this.currentY += (targetY - this.currentY) * lerp;

    el.style.setProperty('--parallax-x', `${this.currentX.toFixed(2)}px`);
    el.style.setProperty('--parallax-y', `${this.currentY.toFixed(2)}px`);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

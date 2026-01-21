import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  QueryList,
  SimpleChanges,
  ViewChildren,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ParallaxDirective } from '../../directives/parallax.directive';

type MaskStyle = 'radial' | 'none';

type Square = {
  id: number;
  col: number;
  row: number;
};

@Component({
  selector: 'app-animated-grid-bg',
  standalone: true,
  imports: [CommonModule, ParallaxDirective],
  templateUrl: './animated-grid-bg.component.html',
  styleUrls: ['./animated-grid-bg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnimatedGridBgComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() cellWidth = 40;
  @Input() cellHeight = 40;
  @Input() x = -1;
  @Input() y = -1;
  @Input() strokeDasharray: number | string = 0;
  @Input() numSquares = 50;
  @Input() maxOpacity = 0.5;
  @Input() duration = 4;
  @Input() repeatDelay = 0.5;
  @Input() maskStyle: MaskStyle = 'radial';
  @Input() skew = true;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly patternId = `agp-${Math.random().toString(36).slice(2)}`;

  protected squares: Square[] = [];

  @ViewChildren('sq', { read: ElementRef })
  private readonly squareEls!: QueryList<ElementRef<SVGRectElement>>;

  private resizeObserver?: ResizeObserver;
  private rafPending = false;
  private animationsStarted = false;

  private containerW = 0;
  private containerH = 0;
  private cols = 0;
  private rows = 0;

  private abort = new AbortController();

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const el = this.host.nativeElement;
      this.resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;

        const { width, height } = entry.contentRect;
        this.scheduleResize(width, height);
      });

      this.resizeObserver.observe(el);

      const rect = el.getBoundingClientRect();
      this.onResize(rect.width, rect.height);

      this.zone.run(() => {
        this.rebuildSquares();
        this.cdr.markForCheck();
      });

      this.squareEls.changes.subscribe(() => {
        this.startAnimations();
      });

      requestAnimationFrame(() => {
        this.startAnimations();
      });

      this.destroyRef.onDestroy(() => {
        this.resizeObserver?.disconnect();
        this.abort.abort();
      });
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.abort.abort();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.resizeObserver) return;

    const shouldReset =
      'numSquares' in changes ||
      'cellWidth' in changes ||
      'cellHeight' in changes ||
      'duration' in changes ||
      'repeatDelay' in changes ||
      'maxOpacity' in changes;

    if (!shouldReset) return;

    this.resetAnimations();

    this.rebuildSquares();
    this.cdr.markForCheck();

    requestAnimationFrame(() => {
      this.startAnimations();
    });
  }

  protected get classes(): Record<string, boolean> {
    return {
      'mask--radial': this.maskStyle === 'radial',
      'is-skew': this.skew
    };
  }

  protected squareX(sq: Square): number {
    return sq.col * this.cellWidth + 1;
  }

  protected squareY(sq: Square): number {
    return sq.row * this.cellHeight + 1;
  }

  protected squareW(): number {
    return Math.max(1, this.cellWidth - 1);
  }

  protected squareH(): number {
    return Math.max(1, this.cellHeight - 1);
  }

  protected trackById(_: number, item: Square): number {
    return item.id;
  }

  private scheduleResize(width: number, height: number): void {
    this.containerW = width;
    this.containerH = height;

    if (this.rafPending) return;
    this.rafPending = true;

    requestAnimationFrame(() => {
      this.rafPending = false;
      this.onResize(this.containerW, this.containerH);
    });
  }

  private onResize(width: number, height: number): void {
    const w = Math.max(0, width);
    const h = Math.max(0, height);

    this.cols = this.cellWidth > 0 ? Math.max(1, Math.floor(w / this.cellWidth)) : 1;
    this.rows = this.cellHeight > 0 ? Math.max(1, Math.floor(h / this.cellHeight)) : 1;

    if (this.squares.length === 0) {
      this.zone.run(() => {
        this.rebuildSquares();
        this.cdr.markForCheck();
      });

      requestAnimationFrame(() => {
        this.startAnimations();
      });

      return;
    }

    this.squares.forEach((sq, i) => {
      const next = this.randomPos();
      sq.col = next.col;
      sq.row = next.row;
      this.applyPosToEl(i, sq);
    });
  }

  private rebuildSquares(): void {
    const count = Math.max(0, Math.floor(this.numSquares));
    this.squares = Array.from({ length: count }, (_, i) => ({
      id: i,
      ...this.randomPos()
    }));
  }

  private randomPos(): { col: number; row: number } {
    const col = this.cols ? Math.floor(Math.random() * this.cols) : 0;
    const row = this.rows ? Math.floor(Math.random() * this.rows) : 0;
    return { col, row };
  }

  private applyPosToEl(index: number, sq: Square): void {
    const el = this.squareEls?.get(index)?.nativeElement;
    if (!el) return;

    el.setAttribute('x', String(this.squareX(sq)));
    el.setAttribute('y', String(this.squareY(sq)));
  }

  private startAnimations(): void {
    if (this.animationsStarted) return;

    const els = this.squareEls?.toArray().map((r) => r.nativeElement) ?? [];
    if (els.length === 0) return;

    this.animationsStarted = true;

    els.forEach((el, index) => {
      this.runSquareLoop(index, el, this.abort.signal);
    });
  }

  private resetAnimations(): void {
    this.abort.abort();
    this.abort = new AbortController();
    this.animationsStarted = false;
  }

  private async runSquareLoop(index: number, el: SVGRectElement, signal: AbortSignal): Promise<void> {
    const perIndexDelayMs = index * 100;
    const durationMs = Math.max(0, this.duration) * 1000;
    const repeatDelayMs = Math.max(0, this.repeatDelay) * 1000;

    if (durationMs <= 0) return;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(() => {
          window.clearTimeout(t);
          resolve();
        }, ms);
      });

    await wait(perIndexDelayMs);

    while (!signal.aborted) {
      el.style.opacity = '1';
      (el.style as any).fillOpacity = '0';

      const anim = el.animate(
        [
          { fillOpacity: 0 },
          { fillOpacity: this.maxOpacity },
          { fillOpacity: 0 }
        ],
        {
          duration: durationMs,
          easing: 'ease-in-out',
          fill: 'forwards',
          iterations: 1
        }
      );

      try {
        await anim.finished;
      } catch {
        return;
      }

      if (signal.aborted) return;

      const sq = this.squares[index];
      if (sq) {
        const next = this.randomPos();
        sq.col = next.col;
        sq.row = next.row;
        this.applyPosToEl(index, sq);
      }

      if (repeatDelayMs > 0) {
        await wait(repeatDelayMs);
      }
    }
  }
}

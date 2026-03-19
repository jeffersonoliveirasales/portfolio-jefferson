import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { NgClass } from '@angular/common';

type Align = 'left' | 'center' | 'right';
type Palette = 'default' | 'subtle';

const DEFAULT_COLORS = ['#8d6869', '#5a8ea6', '#b9c96e', '#c7c571', '#cb706f', '#7e5e5f'];
const SUBTLE_COLORS = ['#90a4b8', '#6f8fa8', '#4e7da0', '#7f97ab'];

const PALETTE_COLORS: Record<Palette, string[]> = {
  default: DEFAULT_COLORS,
  subtle: SUBTLE_COLORS
};

@Component({
  selector: 'app-gradient-wave-text',
  standalone: true,
  imports: [NgClass],
  templateUrl: './gradient-wave-text.component.html',
  styleUrls: ['./gradient-wave-text.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradientWaveTextComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() align: Align = 'center';
  @Input() wrapperClass = '';
  @Input() textClass = '';

  @Input() speed = 1;
  @Input() paused = false;
  @Input() delay = 0;
  @Input() repeat = false;
  @Input() inView = false;
  @Input() once = true;

  @Input() radial = true;
  @Input() bottomOffset = 20;
  @Input() bandGap = 4;
  @Input() bandCount = 8;
  @Input() palette: Palette = 'default';
  @Input() customColors: string[] = [];

  @Input() ariaLabel = '';

  @Output() waveClick = new EventEmitter<MouseEvent>();
  @Output() waveMouseEnter = new EventEmitter<MouseEvent>();
  @Output() waveMouseLeave = new EventEmitter<MouseEvent>();

  @ViewChild('host', { static: true })
  private hostRef!: ElementRef<HTMLDivElement>;

  protected gradient = '';

  protected get justifyContent(): string {
    return this.align === 'left' ? 'flex-start' : this.align === 'right' ? 'flex-end' : 'center';
  }

  private observer?: IntersectionObserver;
  private rafId = 0;

  private t = -25;
  private cyclesDone = 0;
  private finished = false;
  private started = false;
  private startAt = 0;
  private hasPlayed = false;
  private isInView = true;

  ngAfterViewInit(): void {
    this.recomputeGradient();
    this.setGi(-25);

    if (this.inView) {
      this.isInView = false;
      this.setupInViewObserver();
    } else {
      this.isInView = true;
      this.startAnimation();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['customColors'] ||
      changes['palette'] ||
      changes['bandGap'] ||
      changes['bandCount'] ||
      changes['radial']
    ) {
      this.recomputeGradient();
    }

    if (changes['inView'] && this.hostRef) {
      this.cleanupObserver();
      this.stopAnimation(false);

      if (this.inView) {
        this.isInView = false;
        this.setupInViewObserver();
      } else {
        this.isInView = true;
        this.startAnimation();
      }
    }
  }

  ngOnDestroy(): void {
    this.cleanupObserver();
    this.stopAnimation(false);
  }

  protected handleClick(event: MouseEvent): void {
    this.waveClick.emit(event);
  }

  protected handleMouseEnter(event: MouseEvent): void {
    this.waveMouseEnter.emit(event);
  }

  protected handleMouseLeave(event: MouseEvent): void {
    this.waveMouseLeave.emit(event);
  }

  private setupInViewObserver(): void {
    const node = this.hostRef.nativeElement;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (this.once && this.hasPlayed) return;
            this.isInView = true;
            this.hasPlayed = true;
            this.startAnimation();
          } else if (!this.once) {
            this.isInView = false;
            this.stopAnimation(true);
          }
        }
      },
      { threshold: 0.1 }
    );

    this.observer.observe(node);
  }

  private cleanupObserver(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  private startAnimation(): void {
    if (!this.isInView) return;

    this.stopAnimation(false);

    this.t = -25;
    this.cyclesDone = 0;
    this.finished = false;
    this.started = false;
    this.startAt = performance.now() + Math.max(0, this.delay) * 1000;
    this.setGi(-25);

    const range = 200;
    let last = performance.now();

    const tick = (now: number) => {
      if (this.finished) return;

      if (!this.started) {
        if (now >= this.startAt) {
          this.started = true;
          last = now;
        } else {
          this.rafId = requestAnimationFrame(tick);
          return;
        }
      }

      const dt = Math.min(64, now - last);
      last = now;

      if (!this.paused) {
        const increment = (dt * this.speed) / 16.6667;
        let next = this.t + increment;

        if (this.repeat) {
          if (next >= range) next %= range;
          this.t = next;
          this.setGi(this.t);
        } else {
          while (next >= range && this.cyclesDone < 1) {
            next -= range;
            this.cyclesDone += 1;
          }

          if (this.cyclesDone >= 1) {
            this.t = range;
            this.setGi(range);
            this.finished = true;
            return;
          }

          this.t = next;
          this.setGi(this.t);
        }
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private stopAnimation(reset: boolean): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    if (reset) {
      this.t = -25;
      this.cyclesDone = 0;
      this.finished = false;
      this.started = false;
      this.setGi(-25);
    }
  }

  private setGi(value: number): void {
    this.hostRef.nativeElement.style.setProperty('--gi', String(value));
  }

  private recomputeGradient(): void {
    const colors = this.customColors.length ? this.customColors : PALETTE_COLORS[this.palette];
    const baseColor = 'var(--gradient-wave-base, rgb(229,231,235))';

    const stops: string[] = [];
    stops.push(`${baseColor} calc((var(--gi) + 0) * 1%)`);

    const limit = Math.min(this.bandCount, colors.length * 2);
    for (let i = 0; i < limit; i++) {
      const color = colors[i % colors.length];
      const offset = (i + 2) * this.bandGap;
      stops.push(`${color} calc((var(--gi) + ${offset}) * 1%)`);
    }

    const endOffset = (this.bandCount + 2) * this.bandGap;
    stops.push(`${baseColor} calc((var(--gi) + ${endOffset}) * 1%)`);

    const stopsString = stops.join(', ');
    this.gradient = this.radial
      ? `radial-gradient(circle at 50% bottom, ${stopsString})`
      : `linear-gradient(0deg, ${stopsString})`;
  }
}

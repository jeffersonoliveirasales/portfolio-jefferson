import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  NgZone,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

type IconItem = {
  slug: string;
  title: string;
  dataUri: string;
};

@Component({
  selector: 'app-icon-cloud',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon-cloud.component.html',
  styleUrl: './icon-cloud.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconCloudComponent implements AfterViewInit {
  @Input({ required: true }) iconSlugs!: string[];

  protected readonly canvasId = `icon-cloud-canvas-${Math.random().toString(36).slice(2)}`;
  protected readonly listId = `icon-cloud-list-${Math.random().toString(36).slice(2)}`;

  protected items: IconItem[] = [];

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('canvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private resizeObserver?: ResizeObserver;
  private started = false;

  private readonly options = {
    reverse: true,
    depth: 1,
    wheelZoom: false,
    imageScale: 2,
    activeCursor: 'default',
    tooltip: 'native',
    initial: [0.1, -0.1],
    clickToFront: 500,
    tooltipDelay: 0,
    outlineColour: 'transparent',
    maxSpeed: 0.04,
    minSpeed: 0.02
  };

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      void this.init();

      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
        this.tryStart();
      });

      this.resizeObserver.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());

      this.resizeCanvas();
      this.tryStart();
    });
  }

  protected preventClick(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();
  }

  private isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  private createFallbackIconDataUri(label: string): string {
    const text = (label || 'icon').slice(0, 2).toUpperCase();
    const bg = this.isDark() ? '#1f2937' : '#e5e7eb';
    const fg = this.isDark() ? '#d1d5db' : '#374151';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${bg}'/><text x='50%' y='54%' text-anchor='middle' font-family='Arial, sans-serif' font-size='20' fill='${fg}'>${text}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private async init(): Promise<void> {
    const items = await this.buildIcons();

    this.zone.run(() => {
      this.items = items;
      this.cdr.markForCheck();
    });

    if (!items.length) {
      return;
    }

    await this.waitForImages();

    requestAnimationFrame(() => {
      this.resizeCanvas();
      void this.tryStart();
    });
  }

  private async buildIcons(): Promise<IconItem[]> {
    const unique = Array.from(new Set((this.iconSlugs ?? []).map((s) => String(s).toLowerCase())));

    return unique.map((slug) => {
      const safeSlug = encodeURIComponent(slug);
      return {
        slug,
        title: slug,
        dataUri: `https://cdn.simpleicons.org/${safeSlug}`
      } satisfies IconItem;
    });
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = this.host.nativeElement.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }

  private async loadTagCanvas(): Promise<any | null> {
    const g = globalThis as any;
    if (g.TagCanvas) return g.TagCanvas;

    try {
      const mod: any = await import('tag-canvas');
      const maybe = mod?.default ?? mod?.TagCanvas ?? mod;
      if (maybe?.Start) return maybe;
      if (maybe?.TagCanvas?.Start) return maybe.TagCanvas;
      return maybe;
    } catch {
      return null;
    }
  }

  private async tryStart(): Promise<void> {
    if (this.started) return;
    if (!this.items.length) return;

    const canvas = this.canvasRef.nativeElement;
    if (!canvas.width || !canvas.height) return;

    const TagCanvas = await this.loadTagCanvas();
    if (!TagCanvas) return;

    const opts = this.prefersReducedMotion()
      ? { ...this.options, maxSpeed: 0, minSpeed: 0 }
      : this.options;

    try {
      TagCanvas.Start(this.canvasId, this.listId, opts);
      this.started = true;
    } catch {
      // ignore
    }
  }

  private async waitForImages(): Promise<void> {
    const host = this.host.nativeElement;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(() => {
          window.clearTimeout(t);
          resolve();
        }, ms);
      });

    await wait(0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const imgs = Array.from(host.querySelectorAll('img')) as HTMLImageElement[];
    if (imgs.length === 0) {
      await wait(0);
      return;
    }

    const tasks = imgs.map((img) =>
      new Promise<void>((resolve) => {
        let done = false;
        let timeoutId = 0;

        const finish = () => {
          if (done) return;
          done = true;
          if (timeoutId) {
            window.clearTimeout(timeoutId);
            timeoutId = 0;
          }
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
          resolve();
        };

        const applyFallback = () => {
          if (img.dataset['fallbackApplied'] === '1') {
            finish();
            return;
          }

          img.dataset['fallbackApplied'] = '1';
          img.src = this.createFallbackIconDataUri(img.alt || 'icon');

          if (img.complete) {
            finish();
          }
        };

        const onLoad = () => {
          finish();
        };

        const onError = () => {
          applyFallback();
        };

        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);

        timeoutId = window.setTimeout(() => {
          applyFallback();
        }, 3000);

        if (img.complete) {
          if (img.naturalWidth > 0) {
            finish();
          } else {
            applyFallback();
          }
        }
      })
    );

    await Promise.all(tasks);
  }
}

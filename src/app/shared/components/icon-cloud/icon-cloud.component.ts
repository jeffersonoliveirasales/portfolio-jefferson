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
  private readonly debug = false;

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

  private async init(): Promise<void> {
    const items = await this.buildIcons();

    this.zone.run(() => {
      this.items = items;
      this.cdr.markForCheck();
    });

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
    if (!TagCanvas) {
      return;
    }

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

    const imgs = Array.from(host.querySelectorAll('img')) as HTMLImageElement[];
    if (imgs.length === 0) {
      await wait(0);
      return;
    }

    const tasks = imgs.map((img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
          return;
        }

        const onDone = () => {
          img.removeEventListener('load', onDone);
          img.removeEventListener('error', onDone);
          resolve();
        };

        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
      })
    );

    await Promise.race([Promise.all(tasks), wait(2000)]);
  }
}

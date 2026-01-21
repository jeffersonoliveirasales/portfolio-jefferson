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
    const dark = this.isDark();
    const bgHex = dark ? '#080510' : '#f3f2ef';
    const fallbackHex = dark ? '#ffffff' : '#6e6e73';

    const iconsIndex = await this.loadSimpleIconsIndex();
    if (!iconsIndex) {
      return [];
    }

    const unique = Array.from(new Set((this.iconSlugs ?? []).map((s) => String(s).toLowerCase())));

    const missing: string[] = [];

    const built = unique
      .map((slug) => {
        const icon = iconsIndex[slug];
        if (!icon) {
          missing.push(slug);
          return null;
        }

        const path = icon.path ?? icon.svg;
        if (!path) return null;

        const svg = this.renderIconSvg(path, icon.hex ?? fallbackHex, bgHex);
        const dataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

        return {
          slug,
          title: icon.title ?? slug,
          dataUri
        } satisfies IconItem;
      })
      .filter((x): x is IconItem => Boolean(x));

    return built;
  }

  private async loadSimpleIconsIndex(): Promise<Record<string, any> | null> {
    const normalize = (mod: any): Record<string, any> | null => {
      const maybe = mod?.icons ?? mod?.default?.icons ?? mod?.default ?? mod;
      if (!maybe || typeof maybe !== 'object') return null;

      const obj = maybe as Record<string, any>;
      const values = Object.values(obj);

      const hasSlugObjects = values.some(
        (v) => v && typeof v === 'object' && typeof (v as any).slug === 'string'
      );

      if (hasSlugObjects) {
        const bySlug: Record<string, any> = {};
        values.forEach((v) => {
          const slug = v?.slug;
          if (typeof slug === 'string') bySlug[String(slug).toLowerCase()] = v;
        });
        return bySlug;
      }

      return obj;
    };

    try {
      const mod: any = await import('simple-icons');
      const normalized = normalize(mod);
      if (normalized) return normalized;
    } catch {
      // ignore
    }

    try {
      const mod: any = await import('simple-icons/icons');
      const normalized = normalize(mod);
      if (normalized) return normalized;
    } catch {
      // ignore
    }

    return null;
  }

  private renderIconSvg(pathSvg: string, iconHex: string, bgHex: string): string {
    const size = 42;
    const radius = 10;

    const safeIcon = iconHex.startsWith('#') ? iconHex : `#${iconHex}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect x="0" y="0" width="24" height="24" rx="${radius}" fill="${bgHex}" />
  <g transform="translate(2.5 2.5) scale(0.79)">
    <path d="${pathSvg}" fill="${safeIcon}" />
  </g>
</svg>`;
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

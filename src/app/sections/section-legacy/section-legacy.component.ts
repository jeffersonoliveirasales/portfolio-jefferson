import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { BentoGridComponent, BentoItem } from '../../shared/components/bento-grid/bento-grid.component';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';

@Component({
  selector: 'app-section-legacy',
  standalone: true,
  imports: [TranslateModule, BentoGridComponent, FxTitleComponent],
  templateUrl: './section-legacy.component.html',
  styleUrls: ['./section-legacy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionLegacyComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  @ViewChild('bgVideo', { static: false }) private bgVideo?: ElementRef<HTMLVideoElement>;

  protected bentoItems: BentoItem[] = [];

  constructor() {
    this.rebuildItems();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.rebuildItems());
  }

  ngAfterViewInit(): void {
    const video = this.bgVideo?.nativeElement;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.playsInline = true;
      video.controls = false;
      video.setAttribute('muted', '');

      const onVolumeChange = () => {
        if (video.volume !== 0) video.volume = 0;
        if (!video.muted) video.muted = true;
      };
      video.addEventListener('volumechange', onVolumeChange);
      this.destroyRef.onDestroy(() => video.removeEventListener('volumechange', onVolumeChange));

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

      if (prefersReducedMotion) {
        try {
          video.pause();
        } catch {
          // ignore
        }
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            if (entry.isIntersecting) {
              video.muted = true;
              video.defaultMuted = true;
              video.setAttribute('muted', '');
              video.volume = 0;
              const p = video.play();
              if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
            } else {
              try {
                video.pause();
              } catch {
                // ignore
              }
            }
          },
          { threshold: 0.15 }
        );

        io.observe(this.host.nativeElement);
        this.destroyRef.onDestroy(() => io.disconnect());
      }
    }

    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }

  private rebuildItems(): void {
    const t = (key: string) => this.translate.instant(key) as string;

    this.bentoItems = [
      {
        title: t('legacy.cards.legacyTitle'),
        description: t('legacy.cards.legacyText'),
        icon: 'clock',
        tags: ['WebForms', 'MVC', 'NHibernate', 'Knockout', 'jQuery'],
        colSpan: 1
      },
      {
        title: t('legacy.cards.strategyTitle'),
        description: t('legacy.cards.strategyText'),
        icon: 'trending-up',
        tags: ['Clean Architecture', 'DDD aplicado', 'Unit of Work'],
        colSpan: 1
      },
      {
        title: t('legacy.cards.integrationsTitle'),
        description: t('legacy.cards.integrationsText'),
        icon: 'globe',
        tags: ['GovBR', 'Sankhya', 'Microsoft Graph', 'SOAP/XML'],
        colSpan: 1
      }
    ];
  }
}

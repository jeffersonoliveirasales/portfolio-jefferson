import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { setupSectionVideo } from '../../shared/motion/section-video';
import { BentoGridComponent, BentoItem } from '../../shared/components/bento-grid/bento-grid.component';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';
import { GradientWaveTextComponent } from '../../shared/ui/gradient-wave-text/gradient-wave-text.component';
import { ParallaxDirective } from '../../shared/directives/parallax.directive';

@Component({
  selector: 'app-section-objective',
  standalone: true,
  imports: [TranslateModule, BentoGridComponent, FxTitleComponent, GradientWaveTextComponent, ParallaxDirective],
  templateUrl: './section-objective.component.html',
  styleUrls: ['./section-objective.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionObjectiveComponent implements AfterViewInit {
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
    const root = document.querySelector<HTMLElement>('[data-scroll-container]');

    if (video) {
      setupSectionVideo({
        host: this.host.nativeElement,
        video,
        destroyRef: this.destroyRef,
        root: root ?? null,
        threshold: 0.15
      });
    }

    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }

  private rebuildItems(): void {
    const t = (key: string) => this.translate.instant(key) as string;

    this.bentoItems = [
      {
        title: t('objective.cards.scalabilityTitle'),
        description: t('objective.cards.scalabilityText'),
        icon: 'trending-up',
        tags: ['CleanArchitecture', 'DDD', 'API', 'Integrações'],
        colSpan: 1
      },
      {
        title: t('objective.cards.qualityTitle'),
        description: t('objective.cards.qualityText'),
        icon: 'check-circle',
        tags: ['SonarQube', 'Testes', 'Observabilidade', 'Sentry'],
        colSpan: 1
      },
      {
        title: t('objective.cards.deliveryTitle'),
        description: t('objective.cards.deliveryText'),
        icon: 'clock',
        tags: ['AzureDevOps', 'Pipelines', 'GitFlow', 'Deploy'],
        colSpan: 1
      }
    ];
  }

}

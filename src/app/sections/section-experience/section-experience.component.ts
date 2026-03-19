import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject
} from '@angular/core';
import { signal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { ExperienceEvolutionSvgComponent } from '../../shared/ui/experience-evolution-svg/experience-evolution-svg.component';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';
import { GradientWaveTextComponent } from '../../shared/ui/gradient-wave-text/gradient-wave-text.component';

@Component({
  selector: 'app-section-experience',
  standalone: true,
  imports: [TranslateModule, FxTitleComponent, GradientWaveTextComponent, ExperienceEvolutionSvgComponent],
  templateUrl: './section-experience.component.html',
  styleUrls: ['./section-experience.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionExperienceComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly svgVisible = signal(false);

  private wasInView = false;

  private restartSvg(): void {
    this.svgVisible.set(false);
    queueMicrotask(() => this.svgVisible.set(true));
  }

  ngAfterViewInit(): void {
    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const inView = entry.isIntersecting;

        if (inView && !this.wasInView) {
          this.wasInView = true;
          if (!this.svgVisible()) {
            this.svgVisible.set(true);
          } else {
            this.restartSvg();
          }
          return;
        }

        if (!inView) {
          this.wasInView = false;
          if (this.svgVisible()) {
            this.svgVisible.set(false);
          }
        }
      },
      {
        root: root instanceof HTMLElement ? root : null,
        threshold: 0.35
      }
    );

    observer.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}

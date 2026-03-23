import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';
import { GradientWaveTextComponent } from '../../shared/ui/gradient-wave-text/gradient-wave-text.component';
import { ParallaxDirective } from '../../shared/directives/parallax.directive';

@Component({
  selector: 'app-section-objective',
  standalone: true,
  imports: [TranslateModule, FxTitleComponent, GradientWaveTextComponent, ParallaxDirective],
  templateUrl: './section-objective.component.html',
  styleUrls: ['./section-objective.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionObjectiveComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const root = document.querySelector<HTMLElement>('[data-scroll-container]');

    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }

}

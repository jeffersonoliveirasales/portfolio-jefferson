import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { StaggerTestimonialsComponent } from '../../components/stagger-testimonials/stagger-testimonials.component';
import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';

@Component({
  selector: 'app-section-projects',
  standalone: true,
  imports: [TranslateModule, StaggerTestimonialsComponent, FxTitleComponent],
  templateUrl: './section-projects.component.html',
  styleUrls: ['./section-projects.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionProjectsComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }
}

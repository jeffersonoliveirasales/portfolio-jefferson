import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { IconCloudComponent } from '../../shared/components/icon-cloud/icon-cloud.component';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';

@Component({
  selector: 'app-section-skills',
  standalone: true,
  imports: [TranslateModule, IconCloudComponent, FxTitleComponent],
  templateUrl: './section-skills.component.html',
  styleUrls: ['./section-skills.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionSkillsComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }
}

import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';

type AccordionItem = {
  id: number;
  titleKey: string;
  imageUrl: string;
};

@Component({
  selector: 'app-section-courses',
  standalone: true,
  imports: [TranslateModule, FxTitleComponent],
  templateUrl: './section-courses.component.html',
  styleUrls: ['./section-courses.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionCoursesComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected activeIndex = 4;

  protected readonly accordionItems: AccordionItem[] = [
    {
      id: 1,
      titleKey: 'courses.accordion.items.angularCrud',
      imageUrl:
        'https://miro.medium.com/v2/resize:fit:720/format:webp/0*t6TMa6MSv5TA-xHU'
    },
    {
      id: 2,
      titleKey: 'courses.accordion.items.scrum',
      imageUrl:
        'https://www.eldorado.org.br/wp-content/uploads/2023/06/shutterstock_1362102449-1.jpg'
    },
    {
      id: 3,
      titleKey: 'courses.accordion.items.efCore',
      imageUrl:
        'https://miro.medium.com/v2/resize:fit:1200/1*VZgh7tqjI6xVG_MryGwRKA.png'
    },
    {
      id: 4,
      titleKey: 'courses.accordion.items.cleanCode',
      imageUrl:
        'https://img.freepik.com/premium-photo/modern-workplace-with-laptop-showing-landing-page-doodle-design-style-with-text-clean-code-toned-image-with-selective-focus-3d-render_226262-1832.jpg?semt=ais_hybrid&w=740&q=80'
    },
    {
      id: 5,
      titleKey: 'courses.accordion.items.csharpAdvanced',
      imageUrl:
        'https://ninelabs.blog/wp-content/uploads/2024/07/C-2.png'
    }
  ];

  protected setActive(index: number): void {
    this.activeIndex = index;
  }

  protected toggleActive(index: number): void {
    this.activeIndex = index;
  }

  protected onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;

    img.src = 'https://placehold.co/400x450/2d3748/ffffff?text=Image+Error';
  }

  ngAfterViewInit(): void {
    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }
}

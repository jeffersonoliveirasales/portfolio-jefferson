import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';

type EducationItem = {
  key: string;
  titleKey: string;
  textKey: string;
  image: {
    src: string;
    alt: string;
  };
};

@Component({
  selector: 'app-section-education',
  standalone: true,
  imports: [TranslateModule, FxTitleComponent],
  templateUrl: './section-education.component.html',
  styleUrls: ['./section-education.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionEducationComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected activeIndex = 0;

  protected readonly items: EducationItem[] = [
    {
      key: 'degree',
      titleKey: 'education.cards.degreeTitle',
      textKey: 'education.cards.degreeText',
      image: {
        src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1600&auto=format&fit=crop',
        alt: 'Formação acadêmica'
      }
    },
    {
      key: 'languages',
      titleKey: 'education.cards.languagesTitle',
      textKey: 'education.cards.languagesText',
      image: {
        src: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?q=80&w=1600&auto=format&fit=crop',
        alt: 'Idiomas'
      }
    },
    {
      key: 'methods',
      titleKey: 'education.cards.methodsTitle',
      textKey: 'education.cards.methodsText',
      image: {
        src: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1600&auto=format&fit=crop',
        alt: 'Métodos de trabalho'
      }
    }
  ];

  private get container(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.edu-sticky__scroll');
  }

  protected onScroll(container: HTMLElement): void {
    const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-edu-block]'));
    if (!blocks.length) return;

    if (container.scrollTop <= 2) {
      if (this.activeIndex !== 0) this.activeIndex = 0;
      return;
    }

    const scrollBottom = container.scrollTop + container.clientHeight;
    if (scrollBottom >= container.scrollHeight - 8) {
      const lastIndex = blocks.length - 1;
      if (this.activeIndex !== lastIndex) {
        this.activeIndex = lastIndex;
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const containerMid = containerRect.top + containerRect.height * 0.5;

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    blocks.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const elMid = r.top + r.height * 0.35;
      const dist = Math.abs(containerMid - elMid);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestIndex = idx;
      }
    });

    if (bestIndex !== this.activeIndex) {
      this.activeIndex = bestIndex;
    }
  }

  protected selectIndex(evt: Event, index: number): void {
    evt.preventDefault();
    evt.stopPropagation();

    const container = this.container;
    if (!container) {
      this.activeIndex = index;
      return;
    }

    const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-edu-block]'));
    const target = blocks[index];
    if (!target) {
      this.activeIndex = index;
      return;
    }

    const top = target.offsetTop - 10;
    container.scrollTo({ top, behavior: 'smooth' });

    this.activeIndex = index;
  }

  protected onImgError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    img.src = 'https://placehold.co/800x600/0b1220/ffffff?text=Image';
  }

  ngAfterViewInit(): void {
    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });

    const container = this.container;
    if (container) this.onScroll(container);
  }
}

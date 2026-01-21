import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  private readonly cdr = inject(ChangeDetectorRef);

  protected activeIndex = 0;

  private useBodyScroll = false;

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

  private isMobileLayout(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 980px)')?.matches === true;
  }

  private updateActiveFromBlocks(blocks: HTMLElement[], containerRect: DOMRect, midFactor: number): void {
    if (!blocks.length) return;

    const containerMid = containerRect.top + containerRect.height * 0.5;

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    blocks.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const elMid = r.top + r.height * midFactor;
      const dist = Math.abs(containerMid - elMid);

      if (dist < bestDistance) {
        bestDistance = dist;
        bestIndex = idx;
      }
    });

    if (bestIndex !== this.activeIndex) {
      this.activeIndex = bestIndex;
      this.cdr.markForCheck();
    }
  }

  protected onScroll(container: HTMLElement): void {
    const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-edu-block]'));
    if (!blocks.length) return;

    if (container.scrollTop <= 2) {
      if (this.activeIndex !== 0) this.activeIndex = 0;
      this.cdr.markForCheck();
      return;
    }

    const scrollBottom = container.scrollTop + container.clientHeight;
    if (scrollBottom >= container.scrollHeight - 8) {
      const lastIndex = blocks.length - 1;
      if (this.activeIndex !== lastIndex) {
        this.activeIndex = lastIndex;
        this.cdr.markForCheck();
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    this.updateActiveFromBlocks(blocks, containerRect, 0.35);
  }

  private onWindowScroll(): void {
    const blocks = Array.from(this.host.nativeElement.querySelectorAll('[data-edu-block]')) as HTMLElement[];
    const viewportRect = { top: 0, height: window.innerHeight } as DOMRect;
    this.updateActiveFromBlocks(blocks, viewportRect, 0.35);
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

    if (this.useBodyScroll) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const top = target.offsetTop - 10;
      container.scrollTo({ top, behavior: 'smooth' });
    }

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
    if (container) {
      this.useBodyScroll = this.isMobileLayout();
      if (!this.useBodyScroll) this.onScroll(container);
    }

    if (this.useBodyScroll) {
      let rafId = 0;
      const onScroll = () => {
        if (rafId) return;
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          this.onWindowScroll();
        });
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        if (rafId) window.cancelAnimationFrame(rafId);
      });

      this.onWindowScroll();
    }
  }
}

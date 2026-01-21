import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

type ProjectCard = {
  tempId: number;
  title: string;
  meta: string;
  context: string;
  solution: string;
  result: string;
  imgSrc: string;
};

@Component({
  selector: 'app-stagger-testimonials',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './stagger-testimonials.component.html',
  styleUrl: './stagger-testimonials.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaggerTestimonialsComponent implements AfterViewInit {
  protected cardSize = 365;
  protected activeIndex = 0;

  protected cards: ReadonlyArray<ProjectCard> = [
    {
      tempId: 5,
      title: 'projects.items.angularI18n.title',
      meta: 'projects.items.angularI18n.meta',
      context: 'projects.items.angularI18n.context',
      solution: 'projects.items.angularI18n.solution',
      result: 'projects.items.angularI18n.result',
      imgSrc:
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=300&h=300&q=70'
    },
    {
      tempId: 0,
      title: 'projects.items.apis.title',
      meta: 'projects.items.apis.meta',
      context: 'projects.items.apis.context',
      solution: 'projects.items.apis.solution',
      result: 'projects.items.apis.result',
      imgSrc:
        'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=300&h=300&q=70'
    },
    {
      tempId: 1,
      title: 'projects.items.govbr.title',
      meta: 'projects.items.govbr.meta',
      context: 'projects.items.govbr.context',
      solution: 'projects.items.govbr.solution',
      result: 'projects.items.govbr.result',
      imgSrc:
        'https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=300&h=300&q=70'
    },
    {
      tempId: 2,
      title: 'projects.items.graph.title',
      meta: 'projects.items.graph.meta',
      context: 'projects.items.graph.context',
      solution: 'projects.items.graph.solution',
      result: 'projects.items.graph.result',
      imgSrc:
        'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=300&h=300&q=70'
    },
    {
      tempId: 3,
      title: 'projects.items.cicd.title',
      meta: 'projects.items.cicd.meta',
      context: 'projects.items.cicd.context',
      solution: 'projects.items.cicd.solution',
      result: 'projects.items.cicd.result',
      imgSrc:
        'https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=300&h=300&q=70'
    },
    {
      tempId: 4,
      title: 'projects.items.observability.title',
      meta: 'projects.items.observability.meta',
      context: 'projects.items.observability.context',
      solution: 'projects.items.observability.solution',
      result: 'projects.items.observability.result',
      imgSrc:
        'https://images.unsplash.com/photo-1556155092-8707de31f9c4?auto=format&fit=crop&w=300&h=300&q=70'
    }
  ];

  ngAfterViewInit(): void {
    this.updateSize();
  }

  @HostListener('window:resize')
  protected onResize(): void {
    this.updateSize();
  }

  protected move(steps: number): void {
    const len = this.cards.length;
    if (!len || !steps) return;

    this.activeIndex = (this.activeIndex + steps) % len;
    if (this.activeIndex < 0) this.activeIndex += len;
  }

  protected getPosition(index: number): number {
    const len = this.cards.length;
    if (!len) return 0;

    let pos = index - this.activeIndex;
    const half = Math.floor(len / 2);

    if (pos > half) pos -= len;
    if (pos < -half) pos += len;

    return pos;
  }

  protected isVisible(pos: number): boolean {
    return Math.abs(pos) <= 2;
  }

  protected cardStyle(i: number): Record<string, string> {
    const pos = this.getPosition(i);
    const abs = Math.abs(pos);

    const x = (this.cardSize / 1.35) * pos;
    const y = pos === 0 ? -40 : pos % 2 ? 18 : -18;
    const rot = pos === 0 ? 0 : pos > 0 ? 3 : -3;
    const scale = abs === 0 ? 1 : abs === 1 ? 0.92 : 0.84;
    const opacity = abs === 0 ? 1 : abs === 1 ? 0.72 : 0.45;
    const blur = abs === 0 ? 0 : abs === 1 ? 0 : 1;
    const z = 50 - abs;

    return {
      width: `${this.cardSize}px`,
      height: `${this.cardSize}px`,
      zIndex: `${z}`,
      opacity: `${opacity}`,
      filter: blur ? `blur(${blur}px) saturate(0.9)` : 'none',
      transform: `translate(-50%, -50%) translateX(${x}px) translateY(${y}px) rotate(${rot}deg) scale(${scale})`
    };
  }

  protected onCardClick(pos: number): void {
    if (pos === 0) return;
    this.move(pos > 0 ? 1 : -1);
  }

  protected trackById(_: number, item: ProjectCard): number {
    return item.tempId;
  }

  private updateSize(): void {
    const matches = window.matchMedia?.('(min-width: 640px)')?.matches ?? true;
    this.cardSize = matches ? 365 : 290;
  }
}

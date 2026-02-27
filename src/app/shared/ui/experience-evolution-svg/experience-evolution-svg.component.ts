import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-experience-evolution-svg',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './experience-evolution-svg.component.html',
  styleUrls: ['./experience-evolution-svg.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienceEvolutionSvgComponent {
  @ViewChild('container', { static: true }) private readonly containerRef!: ElementRef<HTMLElement>;

  protected isDragging = false;
  private pointerId: number | null = null;
  private startX = 0;
  private startScrollLeft = 0;

  protected onPointerDown(evt: PointerEvent): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    this.isDragging = true;
    this.pointerId = evt.pointerId;
    this.startX = evt.clientX;
    this.startScrollLeft = container.scrollLeft;

    container.setPointerCapture(evt.pointerId);
  }

  protected onPointerMove(evt: PointerEvent): void {
    if (!this.isDragging) return;

    const container = this.containerRef?.nativeElement;
    if (!container) return;

    evt.preventDefault();

    const dx = evt.clientX - this.startX;
    container.scrollLeft = this.startScrollLeft - dx;
  }

  protected onPointerUp(evt: PointerEvent): void {
    const container = this.containerRef?.nativeElement;

    if (this.pointerId === evt.pointerId && container) {
      try {
        container.releasePointerCapture(evt.pointerId);
      } catch {
        return;
      }
    }

    this.isDragging = false;
    this.pointerId = null;
  }
}

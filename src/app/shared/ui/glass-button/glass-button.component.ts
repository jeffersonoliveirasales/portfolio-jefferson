import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { NgClass } from '@angular/common';

type GlassButtonSize = 'sm' | 'default' | 'lg' | 'icon';

type GlassButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-glass-button',
  standalone: true,
  imports: [NgClass],
  templateUrl: './glass-button.component.html',
  styleUrls: ['./glass-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlassButtonComponent {
  @Input() size: GlassButtonSize = 'default';
  @Input() disabled = false;
  @Input() type: GlassButtonType = 'button';
  @Input() fullWidth = false;

  @Output() buttonClick = new EventEmitter<MouseEvent>();

  @ViewChild('btn', { static: true }) private btnRef!: ElementRef<HTMLButtonElement>;

  @Input() contentClass = '';
  @Input() wrapperClass = '';
  @Input() buttonClass = '';

  protected readonly sizeButtonClass: Record<GlassButtonSize, string> = {
    default: 'glass-button--default',
    sm: 'glass-button--sm',
    lg: 'glass-button--lg',
    icon: 'glass-button--icon'
  };

  protected readonly sizeTextClass: Record<GlassButtonSize, string> = {
    default: 'glass-button-text--default',
    sm: 'glass-button-text--sm',
    lg: 'glass-button-text--lg',
    icon: 'glass-button-text--icon'
  };

  protected onButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.buttonClick.emit(event);
  }

  protected onEnter(): void {
    const el = this.btnRef?.nativeElement;
    if (!el) return;
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '50%');
  }

  protected onLeave(): void {
    return;
  }

  protected onMove(event: MouseEvent): void {
    const el = this.btnRef?.nativeElement;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const x = ((event.clientX - r.left) / r.width) * 100;
    const y = ((event.clientY - r.top) / r.height) * 100;

    el.style.setProperty('--mx', `${x}%`);
    el.style.setProperty('--my', `${y}%`);
  }
}

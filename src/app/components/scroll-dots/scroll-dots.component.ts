import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-scroll-dots',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './scroll-dots.component.html',
  styleUrl: './scroll-dots.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScrollDotsComponent {
  @Input({ required: true }) sections: ReadonlyArray<{ id: string; labelKey: string }> = [];
  @Input({ required: true }) activeId: string | null = null;
  @Output() navigate = new EventEmitter<string>();
hoverId: string | null = null;

  onNavigate(id: string): void {
    this.navigate.emit(id);
  }
}

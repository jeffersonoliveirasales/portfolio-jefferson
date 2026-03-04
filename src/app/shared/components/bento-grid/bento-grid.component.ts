import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BentoIconName =
  | 'trending-up'
  | 'check-circle'
  | 'video'
  | 'globe'
  | 'clock'
  | 'star';

export interface BentoItem {
  title: string;
  description: string;
  icon: BentoIconName;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: 1 | 2;
  hasPersistentHover?: boolean;
}

export const itemsSample: BentoItem[] = [
  {
    title: 'Analytics Dashboard',
    meta: 'v2.4.1',
    description: 'Real-time metrics with AI-powered insights and predictive analytics',
    icon: 'trending-up',
    status: 'Live',
    tags: ['Statistics', 'Reports', 'AI'],
    colSpan: 2,
    hasPersistentHover: true
  },
  {
    title: 'Task Manager',
    meta: '84 completed',
    description: 'Automated workflow management with priority scheduling',
    icon: 'check-circle',
    status: 'Updated',
    tags: ['Productivity', 'Automation'],
    colSpan: 1
  },
  {
    title: 'Media Library',
    meta: '12GB used',
    description: 'Cloud storage with intelligent content processing',
    icon: 'video',
    tags: ['Storage', 'CDN'],
    colSpan: 2
  },
  {
    title: 'Global Network',
    meta: '6 regions',
    description: 'Multi-region deployment with edge computing',
    icon: 'globe',
    status: 'Beta',
    tags: ['Infrastructure', 'Edge'],
    colSpan: 1
  }
];

@Component({
  selector: 'app-bento-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bento-grid.component.html',
  styleUrls: ['./bento-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BentoGridComponent {
  @Input() items: BentoItem[] = itemsSample;
  @Input() clickable = false;

  @Output() itemClick = new EventEmitter<BentoItem>();

  protected trackByIndex = (index: number) => index;

  protected onItemClick(item: BentoItem): void {
    if (this.clickable) {
      this.itemClick.emit(item);
      return;
    }
  }

  protected statusClass(status?: string): string {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('live')) return 'bento-item__status--live';
    if (s.includes('beta')) return 'bento-item__status--beta';
    if (s.includes('updat')) return 'bento-item__status--updated';
    return '';
  }

  protected iconColorClass(name: BentoIconName): string {
    switch (name) {
      case 'trending-up':
        return 'is-blue';
      case 'check-circle':
        return 'is-emerald';
      case 'video':
        return 'is-purple';
      case 'globe':
        return 'is-sky';
      case 'clock':
        return 'is-amber';
      case 'star':
        return 'is-yellow';
    }
  }
}

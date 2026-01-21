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

  protected iconSvg(name: BentoIconName): string {
    switch (name) {
      case 'trending-up':
        return '<path d="M3 17l6-6 4 4 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 8h6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'check-circle':
        return '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01l-3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'video':
        return '<path d="M23 7l-7 5 7 5V7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/>';
      case 'globe':
        return '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2 12h20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" stroke-width="2"/>';
      case 'clock':
        return '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'star':
        return '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>';
    }
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

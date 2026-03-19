import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';

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

  protected readonly showIconCloud = signal(false);

  ngAfterViewInit(): void {
    const root = document.querySelector<HTMLElement>('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });

    const hostEl = this.host.nativeElement;
    const getVisibilityRatio = () => {
      const rect = hostEl.getBoundingClientRect();

      let viewTop = 0;
      let viewBottom = window.innerHeight || document.documentElement.clientHeight;

      if (root) {
        const rr = root.getBoundingClientRect();
        viewTop = rr.top;
        viewBottom = rr.bottom;
      }

      const visibleTop = Math.max(rect.top, viewTop);
      const visibleBottom = Math.min(rect.bottom, viewBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const baseHeight = Math.max(1, Math.min(rect.height, viewBottom - viewTop));

      return visibleHeight / baseHeight;
    };

    let wasVisible = false;
    let rafId = 0;
    let remountRaf = 0;

    const restartCloud = () => {
      this.showIconCloud.set(false);
      if (remountRaf) window.cancelAnimationFrame(remountRaf);
      remountRaf = window.requestAnimationFrame(() => {
        this.showIconCloud.set(true);
      });
    };

    const update = () => {
      const ratio = getVisibilityRatio();
      const visible = wasVisible ? ratio >= 0.08 : ratio >= 0.22;

      if (visible && !wasVisible) {
        restartCloud();
      } else if (!visible && wasVisible) {
        this.showIconCloud.set(false);
      }
      wasVisible = visible;
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    };

    const scrollTarget: EventTarget = root ?? window;
    scrollTarget.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions);
    window.addEventListener('resize', onScroll, { passive: true } as AddEventListenerOptions);

    update();
    window.requestAnimationFrame(update);

    this.destroyRef.onDestroy(() => {
      scrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
      if (remountRaf) window.cancelAnimationFrame(remountRaf);
    });
  }
}

import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal } from '@angular/core';

@Component({
  selector: 'app-back-to-top',
  standalone: true,
  templateUrl: './back-to-top.component.html',
  styleUrls: ['./back-to-top.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BackToTopComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isVisible = signal(false);

  private scroller: HTMLElement | null = null;
  private mq?: MediaQueryList;

  private navRaf = 0;
  private navRestoreTimer = 0;

  ngAfterViewInit(): void {
    this.mq = window.matchMedia('(max-width: 900px)');

    let scrollTarget: EventTarget | null = null;

    const bind = () => {
      if (scrollTarget) scrollTarget.removeEventListener('scroll', update as any);

      const container = document.querySelector<HTMLElement>('[data-scroll-container]');
      const useBodyScroll = this.mq?.matches === true || !container;

      this.scroller = useBodyScroll ? null : container;
      scrollTarget = useBodyScroll ? window : (container as EventTarget);

      scrollTarget.addEventListener('scroll', update as any, { passive: true } as AddEventListenerOptions);
      update();
    };

    const update = () => {
      if (this.scroller) {
        this.isVisible.set(this.scroller.scrollTop > 120);
      } else {
        this.isVisible.set((window.scrollY || 0) > 120);
      }
    };

    bind();

    const onMq = () => bind();
    this.mq.addEventListener?.('change', onMq);

    this.destroyRef.onDestroy(() => {
      if (scrollTarget) scrollTarget.removeEventListener('scroll', update as any);
      this.mq?.removeEventListener?.('change', onMq);

      if (this.navRaf) window.cancelAnimationFrame(this.navRaf);
      if (this.navRestoreTimer) window.clearTimeout(this.navRestoreTimer);
    });
  }

  protected scrollHome(): void {
    if (this.scroller) {
      const container = this.scroller;

      const prevSnapType = container.style.scrollSnapType;
      const prevBehavior = container.style.scrollBehavior;

      container.classList.add('is-nav-scrolling');
      container.style.scrollSnapType = 'none';
      container.style.scrollBehavior = 'auto';

      if (this.navRestoreTimer) {
        window.clearTimeout(this.navRestoreTimer);
        this.navRestoreTimer = 0;
      }

      if (this.navRaf) {
        window.cancelAnimationFrame(this.navRaf);
        this.navRaf = 0;
      }

      const startTop = container.scrollTop;
      const delta = 0 - startTop;
      const durationMs = 700;
      const startTs = performance.now();

      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTs) / durationMs);
        const eased = easeInOutCubic(t);
        container.scrollTop = startTop + delta * eased;

        if (t < 1) {
          this.navRaf = window.requestAnimationFrame(step);
          return;
        }

        this.navRaf = 0;
        container.scrollTop = 0;
        container.classList.remove('is-nav-scrolling');
        container.style.scrollSnapType = prevSnapType;
        container.style.scrollBehavior = prevBehavior;
      };

      this.navRaf = window.requestAnimationFrame(step);

      this.navRestoreTimer = window.setTimeout(() => {
        if (this.navRaf) return;
        container.classList.remove('is-nav-scrolling');
        container.style.scrollSnapType = prevSnapType;
        container.style.scrollBehavior = prevBehavior;
        this.navRestoreTimer = 0;
      }, 1600);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.isVisible()) return;
    if (e.key !== 'Home') return;
    e.preventDefault();
    this.scrollHome();
  }
}

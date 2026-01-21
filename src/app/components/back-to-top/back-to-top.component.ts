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

  ngAfterViewInit(): void {
    this.scroller = document.querySelector<HTMLElement>('[data-scroll-container]');
    if (!this.scroller) return;

    const update = () => {
      this.isVisible.set(this.scroller ? this.scroller.scrollTop > 120 : false);
    };

    this.scroller.addEventListener('scroll', update, { passive: true });
    update();

    this.destroyRef.onDestroy(() => this.scroller?.removeEventListener('scroll', update));
  }

  protected scrollHome(): void {
    if (this.scroller) {
      this.scroller.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const el = document.getElementById('home');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (!this.isVisible()) return;
    if (e.key !== 'Home') return;
    e.preventDefault();
    this.scrollHome();
  }
}

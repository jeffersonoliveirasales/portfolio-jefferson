import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';

import { GlassButtonComponent } from '../../shared/ui/glass-button/glass-button.component';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';
import { ParallaxDirective } from '../../shared/directives/parallax.directive';

import { gsap } from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-section-hero',
  standalone: true,
  imports: [TranslateModule, GlassButtonComponent, FxTitleComponent, ParallaxDirective],
  templateUrl: './section-hero.component.html',
  styleUrls: ['./section-hero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionHeroComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('bgVideo', { static: false }) private bgVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('heroVignette', { static: false }) private heroVignette?: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    const video = this.bgVideo?.nativeElement;
    const scroller = document.querySelector<HTMLElement>('[data-scroll-container]');

    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      video.playsInline = true;
      video.controls = false;
      video.setAttribute('muted', '');

      const onVolumeChange = () => {
        if (video.volume !== 0) video.volume = 0;
        if (!video.muted) video.muted = true;
      };
      video.addEventListener('volumechange', onVolumeChange);
      this.destroyRef.onDestroy(() => video.removeEventListener('volumechange', onVolumeChange));

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

      if (prefersReducedMotion) {
        try {
          video.pause();
        } catch {
          // ignore
        }
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            if (entry.isIntersecting) {
              video.muted = true;
              video.defaultMuted = true;
              video.setAttribute('muted', '');
              video.volume = 0;
              const p = video.play();
              if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
            } else {
              try {
                video.pause();
              } catch {
                // ignore
              }
            }
          },
          { threshold: 0.15 }
        );

        io.observe(this.host.nativeElement);
        this.destroyRef.onDestroy(() => io.disconnect());
      }
    }

    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root: scroller });

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

    if (!prefersReducedMotion) {
      const vignette = this.heroVignette?.nativeElement;
      if (vignette) {
        const tween = gsap.to(vignette, {
          opacity: 0.25,
          ease: 'none',
          scrollTrigger: {
            trigger: this.host.nativeElement,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            scroller: scroller ?? undefined
          }
        });

        this.destroyRef.onDestroy(() => {
          tween.scrollTrigger?.kill();
          tween.kill();
        });
      }

      if (video) {
        const tween2 = gsap.to(video, {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: this.host.nativeElement,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            scroller: scroller ?? undefined
          }
        });

        this.destroyRef.onDestroy(() => {
          tween2.scrollTrigger?.kill();
          tween2.kill();
        });
      }

      if (scroller) {
        ScrollTrigger.refresh();
      }
    }
  }

  protected scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

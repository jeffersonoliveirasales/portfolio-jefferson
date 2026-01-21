import { DestroyRef } from '@angular/core';
import { gsap } from 'gsap';

export type RevealOptions = {
  root?: Element | null;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

export function setupGsapReveal(
  el: HTMLElement,
  destroyRef: DestroyRef,
  options: RevealOptions = {}
): void {
  if (prefersReducedMotion()) return;

  const resolveRoot = (candidate: Element | null | undefined): Element | null => {
    if (!candidate) return null;
    if (!(candidate instanceof HTMLElement)) return candidate;

    const style = window.getComputedStyle(candidate);
    const overflowY = style.overflowY;
    const canScroll = overflowY === 'auto' || overflowY === 'scroll';
    if (!canScroll) return null;
    if (candidate.scrollHeight <= candidate.clientHeight) return null;
    return candidate;
  };

  const root = resolveRoot(options.root ?? null);

  const targets = el.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  const tl = gsap.timeline({ paused: true });
  gsap.set(targets, { autoAlpha: 0, y: 18 });
  tl.fromTo(
    targets,
    { autoAlpha: 0, y: 18 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      stagger: 0.06
    }
  );

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (entry.isIntersecting) {
        tl.restart(true);
      } else {
        tl.pause(0);
        gsap.set(targets, { autoAlpha: 0, y: 18 });
      }
    },
    { root, threshold: [0.12, 0.22] }
  );

  observer.observe(el);
  destroyRef.onDestroy(() => observer.disconnect());
}

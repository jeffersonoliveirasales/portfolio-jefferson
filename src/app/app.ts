import { AfterViewInit, Component, DestroyRef, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { BackToTopComponent } from './components/back-to-top/back-to-top.component';
import { LanguageToggleComponent } from './components/language-toggle/language-toggle.component';
import { ScrollDotsComponent } from './components/scroll-dots/scroll-dots.component';
import { AnimatedGridBgComponent } from './shared/components/animated-grid-bg/animated-grid-bg.component';
import { Scroll3DComponent } from './shared/ui/scroll-3d/scroll-3d.component';
import { SectionAboutComponent } from './sections/section-about/section-about.component';
import { SectionContactComponent } from './sections/section-contact/section-contact.component';
import { SectionCoursesComponent } from './sections/section-courses/section-courses.component';
import { SectionEducationComponent } from './sections/section-education/section-education.component';
import { SectionExperienceComponent } from './sections/section-experience/section-experience.component';
import { SectionHeroComponent } from './sections/section-hero/section-hero.component';
import { SectionLegacyComponent } from './sections/section-legacy/section-legacy.component';
import { SectionObjectiveComponent } from './sections/section-objective/section-objective.component';
import { SectionProjectsComponent } from './sections/section-projects/section-projects.component';
import { SectionSkillsComponent } from './sections/section-skills/section-skills.component';

@Component({
  selector: 'app-root',
  imports: [
    AnimatedGridBgComponent,
    LanguageToggleComponent,
    BackToTopComponent,
    ScrollDotsComponent,
    Scroll3DComponent,
    SectionHeroComponent,
    SectionObjectiveComponent,
    SectionAboutComponent,
    SectionLegacyComponent,
    SectionProjectsComponent,
    SectionExperienceComponent,
    SectionEducationComponent,
    SectionCoursesComponent,
    SectionSkillsComponent,
    SectionContactComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  private navRaf = 0;
  private navRestoreTimer = 0;

  protected readonly sections = [
    { id: 'home', labelKey: 'nav.home' },
    { id: 'objetivo', labelKey: 'nav.objective' },
    { id: 'sobre', labelKey: 'nav.about' },
    { id: 'legado', labelKey: 'nav.legacy' },
    { id: 'projetos', labelKey: 'nav.projects' },
    { id: 'experiencia', labelKey: 'nav.experience' },
    { id: 'formacao', labelKey: 'nav.education' },
    { id: 'cursos', labelKey: 'nav.courses' },
    { id: 'skills', labelKey: 'nav.skills' },
    { id: 'contato', labelKey: 'nav.contact' }
  ] as const;

  protected readonly activeSectionId = signal<(typeof this.sections)[number]['id']>('home');

  constructor() {
    this.translate.addLangs(['pt', 'en']);
    this.translate.setDefaultLang('pt');

    const stored = this.safeGetStoredLang();
    const browser = this.translate.getBrowserLang();
    const initial = (stored ?? browser ?? 'pt').toLowerCase();
    const lang = initial.startsWith('en') ? 'en' : 'pt';

    this.translate.use(lang);
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
  }

  private safeGetStoredLang(): string | null {
    try {
      return localStorage.getItem('lang');
    } catch {
      return null;
    }
  }

  ngAfterViewInit(): void {
    const container = document.querySelector<HTMLElement>('[data-scroll-container]');
    const sectionEls = Array.from(
      document.querySelectorAll<HTMLElement>('[data-section]')
    );

    if (!container || sectionEls.length === 0) return;

    const isContainerScrollable = () => {
      const style = window.getComputedStyle(container);
      const overflowY = style.overflowY;
      const canScroll = overflowY === 'auto' || overflowY === 'scroll';
      return canScroll && container.scrollHeight > container.clientHeight;
    };

    const useBodyScroll = !isContainerScrollable();
    const root: Element | null = useBodyScroll ? null : container;

    const updateActive = () => {
      const containerRect = root
        ? (root as HTMLElement).getBoundingClientRect()
        : ({ top: 0, bottom: window.innerHeight, height: window.innerHeight } as DOMRect);

      const visible = sectionEls
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > containerRect.top && rect.top < containerRect.bottom);

      if (visible.length === 0) return;

      const closest = useBodyScroll
        ? visible
            .map(({ el, rect }) => ({
              el,
              dist: Math.abs(rect.top)
            }))
            .sort((a, b) => a.dist - b.dist)[0]
        : (() => {
            const centerY = containerRect.top + containerRect.height / 2;
            return visible
              .map(({ el, rect }) => ({
                el,
                dist: Math.abs(rect.top + rect.height / 2 - centerY)
              }))
              .sort((a, b) => a.dist - b.dist)[0];
          })();

      const id = closest?.el.getAttribute('id') as (typeof this.sections)[number]['id'] | null;
      if (id) this.activeSectionId.set(id);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) updateActive();
      },
      {
        root,
        threshold: [0.15, 0.35, 0.55, 0.75]
      }
    );

    for (const el of sectionEls) observer.observe(el);

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        updateActive();
      });
    };

    const scrollTarget: EventTarget = useBodyScroll ? window : container;
    scrollTarget.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions);

    updateActive();

    window.requestAnimationFrame(() => updateActive());
    window.setTimeout(() => updateActive(), 120);

    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      scrollTarget.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    });
  }

  protected scrollTo(id: string): void {
    const validIds = this.sections.map((s) => s.id) as ReadonlyArray<string>;
    if (!validIds.includes(id)) {
      return;
    }

    const rawEl = document.getElementById(id);
    if (!rawEl) {
      return;
    }

    const targetEl = (rawEl.closest?.('[data-section]') as HTMLElement | null) ?? rawEl;

    const container = document.querySelector<HTMLElement>('[data-scroll-container]');
    const useBodyScroll = window.matchMedia('(max-width: 900px)').matches || !container;

    if (useBodyScroll) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elRect = targetEl.getBoundingClientRect();
    const topByOffset = targetEl.offsetTop;
    const topByRect = elRect.top - containerRect.top + container.scrollTop;
    const top = Number.isFinite(topByOffset) && topByOffset >= 0 ? topByOffset : topByRect;

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

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
    const delta = top - startTop;
    const durationMs = 700;
    const startTs = performance.now();

    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const step = (now: number) => {
      const t = Math.min(1, (now - startTs) / durationMs);
      const eased = easeInOutCubic(t);
      container.scrollTop = startTop + delta * eased;

      if (t < 1) {
        this.navRaf = window.requestAnimationFrame(step);
        return;
      }

      this.navRaf = 0;
      container.scrollTop = top;

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
  }
}

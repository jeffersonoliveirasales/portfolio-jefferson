import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';

type ExperienceItem = {
  key: string;
  whenKey: string;
  titleKey: string;
  textKey: string;
  chips: string[];
};

@Component({
  selector: 'app-section-experience',
  standalone: true,
  imports: [TranslateModule, FxTitleComponent],
  templateUrl: './section-experience.component.html',
  styleUrls: ['./section-experience.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionExperienceComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly items: ExperienceItem[] = [
    {
      key: 'ccaa',
      whenKey: 'experience.items.ccaa.when',
      titleKey: 'experience.items.ccaa.title',
      textKey: 'experience.items.ccaa.text',
      chips: ['.NET', 'Angular', 'Azure DevOps', 'GitFlow']
    },
    {
      key: 'g4f',
      whenKey: 'experience.items.g4f.when',
      titleKey: 'experience.items.g4f.title',
      textKey: 'experience.items.g4f.text',
      chips: ['C#', 'Web API', 'Angular', 'SQL Server']
    },
    {
      key: 'mercanet',
      whenKey: 'experience.items.mercanet.when',
      titleKey: 'experience.items.mercanet.title',
      textKey: 'experience.items.mercanet.text',
      chips: ['Legado', 'Modernização', 'Observabilidade', 'SQL Server/Oracle']
    },
    {
      key: 'brq',
      whenKey: 'experience.items.brq.when',
      titleKey: 'experience.items.brq.title',
      textKey: 'experience.items.brq.text',
      chips: ['C#', 'SQL Server', 'WebForms', 'Web API']
    },
    {
      key: 'quality',
      whenKey: 'experience.items.quality.when',
      titleKey: 'experience.items.quality.title',
      textKey: 'experience.items.quality.text',
      chips: ['C#', 'MVC', 'Oracle']
    },
    {
      key: 'tivit',
      whenKey: 'experience.items.tivit.when',
      titleKey: 'experience.items.tivit.title',
      textKey: 'experience.items.tivit.text',
      chips: ['ASP.NET', 'Oracle', 'Java (Android)']
    },
    {
      key: 'ctis',
      whenKey: 'experience.items.ctis.when',
      titleKey: 'experience.items.ctis.title',
      textKey: 'experience.items.ctis.text',
      chips: ['C#', '.NET', 'SQL Server']
    },
    {
      key: 'confitec',
      whenKey: 'experience.items.confitec.when',
      titleKey: 'experience.items.confitec.title',
      textKey: 'experience.items.confitec.text',
      chips: ['WebForms', 'SQL Server', 'Stored Procedures', 'Tuning']
    }
  ];

  protected openKey: string | null = 'ccaa';

  protected toggle(key: string): void {
    this.openKey = this.openKey === key ? null : key;
  }

  protected isOpen(key: string): boolean {
    return this.openKey === key;
  }

  protected onKeyToggle(evt: KeyboardEvent, key: string): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      this.toggle(key);
    }
  }

  ngAfterViewInit(): void {
    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }
}

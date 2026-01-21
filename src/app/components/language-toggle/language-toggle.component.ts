import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type Lang = 'pt' | 'en';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './language-toggle.component.html',
  styleUrls: ['./language-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageToggleComponent {
  constructor(private readonly translate: TranslateService) {}

  get currentLang(): Lang {
    const v = (this.translate.currentLang || this.translate.defaultLang || 'pt') as Lang;
    return v === 'en' ? 'en' : 'pt';
  }

  setLang(lang: Lang): void {
    if (this.currentLang === lang) return;

    this.translate.use(lang);

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';

    try {
      localStorage.setItem('lang', lang);
    } catch {
      // ignore
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;

    e.preventDefault();
    const next: Lang = e.key === 'ArrowLeft' || e.key === 'Home' ? 'pt' : 'en';
    this.setLang(next);

    const id = next === 'pt' ? 'lang-pt' : 'lang-en';
    (document.getElementById(id) as HTMLButtonElement | null)?.focus();
  }
}

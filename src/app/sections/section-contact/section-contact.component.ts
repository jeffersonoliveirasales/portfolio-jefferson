import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { setupGsapReveal } from '../../shared/motion/gsap-reveal';

import { GlassButtonComponent } from '../../shared/ui/glass-button/glass-button.component';
import { FxTitleComponent } from '../../shared/ui/title-h1/fx-title.component';
import { CvGateModalComponent } from '../../shared/ui/cv-gate-modal/cv-gate-modal.component';

@Component({
  selector: 'app-section-contact',
  standalone: true,
  imports: [TranslateModule, GlassButtonComponent, FxTitleComponent, CvGateModalComponent],
  templateUrl: './section-contact.component.html',
  styleUrls: ['./section-contact.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionContactComponent implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly whatsappNumber = '+5521981066188';
  protected readonly whatsappMessage =
    'Olá Jefferson! Vi seu portfólio e gostaria de conversar sobre uma oportunidade.';

  protected readonly email = 'jeffersonoliveirasales@gmail.com';
  protected readonly linkedinUrl = 'https://www.linkedin.com/in/jeffersonoliveirasales/';
  protected readonly locationLine1 = 'Niterói - RJ';
  protected readonly locationLine2 = 'Remoto • Brasil / Global';

  protected readonly cvPath = 'assets/docs/Jefferson-Oliveira-Sales-CV.pdf';
  protected readonly cvFileName = 'Jefferson-Oliveira-Sales-CV.pdf';
  protected readonly cvGateOpen = signal(false);
  protected readonly cvGateCode = 'JS-2026';

  protected readonly toast = signal<string | null>(null);

  ngAfterViewInit(): void {
    const root = document.querySelector('[data-scroll-container]');
    setupGsapReveal(this.host.nativeElement, this.destroyRef, { root });
  }

  protected get whatsappUrl(): string {
    const digits = this.whatsappNumber.replace(/\D/g, '');
    const text = encodeURIComponent(this.whatsappMessage);
    return `https://wa.me/${digits}?text=${text}`;
  }

  protected get whatsappNumberMasked(): string {
    const digits = this.whatsappNumber.replace(/\D/g, '');
    const country = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    const part1 = rest.slice(0, 5);
    const part2 = rest.slice(5, 9);

    if (!country || !ddd || rest.length < 8) return this.whatsappNumber;
    return `+${country} (${ddd}) ${part1}-${part2}`;
  }

  protected get mailtoUrl(): string {
    return `mailto:${this.email}`;
  }

  protected get cvUrl(): string {
    return encodeURI(this.cvPath);
  }

  protected openCvGate(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cvGateOpen.set(true);
  }

  protected onCvGateClosed(): void {
    this.cvGateOpen.set(false);
  }

  protected onCvDownloaded(): void {
    this.cvGateOpen.set(false);
    this.toast.set('downloaded');
    window.setTimeout(() => this.toast.set(null), 1600);
  }

  protected get linkedinQrUrl(): string {
    const data = encodeURIComponent(this.linkedinUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${data}`;
  }

  protected copy(text: string): void {
    const showToast = (msg: string) => {
      this.toast.set(msg);
      window.setTimeout(() => this.toast.set(null), 1600);
    };

    if (!navigator?.clipboard?.writeText) {
      showToast('copied');
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => showToast('copied'))
      .catch(() => showToast('copied'));
  }

  protected openExternal(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }
}

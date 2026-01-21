import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

type GateState = 'idle' | 'checking' | 'error' | 'success';

@Component({
  selector: 'app-cv-gate-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './cv-gate-modal.component.html',
  styleUrls: ['./cv-gate-modal.component.scss'],
})
export class CvGateModalComponent implements OnChanges {
  @Input({ required: true }) open = false;

  /** Onde está seu CV (ex: assets/cv/Jefferson-Sales-CV.pdf) */
  @Input({ required: true }) fileUrl = '';

  /** Nome do arquivo ao baixar */
  @Input() fileName = 'Jefferson-Sales-CV.pdf';

  /**
   * Código "guardado no front".
   * Melhor: passar isso via environment.ts, e aqui receber do pai.
   */
  @Input({ required: true }) validCode = '';

  @Output() closed = new EventEmitter<void>();
  @Output() downloaded = new EventEmitter<void>();

  @ViewChild('codeInput') codeInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dialog') dialog?: ElementRef<HTMLElement>;

  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private placeholderNode: Comment | null = null;
  private portaled = false;

  code = signal('');
  state = signal<GateState>('idle');
  shake = signal(false);
  showHint = signal(false);

  canSubmit = computed(() => {
    const trimmed = this.code().trim();
    return trimmed.length >= 4 && this.state() !== 'checking' && this.state() !== 'success';
  });

  titleKey = computed(() => {
    switch (this.state()) {
      case 'error':
        return 'cvGate.title.error';
      case 'success':
        return 'cvGate.title.success';
      default:
        return 'cvGate.title.idle';
    }
  });

  protected onCodeChange(v: string): void {
    this.code.set(v ?? '');
    if (this.state() !== 'checking' && this.state() !== 'success') this.state.set('idle');
  }

  subtitleKey = computed(() => {
    switch (this.state()) {
      case 'error':
        return 'cvGate.subtitle.error';
      case 'success':
        return 'cvGate.subtitle.success';
      default:
        return 'cvGate.subtitle.idle';
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.ensurePortal(false);
      this.toggleScrollLock(false);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('open' in changes)) return;

    this.ensurePortal(this.open);
    this.toggleScrollLock(this.open);
    if (!this.open) return;

    this.state.set('idle');
    this.code.set('');
    this.showHint.set(false);
    queueMicrotask(() => this.codeInput?.nativeElement?.focus());
  }

  close() {
    if (this.state() === 'checking') return;
    this.open = false;
    this.ensurePortal(false);
    this.toggleScrollLock(false);
    this.closed.emit();
  }

  async validateAndDownload() {
    if (!this.canSubmit()) return;

    this.state.set('checking');

    // Pequeno delay para sensação de “verificação”
    await this.sleep(450);

    const ok = this.code().trim() === (this.validCode ?? '').trim();

    if (!ok) {
      this.state.set('error');
      this.triggerShake();
      this.showHint.set(true);
      this.codeInput?.nativeElement?.select();
      return;
    }

    this.state.set('success');

    // dispara download
    this.forceDownload(this.fileUrl, this.fileName);

    await this.sleep(600);
    this.downloaded.emit();
    this.close();
  }

  private forceDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private triggerShake() {
    this.shake.set(true);
    setTimeout(() => this.shake.set(false), 520);
  }

  private sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  // Esc fecha
  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open) this.close();
  }

  // Enter valida
  @HostListener('document:keydown.enter')
  onEnter() {
    if (!this.open) return;

    // evita validar se estiver em algum botão fora do modal
    const active = document.activeElement as HTMLElement | null;
    const insideDialog = !!active && !!this.dialog?.nativeElement?.contains(active);
    if (insideDialog) this.validateAndDownload();
  }

  private toggleScrollLock(locked: boolean): void {
    const el = document.querySelector<HTMLElement>('[data-scroll-container]');
    if (!el) return;
    el.classList.toggle('cv-modal-lock', locked);
  }

  private ensurePortal(open: boolean): void {
    const hostEl = this.hostEl?.nativeElement;
    if (!hostEl) return;

    if (open) {
      if (this.portaled) return;
      const parent = hostEl.parentNode;
      if (!parent) return;

      this.placeholderNode = document.createComment('cv-gate-modal-placeholder');
      parent.insertBefore(this.placeholderNode, hostEl);
      document.body.appendChild(hostEl);
      this.portaled = true;
      return;
    }

    if (!this.portaled) return;
    if (!this.placeholderNode) return;

    const parent = this.placeholderNode.parentNode;
    if (!parent) return;
    parent.insertBefore(hostEl, this.placeholderNode);
    parent.removeChild(this.placeholderNode);
    this.placeholderNode = null;
    this.portaled = false;
  }
}

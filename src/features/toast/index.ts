import { eventBus } from '../../shared/event-bus';
import { $ } from '../../shared/dom';

export class ToastManager {
  private toastEl: HTMLElement | null = null;
  private timeoutId: number | null = null;

  constructor() {
    try {
      this.toastEl = $('#toast');
      this.init();
    } catch {
      this.toastEl = null;
    }
  }

  private init(): void {
    eventBus.on('picks:toast', (message: string) => {
      this.show(message);
    });
  }

  public show(message: string): void {
    if (!this.toastEl) return;

    // Clear active timeouts
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }

    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');

    // Force reflow
    void this.toastEl.offsetWidth;

    this.toastEl.classList.add('show');

    this.timeoutId = window.setTimeout(() => {
      if (this.toastEl) {
        this.toastEl.classList.remove('show');
        this.timeoutId = window.setTimeout(() => {
          this.toastEl?.classList.add('hidden');
        }, 300);
      }
    }, 3500);
  }
}

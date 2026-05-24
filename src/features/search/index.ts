import { eventBus } from '../../shared/event-bus';
import { $ } from '../../shared/dom';

export class SearchManager {
  private searchInput: HTMLInputElement | null = null;

  constructor() {
    try {
      this.searchInput = $('#search-input') as HTMLInputElement;
      this.init();
    } catch {
      this.searchInput = null;
    }
  }

  private init(): void {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      eventBus.emit('search:change', target.value);
    });

    // Listen to external reset events
    eventBus.on('search:reset', () => {
      if (this.searchInput) {
        this.searchInput.value = '';
      }
    });
  }
}

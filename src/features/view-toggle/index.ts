import { eventBus } from '../../shared/event-bus';
import { $ } from '../../shared/dom';

export class ViewToggleManager {
  private btnViewList: HTMLElement | null = null;
  private btnViewGrid: HTMLElement | null = null;
  private currentMode: 'list' | 'grid' = 'list';

  constructor() {
    try {
      this.btnViewList = $('#btn-view-list');
      this.btnViewGrid = $('#btn-view-grid');
      this.init();
    } catch {
      this.btnViewList = null;
      this.btnViewGrid = null;
    }
  }

  private init(): void {
    if (!this.btnViewList || !this.btnViewGrid) return;

    this.btnViewList.addEventListener('click', () => this.setViewMode('list'));
    this.btnViewGrid.addEventListener('click', () => this.setViewMode('grid'));
  }

  private setViewMode(mode: 'list' | 'grid'): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    if (!this.btnViewList || !this.btnViewGrid) return;

    if (mode === 'list') {
      this.btnViewList.classList.add('active');
      this.btnViewGrid.classList.remove('active');
    } else {
      this.btnViewGrid.classList.add('active');
      this.btnViewList.classList.remove('active');
    }

    eventBus.emit('viewMode:change', mode);
  }
}

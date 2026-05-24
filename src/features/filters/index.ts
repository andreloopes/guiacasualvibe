import { eventBus } from '../../shared/event-bus';
import { $, $$ } from '../../shared/dom';

export class FiltersManager {
  private filterPanelsContainer: HTMLElement | null = null;
  private activeFilters: Record<string, string[]> = {
    city: [],
    cuisine: [],
    price: [],
    status: [],
  };

  constructor() {
    try {
      this.filterPanelsContainer = $('#filter-panels-container');
      this.init();
    } catch {
      this.filterPanelsContainer = null;
    }
  }

  private init(): void {
    if (!this.filterPanelsContainer) return;

    // Dropdown toggle triggers
    document.querySelectorAll('.filter-dropdown-trigger').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const filterType = trigger.getAttribute('data-filter');
        if (!filterType) return;

        const panel = document.getElementById(`panel-${filterType}`);
        if (!panel) return;

        const isActive = panel.classList.contains('active');

        // Close all
        document.querySelectorAll('.filter-panel').forEach((p) => p.classList.remove('active'));
        document
          .querySelectorAll('.filter-dropdown-trigger')
          .forEach((t) => t.classList.remove('active'));

        if (!isActive && this.filterPanelsContainer) {
          this.filterPanelsContainer.classList.remove('container-hidden');
          panel.classList.add('active');
          trigger.classList.add('active');
        } else {
          this.filterPanelsContainer?.classList.add('container-hidden');
        }
      });
    });

    // Close on clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        this.filterPanelsContainer &&
        !this.filterPanelsContainer.contains(target) &&
        !target.classList.contains('filter-dropdown-trigger') &&
        !target.closest('.filter-dropdown-trigger')
      ) {
        this.filterPanelsContainer.classList.add('container-hidden');
        document.querySelectorAll('.filter-panel').forEach((p) => p.classList.remove('active'));
        document
          .querySelectorAll('.filter-dropdown-trigger')
          .forEach((t) => t.classList.remove('active'));
      }
    });

    // Handle checkbook selections inside panel
    this.filterPanelsContainer.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.type === 'checkbox') {
        const panel = target.closest('.filter-panel');
        const filterType = target.getAttribute('data-filter') || panel?.getAttribute('data-filter');
        if (!filterType) return;

        const val = target.value;
        if (target.checked) {
          if (!this.activeFilters[filterType]?.includes(val)) {
            this.activeFilters[filterType]?.push(val);
          }
        } else {
          if (this.activeFilters[filterType]) {
            this.activeFilters[filterType] = this.activeFilters[filterType]!.filter(
              (x) => x !== val
            );
          }
        }

        this.dispatchFilterChange();
      }
    });

    // "Todas / Todos" buttons
    document.querySelectorAll('.select-all-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetType = btn.getAttribute('data-target');
        if (!targetType) return;

        this.activeFilters[targetType] = [];

        // Uncheck checkboxes for that category
        $$<HTMLInputElement>(`#panel-${targetType} input[type="checkbox"]`).forEach((cb) => {
          cb.checked = false;
        });

        this.dispatchFilterChange();
      });
    });

    // Event listeners for external removals (like tag clicks)
    eventBus.on('filter:remove-tag', ({ type, value }: { type: string; value: string }) => {
      if (this.activeFilters[type]) {
        this.activeFilters[type] = this.activeFilters[type]!.filter((x) => x !== value);

        // Find and uncheck checkbox
        const cb = document.querySelector<HTMLInputElement>(
          `#panel-${type} input[value="${value}"]`
        );
        if (cb) cb.checked = false;

        this.dispatchFilterChange();
      }
    });

    eventBus.on('filter:reset-all', () => {
      this.resetAllFilters();
    });
  }

  public populateOptions(uniqueCities: string[], uniqueCuisines: string[]): void {
    const cityContainer = document.getElementById('options-city');
    const cuisineContainer = document.getElementById('options-cuisine');

    if (cityContainer) {
      cityContainer.innerHTML = uniqueCities
        .map(
          (city) => `
        <label class="option-item">
          <input type="checkbox" value="${city}" data-filter="city">
          <span class="option-label">${city}</span>
        </label>
      `
        )
        .join('');
    }

    if (cuisineContainer) {
      cuisineContainer.innerHTML = uniqueCuisines
        .map(
          (cuisine) => `
        <label class="option-item">
          <input type="checkbox" value="${cuisine}" data-filter="cuisine">
          <span class="option-label">${cuisine}</span>
        </label>
      `
        )
        .join('');
    }
  }

  private resetAllFilters(): void {
    this.activeFilters = {
      city: [],
      cuisine: [],
      price: [],
      status: [],
    };

    $$<HTMLInputElement>('.filter-panel input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });

    this.dispatchFilterChange();
  }

  private dispatchFilterChange(): void {
    eventBus.emit('filter:change', this.activeFilters);
  }
}

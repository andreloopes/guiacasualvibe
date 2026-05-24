import { eventBus } from '../../shared/event-bus';
import { $, $$ } from '../../shared/dom';
import { Restaurant } from '../../domain/restaurant';
import { truncateText } from '../../shared/formatters';

export class RestaurantListManager {
  private containerEl: HTMLElement | null = null;
  private emptyStateEl: HTMLElement | null = null;
  private restaurants: Restaurant[] = [];
  private filteredRestaurants: Restaurant[] = [];
  private myPicks: Record<string, 'visited' | 'wantToGo'> = {};
  private viewMode: 'list' | 'grid' = 'list';

  constructor() {
    try {
      this.containerEl = $('#restaurants-container');
      this.emptyStateEl = $('#empty-state');
      this.init();
    } catch {
      this.containerEl = null;
      this.emptyStateEl = null;
    }
  }

  private init(): void {
    if (!this.containerEl) return;

    // Listen to changes in state/rendering
    eventBus.on(
      'restaurants:render',
      ({
        filteredRestaurants,
        restaurants,
        viewMode,
        myPicks,
      }: {
        filteredRestaurants: Restaurant[];
        restaurants: Restaurant[];
        viewMode: 'list' | 'grid';
        myPicks: Record<string, 'visited' | 'wantToGo'>;
      }) => {
        this.filteredRestaurants = filteredRestaurants;
        this.restaurants = restaurants;
        this.viewMode = viewMode;
        this.myPicks = myPicks;
        this.render();
      }
    );

    // Listen to pick updates to sync checkboxes without full re-render
    eventBus.on(
      'picks:update',
      ({ myPicks }: { myPicks: Record<string, 'visited' | 'wantToGo'> }) => {
        this.myPicks = myPicks;
        this.updateCheckboxStates();
      }
    );

    // Event delegation on container
    this.containerEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // 1. "Leia mais" / "Leia menos" button click
      const readMoreBtn = target.closest('.read-more-btn');
      if (readMoreBtn) {
        e.preventDefault();
        e.stopPropagation();
        const rankStr = readMoreBtn.getAttribute('data-rank');
        if (rankStr) {
          this.handleToggleReadMore(parseInt(rankStr), readMoreBtn as HTMLElement);
        }
        return;
      }

      // 2. Grid card click to open details modal (only in grid view)
      if (this.viewMode === 'grid') {
        const gridCard = target.closest('.grid-card');
        if (gridCard) {
          // Ignore clicks inside checkbox panel or links
          if (target.closest('.grid-card-checks') || target.closest('a')) {
            return;
          }
          const rankStr = gridCard.getAttribute('data-rank');
          if (rankStr) {
            const rank = parseInt(rankStr);
            eventBus.emit('restaurant:select', {
              rank,
              restaurants: this.restaurants,
              myPicks: this.myPicks,
            });
          }
        }
      }
    });

    // Handle checkbox change requests using event delegation
    this.containerEl.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.type === 'checkbox') {
        const isVisited = target.classList.contains('cb-visited');
        const isWant = target.classList.contains('cb-want');

        if (isVisited || isWant) {
          e.stopPropagation();
          const control = target.closest('.checkbox-control');
          const rankStr = control?.getAttribute('data-rank');
          if (rankStr) {
            const rank = parseInt(rankStr);
            const type = isVisited ? 'visited' : 'wantToGo';
            eventBus.emit('picks:change-request', { rank, type, checked: target.checked });
          }
        }
      }
    });
  }

  private render(): void {
    if (!this.containerEl || !this.emptyStateEl) return;

    if (this.filteredRestaurants.length === 0) {
      this.containerEl.classList.add('hidden');
      this.emptyStateEl.classList.remove('hidden');
      return;
    }

    this.containerEl.classList.remove('hidden');
    this.emptyStateEl.classList.add('hidden');

    if (this.viewMode === 'list') {
      this.containerEl.className = 'view-list';
      this.containerEl.innerHTML = this.filteredRestaurants
        .map((r, index) => this.renderListItemHTML(r, index === 0))
        .join('');
    } else {
      this.containerEl.className = 'view-grid';
      this.containerEl.innerHTML = this.filteredRestaurants
        .map((r, index) => this.renderGridItemHTML(r, index === 0))
        .join('');
    }
  }

  private renderListItemHTML(r: Restaurant, isFirst: boolean): string {
    const selection = this.myPicks[r.rank.toString()];
    const isVisited = selection === 'visited';
    const isWant = selection === 'wantToGo';

    const votesHTML = r.votes ? `<span class="item-votes-badge">${r.votes} votos</span>` : '';
    const priceSymbol = r.price || '$$$';

    // Optimize image loading: priority high on first card, lazy loading on subsequent
    const imgAttrs = isFirst ? 'fetchpriority="high"' : 'loading="lazy"';

    const truncateResult = truncateText(r.description, 350);

    return `
      <article class="list-item" id="resto-item-${r.rank}-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}" data-rank="${r.rank}" style="view-transition-name: resto-card-${r.rank}-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}">
        <!-- Left Column: Restaurant Info -->
        <div class="item-info">
          <div class="item-rank-row">
            <span class="item-rank">${r.rank}º</span>
            ${votesHTML}
          </div>
          <h2 class="item-name">${r.name}</h2>
          
          <!-- Attributes -->
          <div class="item-attributes">
            <div class="attr-item">
              <strong>${r.cuisine}</strong>
            </div>
            <div class="attr-dot"></div>
            <div class="attr-item">${priceSymbol}</div>
            <div class="attr-dot"></div>
            <div class="attr-item">${r.neighborhood || r.city}</div>
          </div>

          <div class="item-description">
            ${
              truncateResult.isTruncated
                ? `
              <span class="desc-short">${truncateResult.short}</span>
              <span class="desc-full hidden">${r.description}</span>
              <button class="read-more-btn" data-rank="${r.rank}">Leia mais</button>
            `
                : `
              <span>${r.description}</span>
            `
            }
          </div>

          <!-- Custom Checkboxes -->
          <div class="item-check-panel">
            <label class="checkbox-control ${isVisited ? 'checked-visited' : ''}" data-rank="${r.rank}">
              <input type="checkbox" class="cb-visited" value="visited" ${isVisited ? 'checked' : ''}>
              <span class="checkbox-box">
                <svg width="10" height="10"><use href="/sprite.svg#icon-check"></use></svg>
              </span>
              <span>Já fui</span>
            </label>

            <label class="checkbox-control ${isWant ? 'checked-want' : ''}" data-rank="${r.rank}">
              <input type="checkbox" class="cb-want" value="wantToGo" ${isWant ? 'checked' : ''}>
              <span class="checkbox-box">
                <svg width="10" height="10"><use href="/sprite.svg#icon-check"></use></svg>
              </span>
              <span>Quero ir</span>
            </label>
          </div>

          <!-- Service & Address -->
          <div class="item-details">
            <div class="details-row">
              <strong>Endereço:</strong>
              <span>${r.service}</span>
            </div>
            ${
              r.website
                ? `
            <div class="details-row">
              <strong>Site:</strong>
              <a href="https://${r.website}" target="_blank" rel="noopener noreferrer">${r.website}</a>
            </div>`
                : ''
            }
          </div>
        </div>

        <!-- Right Column: Media -->
        <div class="item-media">
          <img ${imgAttrs} src="${r.imageUrl || 'https://classic.exame.com/wp-content/uploads/2025/04/RESTAURANTES-1.jpg'}" alt="Foto de ${r.name}">
        </div>
      </article>
    `;
  }

  private renderGridItemHTML(r: Restaurant, isFirst: boolean): string {
    const selection = this.myPicks[r.rank.toString()];
    const isVisited = selection === 'visited';
    const isWant = selection === 'wantToGo';
    const priceSymbol = r.price || '$$$';

    const imgAttrs = isFirst ? 'fetchpriority="high"' : 'loading="lazy"';

    return `
      <div class="grid-card" id="grid-card-${r.rank}-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}" data-rank="${r.rank}" style="view-transition-name: resto-card-${r.rank}-${r.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}">
        <div class="grid-card-media">
          <span class="grid-rank-badge">${r.rank}º</span>
          <img ${imgAttrs} src="${r.imageUrl || 'https://classic.exame.com/wp-content/uploads/2025/04/RESTAURANTES-1.jpg'}" alt="Foto de ${r.name}">
        </div>
        <div class="grid-card-content">
          <h3 class="grid-card-name">${r.name}</h3>
          <div class="grid-card-meta">
            <span>${r.cuisine}</span>
            <span>•</span>
            <span>${priceSymbol}</span>
            <span>•</span>
            <span>${r.neighborhood || r.city}</span>
          </div>
          <p class="grid-card-desc">${r.description}</p>
          
          <!-- Checklist toggles inside card -->
          <div class="grid-card-checks">
            <label class="checkbox-control ${isVisited ? 'checked-visited' : ''}" data-rank="${r.rank}">
              <input type="checkbox" class="cb-visited" value="visited" ${isVisited ? 'checked' : ''}>
              <span class="checkbox-box">
                <svg width="10" height="10"><use href="/sprite.svg#icon-check"></use></svg>
              </span>
              <span>Fui</span>
            </label>

            <label class="checkbox-control ${isWant ? 'checked-want' : ''}" data-rank="${r.rank}">
              <input type="checkbox" class="cb-want" value="wantToGo" ${isWant ? 'checked' : ''}>
              <span class="checkbox-box">
                <svg width="10" height="10"><use href="/sprite.svg#icon-check"></use></svg>
              </span>
              <span>Quero</span>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  private handleToggleReadMore(_rank: number, btn: HTMLElement): void {
    const parent = btn.closest('.item-description');
    if (!parent) return;

    const shortEl = parent.querySelector('.desc-short');
    const fullEl = parent.querySelector('.desc-full');

    if (!shortEl || !fullEl) return;

    const isCollapsed = fullEl.classList.contains('hidden');

    if (isCollapsed) {
      shortEl.classList.add('hidden');
      fullEl.classList.remove('hidden');
      btn.textContent = 'Leia menos';
    } else {
      shortEl.classList.remove('hidden');
      fullEl.classList.add('hidden');
      btn.textContent = 'Leia mais';
    }
  }

  private updateCheckboxStates(): void {
    if (!this.containerEl) return;

    // Select all list or grid items
    const cards = $$<HTMLElement>('.list-item, .grid-card', this.containerEl);

    cards.forEach((card) => {
      const rankStr = card.getAttribute('data-rank');
      if (!rankStr) return;

      const rank = rankStr;
      const selection = this.myPicks[rank];
      const isVisited = selection === 'visited';
      const isWant = selection === 'wantToGo';

      const cbVisited = card.querySelector<HTMLInputElement>('.cb-visited');
      const cbWant = card.querySelector<HTMLInputElement>('.cb-want');

      if (cbVisited) {
        cbVisited.checked = isVisited;
        cbVisited.closest('.checkbox-control')?.classList.toggle('checked-visited', isVisited);
      }

      if (cbWant) {
        cbWant.checked = isWant;
        cbWant.closest('.checkbox-control')?.classList.toggle('checked-want', isWant);
      }
    });
  }
}

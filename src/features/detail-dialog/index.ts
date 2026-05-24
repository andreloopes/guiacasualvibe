import { eventBus } from '../../shared/event-bus';
import { $, $$ } from '../../shared/dom';
import { Restaurant } from '../../domain/restaurant';

export class DetailDialogManager {
  private dialogEl: HTMLDialogElement | null = null;
  private restaurants: Restaurant[] = [];
  private myPicks: Record<string, 'visited' | 'wantToGo'> = {};

  constructor() {
    try {
      this.dialogEl = $('#detail-dialog') as HTMLDialogElement;
      this.init();
    } catch {
      this.dialogEl = null;
    }
  }

  private init(): void {
    if (!this.dialogEl) return;

    // Listen to selection events
    eventBus.on(
      'restaurant:select',
      ({
        rank,
        restaurants,
        myPicks,
      }: {
        rank: number;
        restaurants: Restaurant[];
        myPicks: Record<string, 'visited' | 'wantToGo'>;
      }) => {
        this.restaurants = restaurants;
        this.myPicks = myPicks;
        this.open(rank);
      }
    );

    // Close when clicking backdrop
    this.dialogEl.addEventListener('click', (e) => {
      if (e.target === this.dialogEl) {
        this.close();
      }
    });

    // Trapping focus & key bindings
    this.dialogEl.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    });
  }

  private open(rank: number): void {
    if (!this.dialogEl) return;
    const r = this.restaurants.find((x) => x.rank === rank);
    if (!r) return;

    const selection = this.myPicks[r.rank.toString()];
    const isVisited = selection === 'visited';
    const isWant = selection === 'wantToGo';
    const priceSymbol = r.price || '$$$';
    const votesHTML = r.votes ? `<span class="item-votes-badge">${r.votes} votos</span>` : '';

    this.dialogEl.innerHTML = `
      <div class="dialog-content" role="document">
        <div class="dialog-header">
          <img src="${r.imageUrl || 'https://classic.exame.com/wp-content/uploads/2025/04/RESTAURANTES-1.jpg'}" alt="Foto de ${r.name}">
          <button class="dialog-close-btn" id="btn-dialog-close" aria-label="Fechar modal">
            <svg width="20" height="20"><use href="/sprite.svg#icon-close"></use></svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="dialog-rank-name">
            <span class="dialog-rank">${r.rank}º</span>
            <h2 class="dialog-name" id="detail-heading" tabindex="-1">${r.name}</h2>
            ${votesHTML}
          </div>
          
          <div class="dialog-meta">
            <span><strong>${r.cuisine}</strong></span>
            <span>•</span>
            <span>${priceSymbol}</span>
            <span>•</span>
            <span>${r.neighborhood || r.city}</span>
          </div>

          <p class="dialog-desc">${r.description}</p>

          <div class="item-check-panel" style="margin-bottom: 24px;">
            <label class="checkbox-control ${isVisited ? 'checked-visited' : ''}">
              <input type="checkbox" class="cb-visited-modal" value="visited" ${isVisited ? 'checked' : ''}>
              <span class="checkbox-box">
                <svg width="10" height="10"><use href="/sprite.svg#icon-check"></use></svg>
              </span>
              <span>Já fui</span>
            </label>

            <label class="checkbox-control ${isWant ? 'checked-want' : ''}">
              <input type="checkbox" class="cb-want-modal" value="wantToGo" ${isWant ? 'checked' : ''}>
              <span class="checkbox-box">
                <svg width="10" height="10"><use href="/sprite.svg#icon-check"></use></svg>
              </span>
              <span>Quero ir</span>
            </label>
          </div>

          <div class="dialog-info-box">
            <div>
              <span class="info-title">Endereço & Funcionamento</span>
              <div>${r.service}</div>
            </div>
            ${
              r.website
                ? `
            <div style="margin-top: 10px;">
              <span class="info-title">Site Oficial</span>
              <div><a href="https://${r.website}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none;">${r.website}</a></div>
            </div>`
                : ''
            }
          </div>
        </div>
      </div>
    `;

    this.dialogEl.showModal();

    // Bind close button
    $('#btn-dialog-close', this.dialogEl).addEventListener('click', () => this.close());

    // Bind checkboxes inside modal
    this.bindCheckboxes(r.rank);

    // Focus title for accessibility
    $('#detail-heading', this.dialogEl).focus();
  }

  private close(): void {
    if (!this.dialogEl) return;
    this.dialogEl.close();
    eventBus.emit('restaurant:dialog-closed', null);
  }

  private bindCheckboxes(rank: number): void {
    if (!this.dialogEl) return;

    const cbVisited = this.dialogEl.querySelector<HTMLInputElement>('.cb-visited-modal');
    const cbWant = this.dialogEl.querySelector<HTMLInputElement>('.cb-want-modal');

    cbVisited?.addEventListener('change', () => {
      const isChecked = cbVisited.checked;
      eventBus.emit('picks:change-request', { rank, type: 'visited', checked: isChecked });

      // Visual updates
      cbVisited.closest('.checkbox-control')?.classList.toggle('checked-visited', isChecked);
      if (isChecked && cbWant) {
        cbWant.checked = false;
        cbWant.closest('.checkbox-control')?.classList.remove('checked-want');
      }
    });

    cbWant?.addEventListener('change', () => {
      const isChecked = cbWant.checked;
      eventBus.emit('picks:change-request', { rank, type: 'wantToGo', checked: isChecked });

      // Visual updates
      cbWant.closest('.checkbox-control')?.classList.toggle('checked-want', isChecked);
      if (isChecked && cbVisited) {
        cbVisited.checked = false;
        cbVisited.closest('.checkbox-control')?.classList.remove('checked-visited');
      }
    });
  }

  private trapFocus(e: KeyboardEvent): void {
    if (!this.dialogEl) return;
    const focusableElements = $$<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      this.dialogEl
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (!firstFocusable || !lastFocusable) return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  }
}

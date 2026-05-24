import { eventBus } from '../../shared/event-bus';
import { $ } from '../../shared/dom';
import { Restaurant } from '../../domain/restaurant';
import { serializePicks } from '../../shared/sharing';

export class PicksManager {
  private picksDrawer: HTMLElement | null = null;
  private picksBadge: HTMLElement | null = null;
  private drawerPicksList: HTMLElement | null = null;
  private statVisited: HTMLElement | null = null;
  private statWantToGo: HTMLElement | null = null;

  private restaurants: Restaurant[] = [];
  private myPicks: Record<string, 'visited' | 'wantToGo'> = {};

  constructor() {
    try {
      this.picksDrawer = $('#picks-drawer');
      this.picksBadge = $('#picks-badge');
      this.drawerPicksList = $('#drawer-picks-list');
      this.statVisited = $('#stat-visited');
      this.statWantToGo = $('#stat-want-to-go');
      this.init();
    } catch {
      this.picksDrawer = null;
      this.picksBadge = null;
    }
  }

  private init(): void {
    if (!this.picksDrawer) return;

    // Close buttons & backdrops
    $('#btn-close-drawer', this.picksDrawer).addEventListener('click', () =>
      this.toggleDrawer(false)
    );
    $('#drawer-backdrop', this.picksDrawer).addEventListener('click', () =>
      this.toggleDrawer(false)
    );

    // Copy actions
    $('#btn-copy-picks', this.picksDrawer).addEventListener('click', () => this.copyToClipboard());
    $('#btn-share-link', this.picksDrawer).addEventListener('click', () => this.copyShareLink());

    // Event hooks
    eventBus.on(
      'picks:update',
      ({
        myPicks,
        restaurants,
      }: {
        myPicks: Record<string, 'visited' | 'wantToGo'>;
        restaurants: Restaurant[];
      }) => {
        this.myPicks = myPicks;
        this.restaurants = restaurants;
        this.updateUI();
      }
    );

    eventBus.on('picks:toggle-drawer', () => {
      this.toggleDrawer();
    });
  }

  private toggleDrawer(forceState?: boolean): void {
    if (!this.picksDrawer) return;
    const isOpen = this.picksDrawer.classList.contains('open');
    const targetState = forceState !== undefined ? forceState : !isOpen;

    if (targetState) {
      this.renderDrawerList();
      this.picksDrawer.classList.add('open');
      this.picksDrawer.setAttribute('aria-hidden', 'false');
    } else {
      this.picksDrawer.classList.remove('open');
      this.picksDrawer.setAttribute('aria-hidden', 'true');
    }
  }

  private updateUI(): void {
    const count = Object.keys(this.myPicks).length;
    if (this.picksBadge) {
      this.picksBadge.textContent = count.toString();
      this.picksBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    if (this.picksDrawer && this.picksDrawer.classList.contains('open')) {
      this.renderDrawerList();
    }
  }

  private renderDrawerList(): void {
    if (!this.drawerPicksList || !this.statVisited || !this.statWantToGo) return;

    const entries = Object.entries(this.myPicks);
    let visitedCount = 0;
    let wantCount = 0;

    if (entries.length === 0) {
      this.drawerPicksList.innerHTML = `<p style="text-align: center; color: var(--text-tertiary); font-size: 13px; margin: 24px 0;">Nenhuma escolha marcada ainda. Navegue e adicione favoritos!</p>`;
      this.statVisited.textContent = '0';
      this.statWantToGo.textContent = '0';
      return;
    }

    const compiled = entries.map(([rankStr, type]) => {
      const rank = parseInt(rankStr);
      const r = this.restaurants.find((x) => x.rank === rank);
      if (type === 'visited') visitedCount++;
      if (type === 'wantToGo') wantCount++;
      return { rank, type, name: r ? r.name : 'Restaurante Desconhecido' };
    });

    compiled.sort((a, b) => a.rank - b.rank);

    this.statVisited.textContent = visitedCount.toString();
    this.statWantToGo.textContent = wantCount.toString();

    this.drawerPicksList.innerHTML = compiled
      .map(
        (item) => `
      <div class="drawer-pick-item">
        <div class="pick-meta">
          <span class="pick-rank">${item.rank}º</span>
          <span class="pick-name">${item.name}</span>
        </div>
        <span class="pick-badge-type ${item.type === 'visited' ? 'pick-badge-visited' : 'pick-badge-want'}">
          ${item.type === 'visited' ? 'Fui' : 'Quero ir'}
        </span>
      </div>
    `
      )
      .join('');
  }

  private copyToClipboard(): void {
    const entries = Object.entries(this.myPicks);
    if (entries.length === 0) {
      eventBus.emit('picks:toast', 'Adicione alguns restaurantes à sua lista antes de exportar.');
      return;
    }

    const visitedList: string[] = [];
    const wantList: string[] = [];

    entries.forEach(([rankStr, type]) => {
      const rank = parseInt(rankStr);
      const r = this.restaurants.find((x) => x.rank === rank);
      const name = r ? r.name : `Restaurante ${rank}`;
      const city = r ? `(${r.city})` : '';
      if (type === 'visited') {
        visitedList.push(`- ${rank}º ${name} ${city}`);
      } else {
        wantList.push(`- ${rank}º ${name} ${city}`);
      }
    });

    let text = `📋 MEU GUIA DE RESTAURANTES PERSONALIZADO (100 Melhores do Brasil)\n\n`;
    if (visitedList.length > 0) {
      text += `✅ JÁ FUI E RECOMENDO:\n${visitedList.join('\n')}\n\n`;
    }
    if (wantList.length > 0) {
      text += `📌 QUERO VISITAR EM BREVE:\n${wantList.join('\n')}\n\n`;
    }
    text += `Acesse e monte o seu em: ${window.location.origin + window.location.pathname}`;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        eventBus.emit('picks:toast', 'Copiado para a área de transferência! Envie pelo WhatsApp.');
      })
      .catch(() => {
        eventBus.emit('picks:toast', 'Falha ao copiar lista.');
      });
  }

  private copyShareLink(): void {
    const serialized = serializePicks(this.myPicks);
    let url = window.location.origin + window.location.pathname;

    if (serialized) {
      url = `${window.location.origin}${window.location.pathname}?picks=${serialized}`;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        eventBus.emit(
          'picks:toast',
          'Link de compartilhamento copiado! Quem abrir verá as suas escolhas.'
        );
      })
      .catch(() => {
        eventBus.emit('picks:toast', 'Falha ao copiar link.');
      });
  }
}

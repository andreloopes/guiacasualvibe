import { eventBus } from './shared/event-bus';
import { TypedStorage } from './shared/storage';
import { $ } from './shared/dom';
import { Restaurant, RestaurantListSchema } from './domain/restaurant';
import { deserializePicks } from './shared/sharing';

// Component Managers
import { ThemeManager } from './features/theme';
import { SearchManager } from './features/search';
import { ViewToggleManager } from './features/view-toggle';
import { ToastManager } from './features/toast';
import { DetailDialogManager } from './features/detail-dialog';
import { PicksManager } from './features/picks';
import { FiltersManager } from './features/filters';
import { RestaurantListManager } from './features/restaurant-list';

// Application State Interface
interface State {
  restaurants: Restaurant[];
  filteredRestaurants: Restaurant[];
  viewMode: 'list' | 'grid';
  showMyPicksOnly: boolean;
  searchTerm: string;
  activeFilters: {
    city: string[];
    cuisine: string[];
    price: string[];
    status: string[];
  };
  myPicks: Record<string, 'visited' | 'wantToGo'>;
  uniqueCities: string[];
  uniqueCuisines: string[];
}

// Global Application State
const state: State = {
  restaurants: [],
  filteredRestaurants: [],
  viewMode: 'list',
  showMyPicksOnly: false,
  searchTerm: '',
  activeFilters: {
    city: [],
    cuisine: [],
    price: [],
    status: [],
  },
  myPicks: {},
  uniqueCities: [],
  uniqueCuisines: [],
};

// Storage Key
const STORAGE_KEY = 'exame_br_restaurant_picks_2025';

// DOM Elements
const elements = {
  btnMyPicks: $('#btn-my-picks'),
  btnClearFilters: $('#btn-clear-filters'),
  btnResetFiltersEmpty: $('#btn-reset-filters-empty'),
  activeFiltersSummary: $('#active-filters-summary'),
  summaryTags: $('#summary-tags'),
};

/**
 * Initializes the entire application
 */
async function init(): Promise<void> {
  try {
    // 1. Instantiate Managers
    new ThemeManager();
    new SearchManager();
    new ViewToggleManager();
    new ToastManager();
    new DetailDialogManager();
    new PicksManager();
    const filtersManager = new FiltersManager();
    new RestaurantListManager();

    // 2. Fetch & Validate Data
    const response = await fetch('restaurants.json');
    if (!response.ok) {
      throw new Error('Falha ao carregar dados dos restaurantes.');
    }
    const rawData = await response.json();
    const parseResult = RestaurantListSchema.safeParse(rawData);
    if (!parseResult.success) {
      console.error('Validation errors:', parseResult.error.format());
      throw new Error('Dados dos restaurantes no JSON estão inconsistentes.');
    }

    state.restaurants = parseResult.data;
    state.restaurants.sort((a, b) => a.rank - b.rank);

    // 3. Extract unique filter options and populate panels
    extractUniqueValues();
    filtersManager.populateOptions(state.uniqueCities, state.uniqueCuisines);

    // 4. Load selections from storage
    loadPicks();

    // 5. Parse selections from sharing URL if present
    parseUrlPicks();

    // 6. Bind Bootstrapper Event Listeners
    bindBootstrapperEvents();

    // 7. Initial sync of selections to picks drawer & badge
    eventBus.emit('picks:update', { myPicks: state.myPicks, restaurants: state.restaurants });

    // 8. Run initial filter and render (without view transition)
    applyFiltersAndRender(false);
  } catch (error) {
    console.error('Initialization error:', error);
    eventBus.emit('picks:toast', 'Erro ao carregar o guia. Por favor, recarregue a página.');
  }
}

/**
 * Extracts unique cities and cuisines for dropdown list filters
 */
function extractUniqueValues(): void {
  const cities = new Set<string>();
  const cuisines = new Set<string>();

  state.restaurants.forEach((r) => {
    if (r.city) cities.add(r.city);
    if (r.cuisine) cuisines.add(r.cuisine);
  });

  state.uniqueCities = Array.from(cities).sort();
  state.uniqueCuisines = Array.from(cuisines).sort();
}

/**
 * Loads picks from local storage and handles migration from legacy key if needed
 */
function loadPicks(): void {
  const legacyData = localStorage.getItem('sp_restaurant_guide_picks_2025');
  const newData = TypedStorage.get(
    'exame_br_restaurant_picks_2025',
    {} as Record<string, 'visited' | 'wantToGo'>
  );

  if (newData && Object.keys(newData).length > 0) {
    state.myPicks = newData;
  } else if (legacyData) {
    try {
      state.myPicks = JSON.parse(legacyData);
      TypedStorage.set('exame_br_restaurant_picks_2025', state.myPicks);
    } catch {
      state.myPicks = {} as Record<string, 'visited' | 'wantToGo'>;
    }
  } else {
    state.myPicks = {} as Record<string, 'visited' | 'wantToGo'>;
  }
}

/**
 * Parses shared picks from the URL query params
 */
function parseUrlPicks(): void {
  const params = new URLSearchParams(window.location.search);
  const picksParam = params.get('picks');
  if (picksParam) {
    try {
      const importedPicks = deserializePicks(picksParam);
      Object.assign(state.myPicks, importedPicks);
      TypedStorage.set(STORAGE_KEY, state.myPicks);
      eventBus.emit('picks:toast', 'Lista compartilhada importada com sucesso!');

      // Remove query param from the URL to clean up the user experience
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.error('Error parsing URL picks:', e);
    }
  }
}

/**
 * Applies filters based on active parameters and triggers rendering
 */
function applyFiltersAndRender(useTransition = true): void {
  state.filteredRestaurants = state.restaurants.filter((r) => {
    // 1. Search filter
    if (state.searchTerm) {
      const term = state.searchTerm.toLowerCase();
      const matchSearch =
        r.name.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        r.cuisine.toLowerCase().includes(term) ||
        (r.neighborhood && r.neighborhood.toLowerCase().includes(term));
      if (!matchSearch) return false;
    }

    // 2. City Filter
    if (state.activeFilters.city.length > 0) {
      if (!state.activeFilters.city.includes(r.city)) return false;
    }

    // 3. Cuisine Filter
    if (state.activeFilters.cuisine.length > 0) {
      if (!state.activeFilters.cuisine.includes(r.cuisine)) return false;
    }

    // 4. Price Filter
    if (state.activeFilters.price.length > 0) {
      if (!state.activeFilters.price.includes(r.price)) return false;
    }

    // 5. My Picks Filter
    if (state.showMyPicksOnly) {
      if (!state.myPicks[r.rank.toString()]) return false;
    }

    // 6. Status Filter
    if (state.activeFilters.status.length > 0) {
      const selection = state.myPicks[r.rank.toString()];
      const matchesStatus = state.activeFilters.status.some((status) => {
        if (status === 'visited') return selection === 'visited';
        if (status === 'wantToGo') return selection === 'wantToGo';
        if (status === 'unvisited') return !selection;
        return false;
      });
      if (!matchesStatus) return false;
    }

    return true;
  });

  updateActiveFiltersSummary();

  const renderData = {
    filteredRestaurants: state.filteredRestaurants,
    restaurants: state.restaurants,
    viewMode: state.viewMode,
    myPicks: state.myPicks,
  };

  // Perform render inside a View Transition if supported
  if (useTransition && document.startViewTransition) {
    document.startViewTransition(() => {
      eventBus.emit('restaurants:render', renderData);
    });
  } else {
    eventBus.emit('restaurants:render', renderData);
  }
}

/**
 * Updates the summary display area of active filters
 */
function updateActiveFiltersSummary(): void {
  const hasSearch = state.searchTerm !== '';
  const hasCity = state.activeFilters.city.length > 0;
  const hasCuisine = state.activeFilters.cuisine.length > 0;
  const hasPrice = state.activeFilters.price.length > 0;
  const hasStatus = state.activeFilters.status.length > 0;
  const showSummary =
    hasSearch || hasCity || hasCuisine || hasPrice || hasStatus || state.showMyPicksOnly;

  if (showSummary) {
    elements.activeFiltersSummary.classList.remove('hidden');
    elements.btnClearFilters.classList.remove('hidden');

    let tagsHTML = '';

    if (state.showMyPicksOnly) {
      tagsHTML += createFilterTag('Minhas Escolhas', 'myPicks');
    }
    if (state.searchTerm) {
      tagsHTML += createFilterTag(`Busca: "${state.searchTerm}"`, 'search');
    }
    state.activeFilters.city.forEach((c) => {
      tagsHTML += createFilterTag(c, `city-${c}`);
    });
    state.activeFilters.cuisine.forEach((c) => {
      tagsHTML += createFilterTag(c, `cuisine-${c}`);
    });
    state.activeFilters.price.forEach((p) => {
      tagsHTML += createFilterTag(`Faixa ${p}`, `price-${p}`);
    });
    state.activeFilters.status.forEach((s) => {
      const label = s === 'visited' ? 'Já Fui' : s === 'wantToGo' ? 'Quero Ir' : 'Não Visitados';
      tagsHTML += createFilterTag(label, `status-${s}`);
    });

    elements.summaryTags.innerHTML = tagsHTML;
  } else {
    elements.activeFiltersSummary.classList.add('hidden');
    elements.btnClearFilters.classList.add('hidden');
    elements.summaryTags.innerHTML = '';
  }
}

/**
 * Generates dynamic filter tag markup
 */
function createFilterTag(label: string, id: string): string {
  return `
    <span class="filter-tag">
      <span>${label}</span>
      <button data-tag-id="${id}" aria-label="Remover filtro ${label}">
        <svg width="10" height="10"><use href="/sprite.svg#icon-close"></use></svg>
      </button>
    </span>
  `;
}

/**
 * Removes a specific filter tag and updates state
 */
function removeFilterTag(id: string): void {
  if (id === 'myPicks') {
    state.showMyPicksOnly = false;
    elements.btnMyPicks.classList.remove('active');
  } else if (id === 'search') {
    state.searchTerm = '';
    eventBus.emit('search:reset', null);
  } else if (id.startsWith('city-')) {
    const val = id.replace('city-', '');
    state.activeFilters.city = state.activeFilters.city.filter((x) => x !== val);
    eventBus.emit('filter:remove-tag', { type: 'city', value: val });
  } else if (id.startsWith('cuisine-')) {
    const val = id.replace('cuisine-', '');
    state.activeFilters.cuisine = state.activeFilters.cuisine.filter((x) => x !== val);
    eventBus.emit('filter:remove-tag', { type: 'cuisine', value: val });
  } else if (id.startsWith('price-')) {
    const val = id.replace('price-', '');
    state.activeFilters.price = state.activeFilters.price.filter((x) => x !== val);
    eventBus.emit('filter:remove-tag', { type: 'price', value: val });
  } else if (id.startsWith('status-')) {
    const val = id.replace('status-', '');
    state.activeFilters.status = state.activeFilters.status.filter((x) => x !== val);
    eventBus.emit('filter:remove-tag', { type: 'status', value: val });
  }
  applyFiltersAndRender();
}

/**
 * Resets all filters in the state
 */
function clearAllFilters(): void {
  state.searchTerm = '';
  eventBus.emit('search:reset', null);
  state.showMyPicksOnly = false;
  elements.btnMyPicks.classList.remove('active');
  eventBus.emit('filter:reset-all', null);
  applyFiltersAndRender();
}

/**
 * Connects and coordinates managers through the EventBus
 */
function bindBootstrapperEvents(): void {
  // Listen to search updates
  eventBus.on('search:change', (value: string) => {
    state.searchTerm = value;
    applyFiltersAndRender();
  });

  // Listen to filter selection changes
  eventBus.on('filter:change', (activeFilters: Record<string, string[]>) => {
    state.activeFilters = {
      city: activeFilters['city'] || [],
      cuisine: activeFilters['cuisine'] || [],
      price: activeFilters['price'] || [],
      status: activeFilters['status'] || [],
    };
    applyFiltersAndRender();
  });

  // Listen to view mode changes
  eventBus.on('viewMode:change', (mode: 'list' | 'grid') => {
    state.viewMode = mode;
    applyFiltersAndRender();
  });

  // Listen to checkbook selection updates inside cards or modals
  eventBus.on(
    'picks:change-request',
    ({ rank, type, checked }: { rank: number; type: 'visited' | 'wantToGo'; checked: boolean }) => {
      const key = rank.toString();
      if (checked) {
        state.myPicks[key] = type;
      } else {
        if (state.myPicks[key] === type) {
          delete state.myPicks[key];
        }
      }

      TypedStorage.set(STORAGE_KEY, state.myPicks);

      // Notify PicksManager and list of updates
      eventBus.emit('picks:update', { myPicks: state.myPicks, restaurants: state.restaurants });

      // If viewing My Picks only or status filters are active, re-apply filters & render
      const hasStatusFilter = state.activeFilters.status.length > 0;
      if (state.showMyPicksOnly || hasStatusFilter) {
        applyFiltersAndRender();
      }
    }
  );

  // Toggle My Picks View
  elements.btnMyPicks.addEventListener('click', () => {
    state.showMyPicksOnly = !state.showMyPicksOnly;
    elements.btnMyPicks.classList.toggle('active', state.showMyPicksOnly);
    applyFiltersAndRender();

    // If activated, open drawer details too
    if (state.showMyPicksOnly) {
      eventBus.emit('picks:toggle-drawer', null);
    }
  });

  elements.btnMyPicks.addEventListener('dblclick', () => {
    eventBus.emit('picks:toggle-drawer', null);
  });

  // Reset filters
  elements.btnClearFilters.addEventListener('click', clearAllFilters);
  elements.btnResetFiltersEmpty.addEventListener('click', clearAllFilters);

  // Active tags click event delegation
  elements.summaryTags.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn) {
      const tagId = btn.getAttribute('data-tag-id');
      if (tagId) {
        removeFilterTag(tagId);
      }
    }
  });

  // Keyboard support: Escape closes Drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = $('#picks-drawer');
      if (drawer.classList.contains('open')) {
        eventBus.emit('picks:toggle-drawer', null);
      }
    }
  });
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  init();
});

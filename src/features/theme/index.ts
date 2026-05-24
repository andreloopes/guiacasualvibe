import { TypedStorage } from '../../shared/storage';
import { $ } from '../../shared/dom';

export class ThemeManager {
  private toggleBtn: HTMLElement | null = null;
  private currentTheme: 'light' | 'dark' = 'dark';

  constructor() {
    try {
      this.toggleBtn = $('#btn-theme-toggle');
    } catch {
      this.toggleBtn = null;
    }
    this.init();
  }

  private init(): void {
    // Load from storage or fallback to system preference
    const storedTheme = TypedStorage.get('theme', 'dark');
    this.setTheme(storedTheme);

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }

    // Listen to OS changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const systemTheme = e.matches ? 'dark' : 'light';
      // Only apply if the user hasn't explicitly set a preference
      if (!localStorage.getItem('theme')) {
        this.setTheme(systemTheme);
      }
    });
  }

  private toggle(): void {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
    TypedStorage.set('theme', nextTheme);
  }

  private setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;
    const body = document.body;

    if (theme === 'light') {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      this.updateIcons(true);
    } else {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      this.updateIcons(false);
    }
  }

  private updateIcons(isLight: boolean): void {
    if (!this.toggleBtn) return;
    const sunIcon = this.toggleBtn.querySelector('.sun-icon');
    const moonIcon = this.toggleBtn.querySelector('.moon-icon');

    if (isLight) {
      sunIcon?.classList.remove('hidden');
      moonIcon?.classList.add('hidden');
    } else {
      sunIcon?.classList.add('hidden');
      moonIcon?.classList.remove('hidden');
    }
  }
}

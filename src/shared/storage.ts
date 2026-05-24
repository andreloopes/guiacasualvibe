export interface StorageKeys {
  theme: 'light' | 'dark';
  exame_br_restaurant_picks_2025: Record<string, 'visited' | 'wantToGo'>;
}

export class TypedStorage {
  public static get<K extends keyof StorageKeys>(
    key: K,
    defaultValue: StorageKeys[K]
  ): StorageKeys[K] {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored) as StorageKeys[K];
    } catch {
      return defaultValue;
    }
  }

  public static set<K extends keyof StorageKeys>(key: K, value: StorageKeys[K]): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving key "${key}" to localStorage:`, error);
    }
  }

  public static remove<K extends keyof StorageKeys>(key: K): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing key "${key}" from localStorage:`, error);
    }
  }
}

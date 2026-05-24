import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TypedStorage } from '../storage';

// Mock localStorage globally
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('TypedStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should get default value if key does not exist', () => {
    const value = TypedStorage.get('theme', 'dark');
    expect(value).toBe('dark');
  });

  it('should set and get values correctly', () => {
    TypedStorage.set('theme', 'light');
    const value = TypedStorage.get('theme', 'dark');
    expect(value).toBe('light');
  });

  it('should handle object types correctly', () => {
    const picks = { '1': 'visited', '2': 'wantToGo' } as const;
    TypedStorage.set('exame_br_restaurant_picks_2025', picks);

    const retrieved = TypedStorage.get('exame_br_restaurant_picks_2025', {});
    expect(retrieved).toEqual(picks);
  });

  it('should return defaultValue and not crash on parsing invalid JSON', () => {
    localStorageMock.setItem('exame_br_restaurant_picks_2025', 'invalid-json-{');
    const value = TypedStorage.get('exame_br_restaurant_picks_2025', { '10': 'visited' });
    expect(value).toEqual({ '10': 'visited' });
  });

  it('should remove items correctly', () => {
    TypedStorage.set('theme', 'light');
    TypedStorage.remove('theme');

    const value = TypedStorage.get('theme', 'dark');
    expect(value).toBe('dark');
  });
});

import { describe, it, expect } from 'vitest';
import { truncateText } from '../formatters';

describe('truncateText', () => {
  it('should not truncate text below the limit', () => {
    const text = 'Este é um texto curto.';
    const result = truncateText(text, 50);
    expect(result.short).toBe(text);
    expect(result.isTruncated).toBe(false);
  });

  it('should truncate text exceeding the limit and append ellipses', () => {
    const text = 'Este é um texto muito longo que passa do limite definido de trinta caracteres.';
    const result = truncateText(text, 30);
    expect(result.short.endsWith('...')).toBe(true);
    expect(result.isTruncated).toBe(true);
  });

  it('should not cut a word in half if there is a space near the limit', () => {
    const text = 'A culinária brasileira é rica e diversa em sabores.';
    // Limit is 25, which falls inside the word "brasileira" (index 12 to 22)
    // The last space before 25 is after "culinária" (index 11) or "brasileira" (index 22)
    const result = truncateText(text, 25);
    expect(result.short).toBe('A culinária brasileira é...');
    expect(result.isTruncated).toBe(true);
  });

  it('should fallback to default limit of 350 characters', () => {
    const longText = 'a'.repeat(400);
    const result = truncateText(longText);
    expect(result.short.length).toBe(353); // 350 + 3 dots
    expect(result.isTruncated).toBe(true);
  });
});

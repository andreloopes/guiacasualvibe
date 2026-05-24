/**
 * Serializes a picks map into a URL query parameter string.
 * Example: { "1": "visited", "2": "wantToGo" } -> "1:visited,2:wantToGo"
 */
export function serializePicks(picks: Record<string, 'visited' | 'wantToGo'>): string {
  const entries = Object.entries(picks);
  if (entries.length === 0) return '';
  return entries
    .map(([rank, type]) => `${rank}:${type}`)
    .sort() // Ensure deterministic ordering for testing/caching
    .join(',');
}

/**
 * Deserializes a URL query parameter string back into a picks map.
 * Safely ignores invalid ranks or unrecognized selection types.
 */
export function deserializePicks(param: string | null): Record<string, 'visited' | 'wantToGo'> {
  const picks: Record<string, 'visited' | 'wantToGo'> = {};
  if (!param) return picks;

  const items = param.split(',');
  items.forEach((item) => {
    const parts = item.split(':');
    if (parts.length !== 2) return;
    const [rankStr, type] = parts;
    if (!rankStr || !type) return;

    const rank = parseInt(rankStr, 10);
    if (!isNaN(rank) && rank >= 1 && rank <= 100 && (type === 'visited' || type === 'wantToGo')) {
      picks[rank.toString()] = type;
    }
  });

  return picks;
}

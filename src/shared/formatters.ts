/**
 * Truncates text at the given limit and returns the truncated version.
 * Ensures the truncation doesn't happen mid-word if possible.
 */
export function truncateText(
  text: string,
  limit: number = 350
): { short: string; isTruncated: boolean } {
  if (text.length <= limit) {
    return { short: text, isTruncated: false };
  }

  // Find last space before limit to avoid cutting a word in half
  let truncated = text.substring(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > limit * 0.8) {
    truncated = truncated.substring(0, lastSpace);
  }

  return { short: `${truncated.trim()}...`, isTruncated: true };
}

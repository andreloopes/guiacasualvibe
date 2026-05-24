/**
 * Safe query selector. Throws error if element is not found, ensuring type safety.
 */
export function $<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T {
  const el = parent.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Element matching selector "${selector}" was not found.`);
  }
  return el;
}

/**
 * Safe query selector all helper.
 */
export function $$<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

/**
 * Escapes special characters to prevent HTML injection (XSS).
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

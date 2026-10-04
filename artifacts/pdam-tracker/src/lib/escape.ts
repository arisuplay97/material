/**
 * Helpers for safely interpolating untrusted values into HTML strings.
 * Leaflet popups/divIcons accept raw HTML, so every value that originates
 * from an uploaded file or admin input MUST pass through these helpers.
 */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, (ch) => HTML_ESCAPES[ch]);
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Returns the color only if it is a plain HEX value, otherwise the fallback. */
export function safeColor(value: unknown, fallback = '#64748B'): string {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/**
 * Neutralises spreadsheet formula injection (CSV/Excel injection).
 * Cells starting with = + - @ TAB or CR are executed as formulas by Excel.
 */
export function sanitizeSpreadsheetCell<T>(value: T): T | string {
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * For the few places that build HTML strings (print windows, map popups).
 * Anything typed by a user (customer / vendor / product names, notes) must go through this first.
 */
const MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export const escapeHtml = (v: unknown): string =>
  v == null ? '' : String(v).replace(/[&<>"'`]/g, (c) => MAP[c]);

/**
 * Copy of an object with every string escaped (numbers, booleans and dates untouched).
 * Use at the top of a function that pastes many fields into an HTML template.
 */
export function escapeDeep<T>(value: T): T {
  if (typeof value === 'string') return escapeHtml(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => escapeDeep(v)) as unknown as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = escapeDeep(v);
    return out as T;
  }
  return value;
}

/** A logo / image URL that may go into src="": only data:image, https and same-site paths. */
export function safeImageUrl(url: unknown): string {
  const s = typeof url === 'string' ? url.trim() : '';
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return escapeHtml(s);
  if (/^\/[^/\s"'<>][^\s"'<>]*$/.test(s)) return escapeHtml(s);
  return '';
}

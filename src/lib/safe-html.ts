/**
 * Escape a string for safe insertion into HTML body text or attribute values.
 * Covers &, <, >, ", ', / — sufficient for emails and templates that
 * interpolate untrusted strings.
 */
export function escapeHtml(input: unknown): string {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Returns the input unchanged if it's a safe URL (http/https), otherwise an
 * empty string. Use for href values built from configuration so a misconfigured
 * env var can't produce a javascript: link.
 */
export function safeUrl(input: unknown): string {
  if (input == null) return '';
  const s = String(input).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return s;
  return '';
}

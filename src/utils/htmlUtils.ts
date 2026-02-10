import { decodeHtmlEntities } from './htmlDecode';

/**
 * Extracts plain text from HTML and returns its length.
 * Used for character counting in rich text fields where HTML tags
 * should not count towards the character limit.
 */
export function getTextLengthFromHtml(html: string): number {
  if (!html) return 0;

  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  const text = tempElement.textContent || tempElement.innerText || '';
  return text.length;
}

export function getPlainTextFromHtml(html: string): string {
  if (!html) return '';

  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  return tempElement.textContent || tempElement.innerText || '';
}

/**
 * Prepares content for display in a plain textarea.
 * Decodes HTML entities, and if the content contains HTML tags
 * (from the Lexical editor period), converts to plain text
 * preserving paragraph structure. Otherwise returns content as-is,
 * preserving any markdown formatting.
 */
export function prepareContentForTextarea(content: string): string {
  if (!content) return '';

  const decoded = decodeHtmlEntities(content);

  if (!/<(p|strong|em|ul|ol|li|br|u|h[1-6]|blockquote)[>\s/]|<a\s/i.test(decoded)) {
    return decoded;
  }

  let text = decoded;
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

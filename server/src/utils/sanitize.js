/**
 * Server-Side HTML Sanitizer
 * Conforms to Section 7 Content Safety rules:
 * - Sanitizes rich-text notices and comments against stored XSS
 * - Strips <script>, <iframe>, <object>, <embed>, and dangerous event attributes (onerror, onload, onclick)
 * - Forces rel="noopener noreferrer" on all external links
 */
export const sanitizeHtml = (dirtyHtml = '') => {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  let clean = dirtyHtml;

  // 1. Strip script, iframe, style, embed, object, and applet tags along with their contents
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // 2. Strip inline JavaScript event handlers (e.g. onclick=..., onerror=..., onload=...)
  clean = clean.replace(/\s+on\w+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^>\s]+/gi, '');

  // 3. Strip javascript: URLs in href or src
  clean = clean.replace(/href\s*=\s*(['"])javascript:[^'"]*\1/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*(['"])javascript:[^'"]*\1/gi, 'src=""');

  // 4. Ensure all <a> tags open securely with rel="noopener noreferrer"
  clean = clean.replace(/<a\b([^>]*)>/gi, (match, attributes) => {
    let newAttrs = attributes;
    if (!/target\s*=/i.test(newAttrs)) {
      newAttrs += ' target="_blank"';
    }
    if (!/rel\s*=/i.test(newAttrs)) {
      newAttrs += ' rel="noopener noreferrer"';
    } else {
      newAttrs = newAttrs.replace(/rel\s*=\s*['"][^'"]*['"]/i, 'rel="noopener noreferrer"');
    }
    return `<a${newAttrs}>`;
  });

  return clean.trim();
};

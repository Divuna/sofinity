import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows only safe tags and attributes, strips all event handlers and scripts
 */
export function sanitizeHTML(html: string): { safe: boolean; html: string } {
  try {
    // Configure DOMPurify with strict whitelist
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'img'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });

    // Check if sanitization actually modified the content
    const wasSanitized = clean !== html;
    
    return {
      safe: !wasSanitized || clean.length > 0,
      html: clean
    };
  } catch (error) {
    console.error('HTML sanitization failed:', error);
    return {
      safe: false,
      html: ''
    };
  }
}

/**
 * Convert HTML to plain text (fallback for failed sanitization)
 */
export function htmlToPlainText(html: string): string {
  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  } catch (error) {
    return html.replace(/<[^>]*>/g, '');
  }
}

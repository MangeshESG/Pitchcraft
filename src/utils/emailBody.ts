const HTML_TAG_IN_TEXT = /<\/?(?:html|body|p|div|br|span|strong|em|img|a|table|tbody|tr|td|th|ul|ol|li|blockquote|h[1-6])\b/i;
const ENCODED_HTML_TAG = /&(?:amp;)*lt;\s*\/?(?:html|body|p|div|br|span|strong|em|img|a|table|tbody|tr|td|th|ul|ol|li|blockquote|h[1-6])\b/i;

/** Convert rich text, including HTML pasted as escaped text, to a mailto body. */
export function toMailtoPlainText(value: string): string {
  let html = value;

  // Some generated emails contain escaped HTML inside the editor's HTML.
  // Decode only while another layer of recognizable markup remains.
  for (let pass = 0; pass < 10; pass += 1) {
    const decoded = new DOMParser().parseFromString(html, "text/html").body.textContent || "";
    if (decoded === html || (!HTML_TAG_IN_TEXT.test(decoded) && !ENCODED_HTML_TAG.test(decoded))) break;
    html = decoded;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  const body = document.body;
  body.querySelectorAll("script, style, template, noscript, svg").forEach((node) => node.remove());
  body.querySelectorAll("a[href]").forEach((node) => {
    const href = node.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) && node.textContent?.trim() !== href) {
      node.append(` (${href})`);
    }
  });
  body.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  body.querySelectorAll("td, th").forEach((node) => node.append("\t"));
  body.querySelectorAll("p, div, section, article, blockquote, li, tr, h1, h2, h3, h4, h5, h6")
    .forEach((node) => node.append("\n"));

  // A generated response can contain several entity-encoded HTML layers.
  // Never hand tag-looking source text to an external mail client.
  let plainText = body.textContent || "";
  for (let pass = 0; pass < 10 && (HTML_TAG_IN_TEXT.test(plainText) || ENCODED_HTML_TAG.test(plainText)); pass += 1) {
    plainText = toMailtoPlainTextLayer(plainText);
  }

  return plainText
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toMailtoPlainTextLayer(value: string): string {
  const body = new DOMParser().parseFromString(value, "text/html").body;
  body.querySelectorAll("script, style, template, noscript, svg").forEach((node) => node.remove());
  body.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  body.querySelectorAll("p, div, section, article, blockquote, li, tr, h1, h2, h3, h4, h5, h6")
    .forEach((node) => node.append("\n"));
  return body.textContent || "";
}

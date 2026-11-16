import React, { useRef, useCallback, useEffect } from 'react';

interface EmailIframeProps {
  html: string;
  onBodyClick?: () => void;
}

/**
 * Build a clean, sandboxed HTML document from raw email HTML.
 *
 * Strategy:
 *  1. If the email has a <body> tag, extract only its contents.
 *     This discards the email's own <style> blocks (which can hide text)
 *     while keeping all inline styles that control the email's layout.
 *  2. Wrap those contents in a minimal fresh document with our own
 *     baseline styles.
 *  3. Fallback: if no <body> tag is found, strip the outer wrappers
 *     and render the raw fragment.
 *
 * Why we keep inline styles but strip <style> blocks:
 *   Marketing emails commonly set `color:white` or `display:none` on
 *   the <body> via a <style> block to control preheader text — which
 *   makes the entire email appear blank when injected into the DOM.
 *   Inline styles on the table/td elements are safe to keep.
 */
/**
 * Find the forwarded/replied-to header block - the run of
 * "From: / Sent: / To: / Cc: / Subject:" lines a mail client pastes above the
 * quoted message - and tag it so the stylesheet below can show it as its own
 * grey card, separated from the message text.
 *
 * The block arrives as ordinary body markup and differs per client (one
 * paragraph with <br>s from Outlook, a row of <div>s from Gmail), so it is
 * located by content: the innermost short element whose text carries the
 * From, To and Subject labels together.
 */
function markForwardHeader(bodyHtml: string): string {
  if (typeof DOMParser === 'undefined') return bodyHtml;
  if (!/From:/i.test(bodyHtml) || !/Subject:/i.test(bodyHtml)) return bodyHtml;

  const WRAPPABLE = new Set(['P', 'DIV', 'TD', 'BLOCKQUOTE', 'SECTION', 'ARTICLE']);
  const MAX_HEADER_CHARS = 600;

  const normalize = (value: string | null) => (value || '').replace(/\s+/g, ' ').trim();
  const hasHeaderLabels = (text: string) =>
    /(^|[\s>])From:/i.test(text) && /(^|[\s>])To:/i.test(text) && /(^|[\s>])Subject:/i.test(text);

  try {
    const doc = new DOMParser().parseFromString(`<body>${bodyHtml}</body>`, 'text/html');

    // Innermost match wins: the shortest text that still carries every label.
    let header: HTMLElement | null = null;
    let headerLength = Number.POSITIVE_INFINITY;

    doc.body.querySelectorAll('*').forEach((node) => {
      const element = node as HTMLElement;
      const text = normalize(element.textContent);
      if (!text || text.length > MAX_HEADER_CHARS || text.length >= headerLength) return;
      if (!hasHeaderLabels(text)) return;
      header = element;
      headerLength = text.length;
    });

    if (!header) return bodyHtml;

    // A <b>/<span> match is only the label; climb to the block that holds the
    // whole run of lines, as long as it stays header-sized.
    let block: HTMLElement = header;
    while (!WRAPPABLE.has(block.tagName) && block.parentElement && block.parentElement !== doc.body) {
      const parentText = normalize(block.parentElement.textContent);
      if (parentText.length > MAX_HEADER_CHARS) break;
      block = block.parentElement;
    }
    if (!WRAPPABLE.has(block.tagName) && block.parentElement === doc.body) {
      // Loose inline run straight under the body: wrap it rather than restyle it.
      const wrapper = doc.createElement('div');
      block.parentElement.insertBefore(wrapper, block);
      wrapper.appendChild(block);
      block = wrapper;
    }
    if (block.tagName === 'TD' || block === doc.body) return bodyHtml;

    // Clients that give each header line its own element (Gmail) land on the
    // quote wrapper above, which also holds the message text. Wrap just the
    // run of header lines instead.
    const headerLine = /^(from|sent|date|to|cc|bcc|subject|importance|reply-to)\s*:/i;
    const LINE_TAGS = new Set(['DIV', 'P', 'LI', 'TR']);
    const children = Array.from(block.children) as HTMLElement[];
    // Only whole lines count. An inline <b>From:</b> is just the label, and
    // moving it would leave its address behind.
    const lines = children.filter(
      (child) => LINE_TAGS.has(child.tagName) && headerLine.test(normalize(child.textContent)),
    );
    if (lines.length >= 2) {
      const first = children.indexOf(lines[0]);
      const last = children.indexOf(lines[lines.length - 1]);
      const run = children.slice(first, last + 1);
      const wrapper = doc.createElement('div');
      block.insertBefore(wrapper, run[0]);
      run.forEach((child) => wrapper.appendChild(child));
      block = wrapper;
    }

    // The client's own "Forwarded message" divider above the block becomes the
    // card's label, so it is not repeated.
    const previous = block.previousElementSibling as HTMLElement | null;
    const previousText = normalize(previous && previous.textContent);
    if (previous && previousText.length <= 60 &&
        /^-*\s*(forwarded|original)\s+(message|email)\b/i.test(previousText)) {
      previous.remove();
    }

    block.className = `${block.className || ''} pk-mail-head`.trim();
    // Outlook ships these paragraphs with their own margins and font sizes;
    // the card supplies both.
    block.removeAttribute('style');

    const label = doc.createElement('span');
    label.className = 'pk-mail-head-label';
    label.textContent = 'FORWARDED MESSAGE';
    block.insertBefore(label, block.firstChild);

    return doc.body.innerHTML;
  } catch {
    return bodyHtml;
  }
}

function buildEmailDocument(raw: string): string {
  const containsActualHtml = (value: string): boolean =>
    /<\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(value);

  const containsEncodedHtml = (value: string): boolean =>
    /&lt;\/?(?:html|head|body|div|table|p|span|font|blockquote|br)\b/i.test(value);

  // Decode only when the backend sent fully encoded markup.
  const decodeEncodedMarkup = (html: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    const decoded = textarea.value;

    if (decoded !== html && containsEncodedHtml(decoded) && !containsActualHtml(decoded)) {
      return decodeEncodedMarkup(decoded);
    }

    return decoded;
  };

  const normalizedRaw = containsActualHtml(raw) || !containsEncodedHtml(raw)
    ? raw
    : decodeEncodedMarkup(raw);
  
  // Some emails have a malformed tracking fragment prepended before the
  // real DOCTYPE/html/body.  Find the LAST <body ...> tag to get the
  // proper email body.
  const bodyMatches = Array.from(normalizedRaw.matchAll(/<body[^>]*>/gi));
  const bodyOpen = bodyMatches.length > 0 ? bodyMatches[bodyMatches.length - 1].index! : -1;
  const bodyClose = normalizedRaw.toLowerCase().lastIndexOf('</body>');

  let bodyContent: string;

  if (bodyOpen !== -1 && bodyClose !== -1 && bodyClose > bodyOpen) {
    // Extract inner content between <body> and </body>
    const innerStart = normalizedRaw.indexOf('>', bodyOpen) + 1;
    bodyContent = normalizedRaw.slice(innerStart, bodyClose);
  } else {
    // Fallback: strip all outer HTML scaffolding
    bodyContent = normalizedRaw
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '');
  }

  bodyContent = bodyContent
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .replace(/<(?:p|div)\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/(?:p|div)>/gi, '')
    .trim();

  bodyContent = markForwardHeader(bodyContent);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 4px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.35; color: #1a1d21; }
  p, div { margin-top: 0; }
  p { margin-bottom: 6px; }
  img  { max-width: 100%; height: auto; }
  *    { box-sizing: border-box; }
  a    { color: #1f7a3a; }

  /* Forwarded / replied-to header, lifted out by markForwardHeader(). */
  .pk-mail-head {
    display: block;
    margin: 0 0 14px;
    padding: 12px 14px;
    background: #f7f8f7;
    border: 1px solid #ecedec;
    border-radius: 10px;
    font-size: 13px;
    line-height: 20px;
    color: #374151;
  }
  .pk-mail-head .pk-mail-head-label {
    display: block;
    margin-bottom: 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.6px;
    color: #5b6472;
  }
  .pk-mail-head p,
  .pk-mail-head div { margin: 0; }
  @media (max-width: 640px) {
    html, body {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }
    body * {
      max-width: 100% !important;
      min-width: 0 !important;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    table {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: auto !important;
    }
    img {
      width: auto !important;
      max-width: 100% !important;
      height: auto !important;
    }
    pre {
      white-space: pre-wrap !important;
    }
  }
</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

const EmailIframe: React.FC<EmailIframeProps> = ({ html, onBodyClick }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const cleanupRef = useRef<() => void>(() => undefined);

  useEffect(() => () => cleanupRef.current(), []);

  const handleLoad = useCallback(() => {
    cleanupRef.current();

    const frame = ref.current;
    if (!frame) return;

    // Set a generous initial height so the email lays out at full width
    // before we measure the real scroll height.
    frame.style.height = '600px';

    let animationFrameId: number | null = null;
    const timeoutIds: number[] = [];
    const imageCleanups: Array<() => void> = [];

    const resize = () => {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc || !doc.body) return;
        // Measure the <body> only. `documentElement.scrollHeight` is
        // max(viewport height, content height), so once the iframe is
        // sized to the 600px placeholder it never reports a smaller
        // value. <body> has no explicit height, so it always reflects
        // the actual content height.
        const h = Math.max(doc.body.scrollHeight, doc.body.offsetHeight, 24);
        if (Math.abs(frame.getBoundingClientRect().height - h) > 1) {
          frame.style.height = h + 'px';
        }
      } catch { /* cross-origin guard */ }
    };

    const scheduleResize = () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        resize();
      });
    };

    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (doc?.body && onBodyClick) {
        doc.body.style.cursor = 'pointer';
        doc.body.addEventListener('click', onBodyClick);
      }
      if (doc?.body) {
        doc.querySelectorAll('img').forEach((image) => {
          if (!image.complete) {
            image.addEventListener('load', scheduleResize);
            image.addEventListener('error', scheduleResize);
            imageCleanups.push(() => {
              image.removeEventListener('load', scheduleResize);
              image.removeEventListener('error', scheduleResize);
            });
          }
        });

        doc.fonts?.ready.then(scheduleResize).catch(() => undefined);
      }
    } catch { /* cross-origin guard */ }

    scheduleResize();
    timeoutIds.push(window.setTimeout(scheduleResize, 400));
    timeoutIds.push(window.setTimeout(scheduleResize, 1200));

    cleanupRef.current = () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      timeoutIds.forEach(window.clearTimeout);
      imageCleanups.forEach((cleanup) => cleanup());

      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (doc?.body && onBodyClick) {
          doc.body.removeEventListener('click', onBodyClick);
        }
      } catch { /* cross-origin guard */ }
    };
  }, [onBodyClick]);

  return (
    <iframe
      ref={ref}
      srcDoc={buildEmailDocument(html)}
      onLoad={handleLoad}
      title="Email content"
      style={{ width: '100%', border: 'none', display: 'block', minHeight: 24 }}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
};

export default EmailIframe;

import React, { useRef, useCallback } from 'react';

interface EmailIframeProps {
  html: string;
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
function buildEmailDocument(raw: string): string {
  // Some emails have a malformed tracking fragment prepended before the
  // real DOCTYPE/html/body.  Find the LAST <body ...> tag to get the
  // proper email body.
  const bodyOpen = raw.search(/<body[^>]*>/i);
  const bodyClose = raw.search(/<\/body>/i);

  let bodyContent: string;

  if (bodyOpen !== -1 && bodyClose !== -1 && bodyClose > bodyOpen) {
    // Extract inner content between <body> and </body>
    const innerStart = raw.indexOf('>', bodyOpen) + 1;
    bodyContent = raw.slice(innerStart, bodyClose);
  } else {
    // Fallback: strip all outer HTML scaffolding
    bodyContent = raw
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '');
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a1d21; }
  img  { max-width: 100%; height: auto; }
  *    { box-sizing: border-box; }
  a    { color: #2563eb; }
</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

const EmailIframe: React.FC<EmailIframeProps> = ({ html }) => {
  const ref = useRef<HTMLIFrameElement>(null);

  const handleLoad = useCallback(() => {
    const frame = ref.current;
    if (!frame) return;

    // Set a generous initial height so the email lays out at full width
    // before we measure the real scroll height.
    frame.style.height = '600px';

    const resize = () => {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc) return;
        const h = Math.max(
          doc.documentElement?.scrollHeight ?? 0,
          doc.body?.scrollHeight ?? 0,
          80,
        );
        frame.style.height = h + 'px';
      } catch { /* cross-origin guard */ }
    };

    requestAnimationFrame(() => {
      resize();
      setTimeout(resize, 400);
      setTimeout(resize, 1200);
    });
  }, []);

  return (
    <iframe
      ref={ref}
      srcDoc={buildEmailDocument(html)}
      onLoad={handleLoad}
      title="Email content"
      style={{ width: '100%', border: 'none', display: 'block', minHeight: 80 }}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
};

export default EmailIframe;

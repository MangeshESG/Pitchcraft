import React, { useEffect, useState } from "react";

/**
 * Admin-only chat console: the Serviceji unified inbox, mounted whole.
 *
 * On a WordPress page this is the `[sjcb_unified_inbox]` shortcode: three
 * `<template class="sjcb-hub-source">` blocks plus `assets/host.js`. That
 * script does not render the three frames — it reads the source URLs out of
 * the templates and builds a *single* iframe pointing at
 * `?sjcb_workspace=combined`, passing the three sources in the fragment. The
 * combined page's `unified.js` then signs into all three sites and presents
 * one inbox with its own tabs and navigation.
 *
 * This component does that last step directly. Injecting `<template>` elements
 * and a third-party script that mutates the DOM around them (host.js inserts
 * its mount before the first template and rewrites text nodes) does not belong
 * in a React tree, and the URL it builds is the only part that matters.
 * Everything inside the frame is the hub's business.
 *
 * Checked against plugin v2.11.6, which validates each source — origin,
 * `sjcb_workspace=embed`, `access=private`, a 64-hex `sjcb-access`, and a
 * `parent` equal to the combined frame's own `parent` — and silently drops any
 * source that fails. So the three URLs below are kept verbatim as the hub
 * issued them, and `parent` is pinned rather than taken from `location`.
 *
 * All of these hosts answer with
 *   Content-Security-Policy: frame-ancestors 'self' https://www.app.pitchkraft.ai
 * so the browser renders the frame only on the production origin. On localhost
 * it stays blank; that is the CSP, not a bug here, and no client-side change
 * works around it.
 */

/** The only origin the hub's `frame-ancestors` allows this frame on. */
const EMBED_PARENT_ORIGIN = "https://www.app.pitchkraft.ai";

/** Where the combined workspace is served from — the only origin trusted below. */
const CHAT_EMBED_ORIGIN = "https://www.pitchkraft.ai";

/**
 * The three hub sources, verbatim from the shortcode markup.
 *
 * Order is the order the hub listed them. `parent` stays percent-encoded
 * exactly as issued: the combined page compares it as a string.
 */
const HUB_SOURCES = [
  "https://www.dataji.co/?sjcb_workspace=embed&parent=https%3A%2F%2Fwww.app.pitchkraft.ai&access=private#sjcb-access=c30d1dac88b7d5202cebc285111106d940efaaab99fb666acc7152947c7267ba",
  "https://serviceji.co/?sjcb_workspace=embed&parent=https%3A%2F%2Fwww.app.pitchkraft.ai&access=private#sjcb-access=2ce02a0ba3d6c8500cc98336e9ffa3d24c692805f3ff58aa6b50958fb446dab5",
  "https://www.pitchkraft.ai/?sjcb_workspace=embed&parent=https%3A%2F%2Fwww.app.pitchkraft.ai&access=private#sjcb-access=e7c1a273772e5ea7bd42b4382ff628147fef49868dd5b1809cf8a4e733d35f1c",
];

/**
 * The combined-workspace URL, built exactly the way `host.js` builds it:
 * `?sjcb_workspace=combined&parent=<parent>` with the sources as a JSON array
 * in a `sjcb-sources` fragment parameter. The fragment is never sent to the
 * server or leaked in a referrer, which is where the access tokens live.
 */
const buildCombinedEmbedSrc = (): string => {
  const url = new URL(`${CHAT_EMBED_ORIGIN}/`);

  url.searchParams.set("sjcb_workspace", "combined");
  url.searchParams.set("parent", EMBED_PARENT_ORIGIN);
  url.hash = new URLSearchParams({
    "sjcb-sources": JSON.stringify(
      HUB_SOURCES.map((source) => new URL(source).href),
    ),
  }).toString();

  return url.href;
};

const CHAT_EMBED_SRC = buildCombinedEmbedSrc();

/** Chrome above the frame: app header (87px) plus this panel's padding. */
const CHROME_HEIGHT = 87 + 32;

/**
 * How tall the frame is by default — deliberately well past the window.
 *
 * The hub sizes its own panes against the *frame's* viewport, not its
 * content: the combined page loads the same `portal.css`, where
 * `#sjcb-threads` is `max-height:65vh` and `#sjcb-agent-messages` is
 * `height:42vh`. Its fixed chrome above those — console header, connection
 * bar, the stat tiles, the filter row — runs to roughly 600px, so a frame of
 * height H wants about `600 + 0.65H` to show everything. A frame that merely
 * fills the window never satisfies that (it needs H ≥ 600/0.35 ≈ 1700), which
 * is why the conversation list kept getting cut off at the bottom. 1800 clears
 * it with room to spare; the app page scrolls to reach the rest, which beats
 * cramming the inbox into a 170px inner scroller.
 */
const DEFAULT_FRAME_HEIGHT = 1800;

/** Never shorter than this, however small the window gets. */
const MIN_FRAME_HEIGHT = 650;

/**
 * Sanity bound on a height the hub reports.
 *
 * Not a cap on the frame as such — it is there so one bad message cannot blow
 * the layout up to a million pixels. `host.js` uses the same bound.
 */
const MAX_REPORTED_HEIGHT = 20000;

/**
 * Pull a pixel height out of a postMessage from the hub.
 *
 * `host.js` listens for `{type:'sjcb-frame-height', height}` and resizes the
 * frame, so that is the contract. As of v2.11.6 nothing sends it: `embed.js`
 * defines a `size()` that would, but never calls it, and `unified.js` has no
 * `postMessage` at all — so today `DEFAULT_FRAME_HEIGHT` is what drives the
 * layout and this listener simply never fires. It is kept so the frame starts
 * sizing itself the moment the plugin wires that up. The loose field matching
 * is slack for a renamed field; anything unrecognised is ignored.
 */
const readReportedHeight = (data: unknown): number | null => {
  const toHeight = (value: unknown): number | null => {
    const height =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? parseFloat(value)
          : NaN;

    if (!Number.isFinite(height) || height <= 0) return null;
    return Math.min(Math.round(height), MAX_REPORTED_HEIGHT);
  };

  if (typeof data === "number" || typeof data === "string") {
    // e.g. 1840, "1840", or "sjcb-height:1840"
    const text = String(data);
    const tagged = text.match(/height[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
    return toHeight(tagged ? tagged[1] : text);
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    for (const key of [
      "height",
      "frameHeight",
      "iframeHeight",
      "sjcbHeight",
      "sjcb_height",
      "scrollHeight",
      "value",
    ]) {
      const height = toHeight(record[key]);
      if (height !== null) return height;
    }
  }

  return null;
};

const ChatSupport: React.FC = () => {
  /**
   * The frame renders only on the production origin (see above), so anywhere
   * else the blank frame is explained rather than left as a mystery.
   */
  const isAllowedEmbedOrigin =
    typeof window !== "undefined" &&
    window.location.origin === EMBED_PARENT_ORIGIN;

  /** Height the hub asked for, if it ever starts asking. */
  const [reportedHeight, setReportedHeight] = useState<number | null>(null);

  /** Fill taller windows too, and track that as the window resizes. */
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window === "undefined" ? MIN_FRAME_HEIGHT : window.innerHeight,
  );

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== CHAT_EMBED_ORIGIN) return;

      const height = readReportedHeight(event.data);
      if (height === null) return;

      setReportedHeight((previous) =>
        previous === height ? previous : height,
      );
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  /**
   * Whichever is tallest: the long default, a frame filling the window on a
   * tall display, or whatever the hub reports. Nothing here clips the frame —
   * the page scrolls instead.
   */
  const frameHeight = Math.max(
    MIN_FRAME_HEIGHT,
    DEFAULT_FRAME_HEIGHT,
    viewportHeight - CHROME_HEIGHT,
    reportedHeight ?? 0,
  );

  return (
    <div className="flex flex-col bg-[#fafbfc]">
      {!isAllowedEmbedOrigin && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-[12px] text-amber-900">
          The chat hub only allows itself to be framed by{" "}
          <span className="font-medium">{EMBED_PARENT_ORIGIN}</span>, so this
          frame stays blank on{" "}
          <span className="font-medium">{window.location.origin}</span>. Open
          Chat on the deployed app to use it.
        </div>
      )}

      <div className="p-4">
        <iframe
          title="Conversations"
          src={CHAT_EMBED_SRC}
          data-no-lazy="1"
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
          className="block w-full"
          style={{
            height: `${frameHeight}px`,
            border: "1px solid #b8ccbf",
            borderTop: "4px solid #068906",
            borderRadius: "16px",
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
};

export default ChatSupport;

// One build serves both app.pitchkraft.ai and data.pitchkraft.ai. Everything
// that differs between the two hosts lives here, keyed by variant, so the rest
// of the app never reads the hostname itself. The variant is resolved at
// runtime from the host, which keeps a single build deployable to both;
// REACT_APP_SITE forces one for local dev, where the host is always localhost.

export type SiteVariant = "app" | "data";

type SiteConfig = {
  variant: SiteVariant;
  /* The promo document is locked to its own native size and cannot be reshaped
     by sizing the frame, so each variant declares the size its page is built
     at (see LoginPage, which stretches the frame onto the panel). */
  promo: { url: string; width: number; height: number };
};

const SITES: Record<SiteVariant, SiteConfig> = {
  app: {
    variant: "app",
    promo: {
      url: "https://www.pitchkraft.ai/iframe-product-updates",
      width: 945,
      height: 535,
    },
  },
  data: {
    variant: "data",
    promo: {
      url: "https://www.dataji.co/iframe-product-updates",
      width: 945,
      height: 535,
    },
  },
};

const STORAGE_KEY = "pk.site";

/* Plesk is www-canonical and 301s the bare host, so visitors land on
   www.data.pitchkraft.ai, not data.pitchkraft.ai -- strip the prefix before
   matching or every real visitor falls through to the app variant. */
const variantForHost = (host: string): SiteVariant | null =>
  host.toLowerCase().replace(/^www\./, "").startsWith("data.") ? "data" : null;

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

const resolveVariant = (): SiteVariant => {
  const forced = process.env.REACT_APP_SITE as SiteVariant | undefined;
  if (forced && SITES[forced]) return forced;

  if (typeof window === "undefined") return "app";

  /* The host we are actually served from decides it whenever it can, so a
     direct visit never depends on anything below. */
  const own = variantForHost(window.location.hostname);
  if (own) return own;

  /* data.pitchkraft.ai is a FRAMESET wrapping www.app.pitchkraft.ai, so inside
     that frame our own hostname is the app's and the check above cannot see
     the data site. Only trust the fallbacks when we really are framed, or a
     stale stored value would follow the user into a direct app visit. */
  const framed = (() => {
    try {
      return window.top !== window.self;
    } catch {
      /* A cross-origin top is itself proof that we are framed. */
      return true;
    }
  })();
  if (!framed) return "app";

  /* An explicit ?site= on the frame src wins and is remembered, because the
     app reloads itself inside the frame (login, refresh) and the query is
     gone by then. sessionStorage is per tab, so it dies with the frame. */
  const requested = new URLSearchParams(window.location.search).get("site") as SiteVariant | null;
  if (requested && SITES[requested]) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, requested);
    } catch {
      /* Private mode or blocked storage -- the referrer check still covers us. */
    }
    return requested;
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY) as SiteVariant | null;
    if (stored && SITES[stored]) return stored;
  } catch {
    /* ignore */
  }

  /* Last resort: the frameset document is our referrer, which needs no change
     on the data server at all. It is dropped under some referrer policies,
     hence the explicit param above. */
  return variantForHost(hostOf(document.referrer)) ?? "app";
};

const siteConfig: SiteConfig = SITES[resolveVariant()];

export default siteConfig;

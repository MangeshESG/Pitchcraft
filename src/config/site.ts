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
      url: "https://www.dataji.co/iframe-page",
      width: 945,
      height: 535,
    },
  },
};

const resolveVariant = (): SiteVariant => {
  const forced = process.env.REACT_APP_SITE as SiteVariant | undefined;
  if (forced && SITES[forced]) return forced;

  const host = typeof window === "undefined" ? "" : window.location.hostname.toLowerCase();
  return host.startsWith("data.") ? "data" : "app";
};

const siteConfig: SiteConfig = SITES[resolveVariant()];

export default siteConfig;

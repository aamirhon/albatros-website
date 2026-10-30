import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 15 streams <title>/<meta>/canonical/hreflang into the <body> for ordinary
  // user agents (only a short bot list gets them in <head>). Next 14 always put
  // them in <head>; keep that for every client so SEO tags and link previews are
  // delivered exactly as before the upgrade.
  htmlLimitedBots: /.*/,
  images: {
    // Serve every image as its static file, bypassing the /_next/image runtime
    // optimizer. All images in this repo are already pre-normalized for the web
    // (products: uniform 1000x1000 on white; events: compressed webp), so the
    // optimizer adds no quality, only cost: on shared Hostinger hosting each
    // uncached transform takes 1-2s of sharp CPU, the cache is wiped on every
    // redeploy, and a catalog page requesting dozens of transforms at once
    // times out and renders broken product/event photos until the cache warms.
    // Static serving removes that whole failure class.
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);

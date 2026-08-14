import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inter, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactProvider } from "@/components/ui/ContactModal";
import { ParticleFieldProvider } from "@/components/ui/ParticleField3";
import { InlineSplash } from "@/components/home/InlineSplash";
import { Analytics } from "@/components/seo/Analytics";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, type AppLocale } from "@/lib/seo";

// Inter is the single typeface site-wide: body weights 400–600 AND heading
// weights 700/800 (headings were Syne, which has no Cyrillic - dropped so RU/UZ
// match). latin-ext covers the Uzbek modifier letters (oʻ/gʻ/ʼ), cyrillic covers RU.
const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-mono", display: "swap" });

// Bounded is the display face for headings in BOTH locales. Verified with
// fontTools: the variable file carries the FULL Cyrillic block (all RU letters)
// plus the Uzbek modifier letters ʻ/ʼ (U+02BB / U+02BC), so RU and UZ headings
// both render in real Bounded (no missing-glyph squares). Weight axis 200-900
// covers the 700/800 heading weights; Inter stays the fallback.
const bounded = localFont({
  src: "../../fonts/Bounded-Variable.ttf",
  weight: "200 900",
  variable: "--font-bounded",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const TITLE = {
    ru: "Albatros Health Care | Лабораторное оборудование",
    uz: "Albatros Health Care | Laboratoriya uskunalari",
    en: "Albatros Health Care | Laboratory Equipment",
  };
  const DESCRIPTION = {
    ru: "Официальный дистрибьютор SNIBE, BD, Randox, Dymind, Werfen, Illumina и других мировых лидеров лабораторной и медицинской диагностики в Узбекистане. Поставка под ключ, сервис 24/7.",
    uz: "SNIBE, BD, Randox, Dymind, Werfen, Illumina va boshqa laboratoriya va tibbiy diagnostika yetakchilarining Oʻzbekistondagi rasmiy distribyutori. Kalit topshirish asosida yetkazib berish, 24/7 servis.",
    en: "Official distributor of SNIBE, BD, Randox, Dymind, Werfen, Illumina and other global laboratory and medical diagnostics leaders in Uzbekistan. Turnkey supply, 24/7 service.",
  };
  const OG_LOCALE = { ru: "ru_RU", uz: "uz_UZ", en: "en_US" };
  const l = (routing.locales as readonly string[]).includes(locale) ? (locale as AppLocale) : routing.defaultLocale;
  return {
    metadataBase: new URL(SITE_URL),
    // No title.template: page titles are built brand-first in pageMetadata
    // (brandTitle) so the company name leads. `default` is the root fallback.
    title: TITLE[l],
    description: DESCRIPTION[l],
    openGraph: {
      type: "website",
      siteName: "Albatros Health Care",
      locale: OG_LOCALE[l],
      images: ["/logo.png"],
    },
    twitter: { card: "summary_large_image", images: ["/logo.png"] },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable} ${bounded.variable}`}>
      <body>
        {/* The particle-mark preload lives on the homepage page component now:
            only the homepage plays the mark assembly, so preloading it on every
            route wasted bytes on inner pages. */}
        <OrganizationJsonLd locale={locale as AppLocale} />
        {/* Single-stage inline CSS loader only; the canvas <Splash> is intentionally
            NOT mounted so there is no second helix intro after hydration. */}
        <InlineSplash />
        <NextIntlClientProvider messages={messages}>
          <ContactProvider>
            {/* Site-wide particle field (fixed z-0 canvas). relative z-1 on
                main and the footer wrapper keeps all content above it. */}
            <ParticleFieldProvider>
              <Navbar />
              <main className="relative z-[1]">{children}</main>
              <div className="relative z-[1]">
                <Footer />
              </div>
            </ParticleFieldProvider>
          </ContactProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}

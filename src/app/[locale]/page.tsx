import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { pageMetadata, type AppLocale } from "@/lib/seo";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsBar } from "@/components/home/StatsBar";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { PartnersMarquee } from "@/components/home/PartnersMarquee";
import { ClientsMarquee } from "@/components/home/ClientsMarquee";
import { ServicesSection } from "@/components/home/ServicesSection";
import { EventsTimeline } from "@/components/home/EventsTimeline";
import { ContactCTA } from "@/components/home/ContactCTA";
import { getFeatured } from "@/lib/catalog";

// Below-the-fold carousel pulls in embla - code-split it (ssr stays on, so the
// SSR HTML is unchanged) to keep it out of the initial client bundle.
const FeaturedProducts = dynamic(() =>
  import("@/components/home/FeaturedProducts").then((m) => m.FeaturedProducts)
);
// Below-the-fold client section: code-split so its JS (count-up + intersection
// observer) stays out of the initial homepage bundle. SSR stays on.
const AboutSection = dynamic(() =>
  import("@/components/home/AboutSection").then((m) => m.AboutSection)
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    // pageMetadata prepends the brand (brandTitle), so pass only the page
    // portion; the tab reads "Albatros Health Care | <home title>".
    path: "/",
    title: t("home.title"),
    description: t("home.description"),
  });
}

export default function HomePage() {
  return (
    <>
      {/* Preload the particle mark so it is decoded before the field's intro
          reaches its scan-print phase. Lives HERE (not the shared layout)
          because only the homepage plays the mark assembly; inner routes
          start the field at rest and never fetch the mark. */}
      <link rel="preload" as="image" href="/images/albatros-helix-mark3.png" />
      <HeroSection />
      {/* relative z-1 lifts every below-hero section above the fixed z-0
          particle field (mounted site-wide in the layout); the hero's own
          content is already z-10 */}
      <div className="relative z-[1]">
        <StatsBar />
        <CategoriesGrid />
        <FeaturedProducts products={getFeatured()} />
        <PartnersMarquee />
        <ClientsMarquee />
        <AboutSection />
        <ServicesSection />
        <EventsTimeline />
        <ContactCTA />
      </div>
    </>
  );
}

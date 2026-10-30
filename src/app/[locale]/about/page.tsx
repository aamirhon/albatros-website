import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { totalPositions } from "@/lib/catalog";
import { pageMetadata, type AppLocale } from "@/lib/seo";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { ServicesSection } from "@/components/home/ServicesSection";
import { ContactCTA } from "@/components/home/ContactCTA";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/about",
    title: t("about.title"),
    description: t("about.description"),
  });
}

const stats = [
  { end: 45, suffix: "+", key: "models" },
  { end: 17, key: "directions" },
  { end: 13, key: "leaders" },
  { end: 85, key: "conferences" },
  { end: 24, key: "congresses" },
  { end: totalPositions(), suffix: "+", key: "assortment" },
  { end: 4500, suffix: "+", key: "doctors" },
  { end: 900, suffix: "+", key: "clients" },
];

export default function AboutPage() {
  const t = useTranslations("aboutPage");
  return (
    <div className="pt-24 md:pt-28">
      <div className="container-x">
        <div className="section-card px-6 py-8 md:px-10">
        <ScrollReveal>
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-red">{t("eyebrow")}</span>
          <h1 className="mt-3 max-w-3xl font-display text-[clamp(26px,6.5vw,36px)] font-extrabold leading-tight text-text-primary md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-[1.8] text-text-secondary">{t("intro1")}</p>
          <p className="mt-5 max-w-3xl text-base leading-[1.8] text-text-secondary">
            {t("intro2")} <span className="font-mono text-brand-blue-deep">{t("slogan")}</span>
          </p>
        </ScrollReveal>

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-bg-border pt-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.key} className="text-center">
              <div className="font-display text-2xl font-bold text-brand-blue-deep sm:text-3xl md:text-4xl">
                <AnimatedCounter end={s.end} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-xs text-text-secondary sm:text-[13px]">{t(`stats.${s.key}`)}</div>
            </div>
          ))}
        </div>
        </div>
      </div>

      <div className="mt-16">
        <ServicesSection />
      </div>

      <ContactCTA />
    </div>
  );
}

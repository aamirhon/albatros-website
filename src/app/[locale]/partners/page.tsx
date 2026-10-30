import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { brands } from "@/lib/catalog";
import { clients } from "@/data/clients";
import { brandSpecialty, brandDescription, brandCountry, clientDescription } from "@/data/i18n";
import { isRoundish } from "@/lib/logoChip";
import { pageMetadata, type AppLocale } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ExpandableText } from "@/components/partners/ExpandableText";
import { CappedList } from "@/components/ui/CappedList";
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
    path: "/partners",
    title: t("partners.title"),
    description: t("partners.description"),
  });
}

export default function PartnersPage() {
  const t = useTranslations("partners");
  const tcl = useTranslations("clients");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <div className="pt-24 md:pt-28">
      <div className="container-x">
        <ScrollReveal>
        <div className="section-card px-6 py-6 md:px-8">
          {/* Reuse the homepage foreign-partners heading ("Наши зарубежные
              партнёры") so the wording matches the homepage in every locale. */}
          <h1 className="font-display text-4xl font-extrabold text-text-primary md:text-5xl">{t("homeTitle")}</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">{t("pageSubtitle")}</p>
        </div>
        </ScrollReveal>

        {/* Foreign partners (the brands we distribute). Logo on top, short text
            below with an "ещё" toggle, plus a link to the brand detail page. */}
        <CappedList count={brands.length} className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b, i) => (
            <ScrollReveal key={b.id} delay={(i % 3) * 0.06}>
              <div
                id={`partner-${b.id}`}
                className="partner-card flex h-full flex-col rounded-2xl border border-bg-border bg-bg-card p-6 shadow-[0_1px_2px_rgba(16,40,90,0.04)]"
              >
                <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-white p-3 shadow-[0_4px_24px_rgba(0,0,0,0.25)] lg:h-20 lg:w-32 lg:p-4">
                  <Image src={b.logo} alt={b.name} width={120} height={48} className="max-h-8 w-auto object-contain lg:max-h-10" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-text-primary">{b.name}</h3>
                {(b.country || b.founded) && (
                  <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-brand-teal">
                    {[brandCountry(b, locale), b.founded && t("since", { year: b.founded })].filter(Boolean).join(" · ")}
                  </div>
                )}
                {brandSpecialty(b, locale) && (
                  <div className="mt-1 text-[13px] font-medium text-brand-blue-deep">{brandSpecialty(b, locale)}</div>
                )}
                <ExpandableText text={brandDescription(b, locale)} className="mt-2" />
                <Link
                  href={`/partners/${b.id}`}
                  className="mt-3 inline-flex items-center gap-1 self-start text-sm font-medium text-brand-red-bright hover:gap-2 hover:underline"
                >
                  {tc("more")}
                  <ArrowRight className="h-3.5 w-3.5 transition-all" />
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </CappedList>

        {/* Local partners (formerly "clients"): logo + short info with a toggle. */}
        <section id="clients" className="mt-12 scroll-mt-28 pb-16">
          <ScrollReveal>
          <div className="section-card px-6 py-6 md:px-8">
            <h2 className="font-display text-3xl font-bold text-text-primary md:text-4xl">{tcl("pageTitle")}</h2>
            <p className="mt-4 font-display text-xl font-bold text-brand-blue-deep md:text-2xl">{tcl("scaleStat")}</p>
            <p className="mt-2 max-w-2xl text-text-secondary">{tcl("scaleNote")}</p>
          </div>
          </ScrollReveal>

          <CappedList
            count={clients.filter((c) => !c.hidden).length}
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {clients.filter((c) => !c.hidden).map((c, i) => {
              const desc = clientDescription(c, locale);
              return (
                <ScrollReveal key={c.id} delay={(i % 3) * 0.06}>
                  <div className="flex h-full flex-col rounded-2xl border border-bg-border bg-bg-card p-6 shadow-[0_1px_2px_rgba(16,40,90,0.04)]">
                    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-white p-3 shadow-[0_4px_24px_rgba(0,0,0,0.25)] lg:h-20 lg:w-32 lg:p-4">
                      {/* Round marks read smaller than wide wordmarks at the same height,
                          so they get the box's full inner height on mobile; at lg both
                          already fill it. This tile is a fixed card, not the marquee chip,
                          so the width stays uniform across the grid. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.logo}
                        alt={c.name}
                        className={`w-auto object-contain lg:max-h-12 ${isRoundish(c.logo) ? "max-h-10" : "max-h-9"}`}
                      />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-text-primary">{c.name}</h3>
                    <ExpandableText text={desc} className="mt-2" />
                  </div>
                </ScrollReveal>
              );
            })}
          </CappedList>
        </section>
      </div>
      <ContactCTA />
    </div>
  );
}

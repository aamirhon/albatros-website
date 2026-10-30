import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getTranslations } from "next-intl/server";
import { events } from "@/lib/catalog";
import { pageMetadata, type AppLocale } from "@/lib/seo";
import { EventsView } from "@/components/events/EventsView";
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
    path: "/events",
    title: t("events.title"),
    description: t("events.description"),
  });
}

export default function EventsPage() {
  const t = useTranslations("events");
  // Hidden events are dropped server-side so they never reach the client payload.
  const visible = events.filter((e) => !e.hidden);
  return (
    <div className="pt-24 md:pt-28">
      <div className="container-x">
        <ScrollReveal>
        <div className="section-card px-6 py-6 md:px-8">
          <h1 className="font-display text-4xl font-extrabold text-text-primary md:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">{t("pageSubtitle")}</p>
        </div>
        </ScrollReveal>
        <EventsView events={visible} />
      </div>
      <ContactCTA />
    </div>
  );
}

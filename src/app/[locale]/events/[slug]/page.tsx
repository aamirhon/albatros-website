import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { events, getEvent } from "@/lib/catalog";
import { eventTitle, eventDescription, eventDate } from "@/data/i18n";
import { pageMetadata, type AppLocale } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { ContactCTA } from "@/components/home/ContactCTA";

const KNOWN_TYPES = [
  "seminar", "conference", "congress", "symposium",
  "exhibition", "installation", "registration", "other",
];

export function generateStaticParams() {
  return events.filter((e) => !e.hidden).map((e) => ({ slug: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const locale = params.locale as AppLocale;
  const e = getEvent(params.slug);
  if (!e) return {};
  return pageMetadata({
    locale,
    path: `/events/${e.id}`,
    title: eventTitle(e, locale),
    description: (eventDescription(e, locale) ?? "").slice(0, 160),
    images: e.images?.length ? e.images : undefined,
  });
}

export default function EventDetailPage({ params }: { params: { slug: string } }) {
  const e = getEvent(params.slug);
  if (!e || e.hidden) notFound();
  const locale = useLocale();
  const t = useTranslations("events");
  const photo = e.images?.[0];
  const title = eventTitle(e, locale);
  const description = eventDescription(e, locale);

  return (
    <div className="pt-24 md:pt-32">
      <article className="container-x max-w-4xl pb-20">
        <div className="section-card px-5 py-6 md:px-8">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-brand-red">
          <ArrowLeft className="h-4 w-4" /> {t("title")}
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-sm text-brand-red">
            <CalendarDays className="h-4 w-4" /> {eventDate(e.date, locale)}
          </span>
          {e.type && KNOWN_TYPES.includes(e.type) && (
            <span className="rounded-full border border-bg-border bg-bg-elevated px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-brand-teal">
              {t(`types.${e.type}`)}
            </span>
          )}
        </div>

        <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-text-primary md:text-4xl">
          {title}
        </h1>

        {photo && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-bg-border bg-white">
            <Image
              src={photo}
              alt={title}
              width={1600}
              height={1200}
              priority
              className="h-auto w-full object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}

        {description && (
          <div className="mt-8 space-y-4 text-[15px] leading-[1.8] text-text-secondary">
            {description.split("\n").filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}
        </div>
      </article>
      <ContactCTA />
    </div>
  );
}

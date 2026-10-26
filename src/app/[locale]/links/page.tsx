import type { Metadata } from "next";
import Image from "next/image";
import { Phone, Mail, Send, Instagram, Facebook, Youtube, Linkedin, Globe, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata, type AppLocale } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    ...pageMetadata({
      locale,
      path: "/links",
      title: t("links.title"),
      description: t("links.description"),
    }),
    robots: { index: false, follow: true },
  };
}

type LinkRow = { icon: LucideIcon; label: string; value: string; href: string };

const rowClass =
  "flex min-h-14 items-center gap-4 rounded-xl border border-bg-border bg-bg-card px-5 py-3 transition-colors hover:border-brand-red";

function Row({ icon: Icon, label, value, href }: LinkRow) {
  const external = href.startsWith("https://");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={rowClass}
    >
      <Icon className="h-5 w-5 shrink-0 text-brand-red" />
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-wide text-text-muted">{label}</span>
        <span className="mt-0.5 block break-words text-[15px] leading-snug text-text-primary">{value}</span>
      </span>
    </a>
  );
}

const social: LinkRow[] = [
  { icon: Instagram, label: "Instagram", value: "@albatros_healthcareuz", href: "https://www.instagram.com/albatros_healthcareuz/" },
  { icon: Facebook, label: "Facebook", value: "albatros.uz", href: "https://www.facebook.com/albatros.uz/" },
  { icon: Youtube, label: "YouTube", value: "@albatroshealthcare", href: "https://www.youtube.com/@albatroshealthcare" },
  { icon: Linkedin, label: "LinkedIn", value: "Albatros Health Care", href: "https://www.linkedin.com/company/albatros-health-care/" },
];

export default function LinksPage() {
  const t = useTranslations("links");
  const tc = useTranslations("contact");

  const contacts: LinkRow[] = [
    { icon: Phone, label: tc("office"), value: "+998 77 756 42 36", href: "tel:+998777564236" },
    { icon: Phone, label: tc("sales"), value: "+998 99 792 79 00", href: "tel:+998997927900" },
    { icon: Mail, label: tc("email"), value: "info@albatros.uz", href: "mailto:info@albatros.uz" },
    { icon: Send, label: tc("telegram"), value: "@ahc_seminars", href: "https://t.me/ahc_seminars" },
  ];

  return (
    <div className="pb-12 pt-24 md:pb-16 md:pt-28">
      <div className="container-x">
        <div className="mx-auto w-full max-w-xl">
          <div className="text-center">
            <Image
              src="/logo.png"
              alt="Albatros Health Care"
              width={1998}
              height={300}
              priority
              className="mx-auto h-9 w-auto object-contain md:h-10"
            />
            <h1 className="mt-6 font-display text-3xl font-extrabold text-text-primary md:text-4xl">Albatros Health Care</h1>
            <p className="mt-3 text-text-secondary">{t("subtitle")}</p>
          </div>

          <h2 className="mb-3 mt-10 font-display text-sm font-bold uppercase tracking-wide text-text-primary">
            {t("contactHeading")}
          </h2>
          <div className="space-y-3">
            {contacts.map((c) => (
              <Row key={c.href} {...c} />
            ))}
          </div>

          <h2 className="mb-3 mt-10 font-display text-sm font-bold uppercase tracking-wide text-text-primary">
            {t("socialHeading")}
          </h2>
          <div className="space-y-3">
            {social.map((c) => (
              <Row key={c.href} {...c} />
            ))}
          </div>

          <Link
            href="/"
            className="mt-10 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-brand-red px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Globe className="h-5 w-5" />
            {t("website")}
          </Link>
        </div>
      </div>
    </div>
  );
}

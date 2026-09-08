import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getTranslations } from "next-intl/server";
import { pageMetadata, type AppLocale } from "@/lib/seo";
import { ContactForm } from "@/components/contact/ContactForm";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = params.locale as AppLocale;
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("contact.title"),
    description: t("contact.description"),
  });
}

const contacts: { icon: typeof MapPin; key: string; valueKey?: string; value?: string; href?: string }[] = [
  { icon: MapPin, key: "address", valueKey: "addressValue" },
  { icon: Phone, key: "office", value: "+998 77 756 42 36", href: "tel:+998777564236" },
  { icon: Phone, key: "sales", value: "+998 99 792 79 00", href: "tel:+998997927900" },
  { icon: Mail, key: "email", value: "info@albatros.uz", href: "mailto:info@albatros.uz" },
  { icon: Clock, key: "hours", valueKey: "hoursValue" },
  { icon: Send, key: "telegram", value: "@ahc_seminars", href: "https://t.me/ahc_seminars" },
];

// Yandex Maps widget UI locales. Yandex does NOT ship an Uzbek widget locale
// (supported set is ru_RU / en_US / tr_TR / uk_UA ...), so UZ falls back to
// Russian rather than English. ru is the default for anything unexpected.
const YANDEX_LANG: Record<string, string> = { ru: "ru_RU", en: "en_US", uz: "ru_RU" };

export default function ContactPage() {
  const t = useTranslations("contact");
  const locale = useLocale();
  const mapLang = YANDEX_LANG[locale] ?? "ru_RU";
  return (
    <div className="pb-12 md:pb-16 pt-24 md:pt-28">
      <div className="container-x">
        <ScrollReveal>
        <div className="section-card px-6 py-6 md:px-8">
          <h1 className="font-display text-4xl font-extrabold text-text-primary md:text-5xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">{t("subtitle")}</p>
        </div>
        </ScrollReveal>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-5">
            {contacts.map((c) => {
              const value = c.valueKey ? t(c.valueKey) : c.value!;
              return (
                <div key={c.key} className="flex items-start gap-4 rounded-xl border border-bg-border bg-bg-card p-5">
                  <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-text-muted">{t(c.key)}</div>
                    {c.href ? (
                      <a href={c.href} className="mt-1 block text-[15px] leading-relaxed text-text-primary hover:text-brand-red">
                        {value}
                      </a>
                    ) : (
                      <div className="mt-1 text-[15px] leading-relaxed text-text-primary">{value}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <ContactForm />
        </div>

        {/* Office location, Yandex Maps embed (public business POI, no personal data). */}
        <div className="section-card mt-8 p-5 md:p-6">
          <h2 className="mb-4 font-display text-xl font-bold text-text-primary">{t("mapTitle")}</h2>
          <div className="overflow-hidden rounded-2xl border border-bg-border">
            <iframe
              // key forces a remount (fresh map load) when the visitor switches
              // locale, so the labels never stay stuck in the previous language.
              key={locale}
              title={t("mapTitle")}
              src={`https://yandex.com/map-widget/v1/?ll=69.257002%2C41.348611&mode=poi&poi%5Bpoint%5D=69.257002%2C41.348611&poi%5Buri%5D=ymapsbm1%3A%2F%2Forg%3Foid%3D232380070353&z=17&lang=${mapLang}`}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[360px] w-full border-0 md:h-[440px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

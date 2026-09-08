import { SITE_URL, absoluteUrl, type AppLocale } from "@/lib/seo";

// Generic JSON-LD injector. Renders one <script type="application/ld+json">.
// Server component: the markup is in the SSR HTML, which is what crawlers read.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Data is built from our own repo data only (no user input), so this is safe.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Organization / MedicalBusiness for the whole site. Only real, public facts.
export function OrganizationJsonLd({ locale }: { locale: AppLocale }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `${SITE_URL}/#organization`,
    name: "Albatros Health Care",
    url: absoluteUrl(locale, "/"),
    logo: `${SITE_URL}/logo.png`,
    image: `${SITE_URL}/logo.png`,
    email: "info@albatros.uz",
    telephone: "+998 77 756 42 36",
    contactPoint: [
      { "@type": "ContactPoint", telephone: "+998 77 756 42 36", contactType: "office" },
      { "@type": "ContactPoint", telephone: "+998 99 792 79 00", contactType: "sales" },
    ],
    foundingDate: "2017",
    address: {
      "@type": "PostalAddress",
      streetAddress: "4-й проезд Чильтуган, 24",
      addressLocality: "Ташкент",
      addressCountry: "UZ",
    },
    areaServed: "UZ",
    sameAs: [
      "https://t.me/ahc_seminars",
      "https://www.instagram.com/albatros_healthcareuz/",
      "https://www.facebook.com/albatros.uz/",
    ],
  };
  return <JsonLd data={data} />;
}

export interface Crumb {
  name: string;
  path: string; // ru (root) path, e.g. "/catalog"
}

// BreadcrumbList following the real navigation path.
export function BreadcrumbJsonLd({ locale, items }: { locale: AppLocale; items: Crumb[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(locale, c.path),
    })),
  };
  return <JsonLd data={data} />;
}

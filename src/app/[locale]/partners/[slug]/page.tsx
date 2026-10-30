import type { Metadata } from "next";
import Image from "next/image";
import { use } from "react";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { brands, products } from "@/lib/catalog";
import type { Brand } from "@/types";
import { brandSpecialty, brandDescription, brandCountry } from "@/data/i18n";
import { pageMetadata, type AppLocale } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ReagentCard } from "@/components/catalog/ReagentCard";

// Partner -> product.brand string. All partners match the product `brand` field by
// name except Thermo Fisher (product brand is "Thermo Fisher", partner is Phadia).
function productBrandOf(b: Brand): string {
  return b.id === "thermofisher" ? "Thermo Fisher" : b.name;
}

export function generateStaticParams() {
  return brands.map((b) => ({ slug: b.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale: rawLocale } = await params;
  const brand = brands.find((b) => b.id === slug);
  if (!brand) return { title: "404" };
  const locale = rawLocale as AppLocale;
  const specialty = brandSpecialty(brand, locale);
  return pageMetadata({
    locale,
    path: `/partners/${brand.id}`,
    title: specialty ? `${brand.name} · ${specialty}` : brand.name,
    description: brandDescription(brand, locale),
    images: [brand.logo],
  });
}

export default function PartnerDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = use(params);
  const brand = brands.find((b) => b.id === slug);
  if (!brand) notFound();
  const items = products.filter((p) => p.brand === productBrandOf(brand));
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const t = useTranslations("partners");
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const tn = useTranslations("nav");

  const meta = [brandCountry(brand, locale), brand.founded && t("since", { year: brand.founded })]
    .filter(Boolean)
    .join(" · ");

  const crumbs = [
    { name: tn("home"), path: "/" },
    { name: tn("partners"), path: "/partners" },
    { name: brand.name, path: `/partners/${brand.id}` },
  ];

  return (
    <div className="pb-16 md:pb-24 pt-24 md:pt-32">
      <BreadcrumbJsonLd locale={locale as AppLocale} items={crumbs} />
      <div className="container-x">
        <div className="section-card px-5 py-6 md:px-8">
        <nav className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-text-secondary">
          <Link href="/" className="hover:text-text-primary">
            {tn("home")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/partners" className="hover:text-text-primary">
            {tn("partners")}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-text-primary">{brand.name}</span>
        </nav>

        <div className="flex flex-col gap-6 rounded-2xl border border-bg-border bg-bg-card p-6 shadow-[0_1px_2px_rgba(16,40,90,0.04)] md:flex-row md:gap-8 md:p-8">
          <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
            <Image src={brand.logo} alt={brand.name} width={150} height={56} className="max-h-14 w-auto object-contain" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-text-primary md:text-4xl">{brand.name}</h1>
            {meta && (
              <div className="mt-2 font-mono text-[12px] uppercase tracking-wide text-brand-teal">{meta}</div>
            )}
            {brandSpecialty(brand, locale) && (
              <div className="mt-1 text-sm font-medium text-brand-blue-deep">{brandSpecialty(brand, locale)}</div>
            )}
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-secondary">
              {brandDescription(brand, locale)}
            </p>
            {brand.url && (
              <a
                href={brand.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-red-bright hover:underline"
              >
                {t("officialSite")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold text-text-primary">{t("detailProducts")}</h2>
          {items.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((p) =>
                // Imageless reagents/consumables/controls render the clean
                // text-only ReagentCard (no icon-placeholder image area that
                // just repeated the name and brand), matching the catalog.
                p.imageless ? (
                  <ReagentCard key={p.slug} product={p} />
                ) : (
                  <ProductCard key={p.slug} product={p} />
                )
              )}
            </div>
          ) : (
            <p className="text-text-secondary">{t("noProducts")}</p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useStrandGuard } from "@/components/ui/useStrandGuard";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { directions, categoryCount, generalDirections, directionPositions } from "@/lib/catalog";
import { categoryAccent } from "@/lib/categoryAccents";
import { categoryLabel } from "@/data/i18n";

/** Below lg the grid is capped to this many cards until "Показать все" is tapped. */
const MOBILE_CAP = 4;

/**
 * "Направления диагностики" - photo-card grid ported pixel-for-pixel from the
 * Claude Design "Albatros Directions" prototype. Only directions that have at
 * least one catalog product are shown; counts are computed live from the catalog.
 */
export function CategoriesGrid() {
  const locale = useLocale();
  const t = useTranslations("directions");
  const tc = useTranslations("common");
  const items = directions
    .map((d) => ({ ...d, count: categoryCount(d.name) }))
    .filter((d) => d.count > 0);
  const [expanded, setExpanded] = useState(false);
  const { ref, guard } = useStrandGuard<HTMLDivElement>();
  const capped = items.length > MOBILE_CAP;

  // All cards stay in the DOM (hydration-safe, no layout shift); below lg the
  // .dir-collapsed rule in globals.css hides everything past MOBILE_CAP.
  const toggle = () => {
    setExpanded((v) => {
      if (v) guard(); // collapsing: keep the visitor next to the grid
      return !v;
    });
  };

  return (
    <section className="px-6 py-8 md:pb-16 md:pt-14" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="section-card" style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 28px 44px" }}>
        <ScrollReveal>
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "var(--font-mono), var(--font-inter), monospace",
              fontSize: 13,
              letterSpacing: ".18em",
              color: "#2E8AA0",
              marginBottom: 18,
            }}
          >
            {t("eyebrow", { count: items.length })}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-bounded), var(--font-inter), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(30px,7vw,46px)",
              lineHeight: 1.05,
              color: "#0C1B3A",
              margin: 0,
            }}
          >
            {t("title")}
          </h2>
        </div>
        </ScrollReveal>

        {/* General directions (top level of the taxonomy) - click to open the catalog filtered */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(248px,1fr))", gap: 14, marginBottom: 34, alignItems: "stretch" }}>
          {generalDirections.map((g) => (
            <Link
              key={g.key}
              href={`/catalog?direction=${g.key}`}
              className="alb-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                textDecoration: "none",
                background: "rgba(255,255,255,0.92)",
                border: "1px solid #E5EAF3",
                borderRadius: 14,
                padding: "18px 20px",
              }}
            >
              <span style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 700, fontSize: 17, color: "#0C1B3A" }}>
                {categoryLabel(g.name, locale)}
              </span>
              {directionPositions(g.key) > 0 && (
                <span style={{ fontFamily: "var(--font-mono), var(--font-inter), monospace", fontSize: 12, color: "#5E6E8F" }}>
                  {directionPositions(g.key)} {tc("positions")}
                </span>
              )}
              <span style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: 13, lineHeight: 1.5, color: "#5E6E8F", marginTop: 2 }}>
                {t(`tileDesc.${g.key}`)}
              </span>
            </Link>
          ))}
        </div>

        <div ref={ref} className="scroll-mt-24">
        <div
          className={cn(capped && !expanded && "dir-collapsed")}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(244px,1fr))", gap: 18 }}
        >
          {items.map((item) => {
            const accent = categoryAccent(item.name);
            return (
            <Link
              key={item.name}
              href={`/catalog?category=${encodeURIComponent(item.name)}`}
              className="alb-card"
              style={{
                display: "flex",
                flexDirection: "column",
                textDecoration: "none",
                background: "rgba(255,255,255,0.92)",
                border: "1px solid #E5EAF3",
                borderTop: `3px solid ${accent}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <div
                className="alb-photo"
                style={{
                  position: "relative",
                  height: 188,
                  background: "#FFFFFF",
                  borderBottom: "1px solid #EDF1F8",
                  overflow: "hidden",
                }}
              >
                <Image
                  src={item.img}
                  alt={item.name}
                  fill
                  sizes="244px"
                  style={{ objectFit: "contain", padding: 10 }}
                />
              </div>
              <div style={{ padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-mono), var(--font-inter), monospace", fontSize: 11, letterSpacing: ".08em", color: "#2E8AA0" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                  {item.brand}
                </div>
                <div style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 700, fontSize: 18, lineHeight: 1.2, color: "#0C1B3A" }}>
                  {categoryLabel(item.name, locale)}
                </div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono), var(--font-inter), monospace", fontSize: 12, color: "#5E6E8F" }}>
                    {item.count} {tc("positions")}
                  </span>
                  <span className="alb-go" style={{ fontSize: 13, fontWeight: 600, color: "#2E549C" }}>
                    {tc("view")} →
                  </span>
                </div>
              </div>
            </Link>
            );
          })}
        </div>

        {/* Mobile/tablet only - desktop already shows the full grid. */}
        {capped && (
          <div className="mt-8 flex justify-center lg:hidden">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={expanded}
              className="inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-card px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-brand-blue-light"
            >
              {expanded ? tc("collapse") : tc("showAll")}
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </button>
          </div>
        )}
        </div>
      </div>
    </section>
  );
}

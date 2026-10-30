"use client";

import type { MouseEvent, ReactNode } from "react";
import { useLocale } from "next-intl";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ym?: (...args: unknown[]) => void;
  }
}

// Same counter id as src/components/seo/Analytics.tsx (public id, env override).
const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID || "110885927");

/**
 * Root container of /links. One delegated click handler reports clicks on
 * elements carrying data-track / data-track-type to GA4 and Yandex Metrica.
 * It never calls preventDefault and never delays navigation; if gtag or ym
 * are missing (ad blockers) it silently does nothing.
 */
export function LinksClickTracker({ className, children }: { className?: string; children: ReactNode }) {
  const locale = useLocale();

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as Element | null)?.closest?.("[data-track]");
    if (!el || !e.currentTarget.contains(el)) return;
    const name = el.getAttribute("data-track");
    const type = el.getAttribute("data-track-type");
    if (!name || !type) return;
    try {
      window.gtag?.("event", "links_click", { button_name: name, link_type: type, page_locale: locale });
    } catch {}
    try {
      window.ym?.(YM_ID, "reachGoal", "links_click", { button: name, type });
    } catch {}
  };

  return (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  );
}

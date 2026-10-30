import type { Metadata } from "next";
import Image from "next/image";
import { Phone, Mail, Send, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { pageMetadata, type AppLocale } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
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

const tileClass =
  "flex flex-col items-center justify-center gap-1.5 rounded-[14px] border border-bg-border bg-bg-card px-2 py-[clamp(6px,1vh,12px)] text-center lg:gap-2 lg:px-3 lg:py-[14px] min-[1920px]:gap-3 min-[1920px]:px-4 min-[1920px]:py-[26px] shadow-[0_1px_2px_rgba(16,40,90,0.04)] transition-colors hover:border-brand-red focus-visible:border-brand-red";
const iconBox = "flex h-[clamp(32px,5vh,40px)] items-center justify-center lg:h-12 min-[1920px]:h-[72px]";
const tileLabel = "text-[10.5px] font-normal uppercase tracking-wide text-text-muted lg:text-[13px] min-[1920px]:text-base";
const headingClass = "font-display text-[13px] font-bold uppercase tracking-wide text-text-primary lg:text-[17px] min-[1920px]:text-2xl";
const headingGap = "mb-[clamp(6px,1.4vh,14px)] mt-[clamp(10px,2.8vh,32px)] lg:mb-3 lg:mt-6 min-[1920px]:mb-[18px] min-[1920px]:mt-9";
const gridGap = "gap-[clamp(6px,1vh,10px)] lg:gap-3 min-[1920px]:gap-5";

function Logo({ src, wide }: { src: string; wide?: boolean }) {
  return wide ? (
    <span className={`${iconBox} w-full`}>
      <Image src={src} alt="" width={1990} height={563} unoptimized className="h-full w-full object-contain" />
    </span>
  ) : (
    <span className={`${iconBox} w-[clamp(32px,5vh,40px)] lg:w-12 min-[1920px]:w-[72px]`}>
      <Image src={src} alt="" width={56} height={56} unoptimized className="h-full w-full object-contain" />
    </span>
  );
}

const social = [
  { src: "/images/social/telegram.svg", label: "Telegram", href: "https://t.me/ahc_seminars" },
  { src: "/images/social/instagram.svg", label: "Instagram", href: "https://www.instagram.com/albatros_healthcareuz/" },
  { src: "/images/social/facebook.svg", label: "Facebook", href: "https://www.facebook.com/albatros.uz/" },
  { src: "/images/social/youtube.svg", label: "YouTube", href: "https://www.youtube.com/@albatroshealthcare" },
  { src: "/images/social/linkedin.svg", label: "LinkedIn", href: "https://www.linkedin.com/company/albatros-health-care/" },
];

const GREEN = "bg-[#16A34A]";
const TEAL = "bg-[#4E9E8E]";
const TG_BLUE = "bg-[#229ED9]";

type Btn = {
  icon: LucideIcon;
  block: string;
  label: string;
  href: string;
  aria: string;
  plainCase?: boolean;
  span?: boolean;
  number?: string;
};

function Button({ icon: Icon, block, label, href, aria, plainCase, span, number }: Btn) {
  const external = href.startsWith("https://");
  return (
    <a
      href={href}
      aria-label={aria}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`flex min-h-[clamp(40px,6.4vh,60px)] overflow-hidden lg:min-h-[58px] min-[1920px]:min-h-20 rounded-[14px] border border-bg-border bg-bg-card shadow-[0_1px_2px_rgba(16,40,90,0.04)] transition-colors hover:border-brand-red focus-visible:border-brand-red ${
        span ? "col-span-2 max-[389px]:col-span-1" : ""
      }`}
    >
      <span className={`flex w-11 shrink-0 items-center justify-center lg:w-[60px] min-[1920px]:w-20 ${block}`}>
        <Icon className="h-5 w-5 text-white lg:h-6 lg:w-6 min-[1920px]:h-[30px] min-[1920px]:w-[30px]" />
      </span>
      <span
        className={`flex flex-1 flex-col justify-center px-3 py-[clamp(6px,1vh,10px)] text-[10.5px] font-semibold leading-snug tracking-wide text-text-muted lg:px-[18px] lg:py-2.5 lg:text-[13px] min-[1920px]:px-[22px] min-[1920px]:py-3 min-[1920px]:text-base ${
          plainCase ? "" : "uppercase"
        }`}
      >
        {label}
        {number && (
          <span
            aria-hidden="true"
            className="hidden font-normal normal-case leading-none tracking-normal tabular-nums text-text-primary lg:mt-0.5 lg:block lg:text-[15px] min-[1920px]:text-[18px]"
          >
            {number}
          </span>
        )}
      </span>
    </a>
  );
}

export default function LinksPage() {
  const t = useTranslations("links");

  const phone = (icon: LucideIcon, key: string, tel: string, shown: string, block = GREEN): Btn => ({
    icon,
    block,
    label: t(key),
    href: `tel:${tel}`,
    aria: `${t(key)}, ${shown}`,
    number: shown,
  });

  const contacts: Btn[] = [
    phone(Phone, "officeTashkent", "+998777564236", "+998 77 756 42 36"),
    { icon: Mail, block: TEAL, label: "info@albatros.uz", href: "mailto:info@albatros.uz", aria: "info@albatros.uz", plainCase: true },
    phone(Phone, "officeSamarkand", "+998771351115", "+998 77 135 11 15"),
    phone(Phone, "officeNamangan", "+998959402000", "+998 95 940 20 00"),
  ];

  const services: Btn[] = [
    phone(Phone, "sales", "+998997927900", "+998 99 792 79 00"),
    phone(Phone, "techService", "+998772681122", "+998 77 268 11 22"),
    { icon: Send, block: TG_BLUE, label: t("reagents"), href: "https://t.me/albazakaz", aria: t("reagents"), span: true },
  ];

  return (
    <div className="pb-8 pt-[calc(4rem+clamp(10px,2vh,20px))] md:pb-12 md:pt-[calc(5rem+clamp(10px,2vh,20px))] lg:flex lg:pb-[clamp(10px,2vh,20px)] lg:flex-1 lg:flex-col lg:justify-center">
      <div className="container-x">
        <div className="mx-auto w-full max-w-xl lg:max-w-[760px] min-[1920px]:max-w-[1120px]">
          <h2 className={`${headingClass} mb-[clamp(6px,1.4vh,14px)] lg:mb-3 min-[1920px]:mb-[18px]`}>{t("socialHeading")}</h2>
          <div className={`grid grid-cols-2 lg:grid-cols-3 ${gridGap}`}>
            <Link href="/" className={tileClass}>
              <Logo src="/images/social/site.svg" wide />
              <span className={tileLabel}>{t("site")}</span>
            </Link>
            {social.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className={tileClass}>
                <Logo src={s.src} />
                <span className={tileLabel}>{s.label}</span>
              </a>
            ))}
          </div>

          <h2 className={`${headingClass} ${headingGap}`}>{t("contactHeading")}</h2>
          <div className={`grid grid-cols-2 ${gridGap}`}>
            {contacts.map((b) => (
              <Button key={b.href} {...b} />
            ))}
          </div>

          <h2 className={`${headingClass} ${headingGap}`}>{t("servicesHeading")}</h2>
          <div className={`grid grid-cols-2 max-[389px]:grid-cols-1 ${gridGap}`}>
            {services.map((b) => (
              <Button key={b.href} {...b} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Locale } from "@/lib/locale";

/** Bayraqlar SVG ilədir (emoji bayraqlar Windows-da görünmür). az: Azərbaycan, en: Birləşmiş Krallıq, ru: Rusiya, tr: Türkiyə. */
export function Flag({ locale, className = "h-4 w-6" }: { locale: Locale; className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={`${className} shrink-0 rounded-[3px] ring-1 ring-black/10`} aria-hidden>
      <defs><clipPath id={`flag-${locale}`}><rect width="24" height="16" rx="2" /></clipPath></defs>
      <g clipPath={`url(#flag-${locale})`}>
        {locale === "az" && (<>
          <rect width="24" height="5.34" fill="#00b5e2" />
          <rect y="5.33" width="24" height="5.34" fill="#ef3340" />
          <rect y="10.66" width="24" height="5.34" fill="#509e2f" />
          <circle cx="11.2" cy="8" r="2.6" fill="#fff" />
          <circle cx="12" cy="8" r="2.1" fill="#ef3340" />
          <polygon points="14.4,6.9 14.85,7.75 15.8,7.85 15.1,8.5 15.3,9.45 14.4,9 13.5,9.45 13.7,8.5 13,7.85 13.95,7.75" fill="#fff" />
        </>)}
        {locale === "en" && (<>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2" />
          <path d="M0 0L24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.1" />
          <path d="M12 0V16M0 8H24" stroke="#fff" strokeWidth="5" />
          <path d="M12 0V16M0 8H24" stroke="#c8102e" strokeWidth="2.8" />
        </>)}
        {locale === "tr" && (<>
          <rect width="24" height="16" fill="#e30a17" />
          <circle cx="9" cy="8" r="4" fill="#fff" />
          <circle cx="10.2" cy="8" r="3.2" fill="#e30a17" />
          <polygon points="11.60,8.00 13.01,7.50 13.05,6.00 13.96,7.19 15.40,6.77 14.55,8.00 15.40,9.23 13.96,8.81 13.05,10.00 13.01,8.50" fill="#fff" />
        </>)}
        {locale === "ru" && (<>
          <rect width="24" height="5.34" fill="#fff" />
          <rect y="5.33" width="24" height="5.34" fill="#0039a6" />
          <rect y="10.66" width="24" height="5.34" fill="#d52b1e" />
        </>)}
      </g>
    </svg>
  );
}

"use client";
// Çatda elan kartları: saytdakı vidjetin (ai-project-backend/widget/widget.js → cards()) EYNİ görünüşü və sahələri.
// Sınaq söhbətində sahib müştərinin görəcəyini dəqiq görməlidir: alt-alta kartlar, solda 68px şəkil, sağda başlıq,
// qiymət (vidjet rəngində), il · yürüş və "Elana bax →". Şəkil açılmasa vidjetdəki kimi sadəcə gizlənir.
// widget.js-də kart dəyişsə, bura da eyni dəyişiklik edilməlidir.
import { useState } from "react";
import type { Listing } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// widget.js-dəki fmt ilə eyni: tam ədəd, minliklər boşluqla
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

function Photo({ src }: { src: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return null;
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className="size-[68px] flex-none rounded-lg bg-muted object-cover" />;
}

/** accent: vidjetin rəngi (Çatın görünüşü). Verilməsə panelin əsas rəngi. */
export function ListingCards({ listings, accent }: { listings: Listing[]; accent?: string }) {
  const { t } = useI18n();
  const list = listings.filter((l) => l && l.title).slice(0, 10); // vidjet də ən çox 10 göstərir
  if (!list.length) return null;
  const color = accent ? { color: accent } : undefined;
  return (
    <div className="flex w-full flex-col gap-2" role="list" aria-label={t("Tapılan elanlar")}>
      {list.map((l) => {
        const meta = [l.year ? String(l.year) : null, typeof l.mileage === "number" ? `${fmt(l.mileage)} km` : null].filter(Boolean).join(" · ");
        const kids = (
          <>
            {isUrl(l.image) && <Photo src={l.image} />}
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-[1.3]">{l.title}</div>
              {typeof l.price === "number" && <div className="mt-0.5 text-sm font-semibold" style={color}>{fmt(l.price)} {l.currency ?? ""}</div>}
              {meta && <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>}
              {isUrl(l.url) && <div className="mt-1 text-xs" style={color}>{t("Elana bax")} →</div>}
            </div>
          </>
        );
        const cls = "flex gap-2.5 rounded-xl border border-border bg-card p-2 text-inherit no-underline";
        return isUrl(l.url)
          ? <a key={l.id} role="listitem" href={l.url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-foreground/40`}>{kids}</a>
          : <div key={l.id} role="listitem" className={cls}>{kids}</div>;
      })}
    </div>
  );
}

"use client";
// Köməkçinin canlı önizləməsi (Profil və Bacarıqlar səhifələrinin sağında): dəyişikliyi saxlayıb dərhal yoxlamaq üçün.
import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { chat, getListings, type ChatMessage, type Listing } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { cn } from "@/lib/utils";

/** Müştərinin öz kataloqundan (yoxdursa neytral) nümunə suallar */
export function useSampleIdeas(): string[] {
  const { t, num } = useI18n();
  const { tenant } = useSession();
  const mode = tenant?.config.profile?.mode ?? "listings";
  const [sample, setSample] = useState<Listing[]>([]);
  useEffect(() => {
    if (mode === "support") return;
    getListings({}).then((r) => setSample(r.listings.slice(0, 20))).catch(() => {});
  }, [mode]);
  const supportIdeas = [t("Çatdırılma neçə gün çəkir?"), t("Geri qaytarma qaydaları hansılardır?"), t("Hansı ödəniş üsulları var?"), t("Sizinlə necə əlaqə saxlaya bilərəm?")];
  const priced = sample.filter((l) => typeof l.price === "number" && l.price > 0);
  const named = sample.find((l) => l.title);
  const sorted = [...priced].sort((a, b) => a.price! - b.price!);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]!.price! : 0;
  const budget = median >= 100 ? Math.round(median / 10) * 10 : median;
  const cur = priced[0]?.currency ?? "";
  const listingIdeas = [
    budget ? (cur ? t("Büdcəm {n} {cur}-dir, nə təklif edirsən?", { n: num(budget), cur }) : t("Büdcəm {n}-dir, nə təklif edirsən?", { n: num(budget) })) : t("Mənə ən ucuz variantları göstər"),
    named ? t("“{title}” haqqında ətraflı məlumat ver", { title: named.title.slice(0, 50) }) : t("Mənə ən uyğun variantı tövsiyə et"),
    t("Mənə ən ucuz variantları göstər"),
    t("Ən populyar 3 variantı müqayisə et"),
  ];
  return [...new Set(mode === "support" ? supportIdeas : mode === "both" ? [listingIdeas[0]!, listingIdeas[1]!, supportIdeas[0]!, supportIdeas[1]!] : listingIdeas)].slice(0, 4);
}

/** **qalın** və [mətn](link) */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
      {parts.map((p, i) => {
        if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        return m ? <a key={i} href={m[2].replace(/ /g, "%20")} target="_blank" rel="noreferrer" className="text-primary underline">{m[1]}</a> : p;
      })}
    </p>
  );
}

export function AssistantPreview({ name, className }: { name: string; className?: string }) {
  const { t, num } = useI18n();
  const ideas = useSampleIdeas();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  async function send(text: string) {
    const v = text.trim();
    if (!v || busy) return;
    const history = messages;
    setMessages([...history, { role: "user", text: v }]);
    setInput(""); setBusy(true); setError("");
    try {
      const r = await chat(v, history);
      setMessages((m) => [...m, { role: "model", text: r.answer, listings: r.listings, sources: r.sources, unanswered: r.unanswered }]);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className={cn("flex h-full min-h-[32rem] flex-col rounded-[28px] border border-border bg-muted/40 p-3 shadow-sm", className)}>
      <div className="relative flex items-center justify-center py-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm font-semibold shadow-sm ring-1 ring-border/60">
          <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles size={13} aria-hidden /></span>{name}
        </span>
        <button type="button" onClick={() => { setMessages([]); setError(""); }} aria-label={t("Yeni söhbət")} title={t("Yeni söhbət")}
          className="absolute right-1 grid size-9 cursor-pointer place-items-center rounded-full bg-card shadow-sm ring-1 ring-border/60 hover:bg-muted"><RotateCcw size={15} aria-hidden /></button>
      </div>
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {!messages.length && <p className="px-1 text-center text-xs text-muted-foreground">{t("Burada köməkçini ziyarətçi kimi yoxla. Dəyişikliyi saxlayandan sonra növbəti cavab yeni ayarla gəlir. Hər mesaj balansdan çıxılır.")}</p>}
        <ol className="flex flex-col gap-3 text-sm">
          {messages.map((m, i) => m.role === "user"
            ? <li key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">{m.text}</li>
            : (
              <li key={i} className="flex max-w-[92%] flex-col gap-2">
                <div className="rounded-2xl rounded-bl-md bg-card px-3.5 py-2.5 ring-1 ring-border/60"><Rich text={m.text} /></div>
                {!!m.listings?.length && (
                  <ul className="flex flex-col gap-1">
                    {m.listings.slice(0, 5).map((l) => (
                      <li key={l.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs ring-1 ring-border/60">
                        <span className="min-w-0 flex-1 truncate">{l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="hover:underline">{l.title}</a> : l.title}</span>
                        {typeof l.price === "number" && <span className="shrink-0 font-medium tabular-nums">{num(l.price)} {l.currency ?? ""}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {m.unanswered && <p className="text-xs text-amber">{t("Cavab tapılmadı: sual “Bilik boşluqları”na düşdü.")}</p>}
              </li>
            ))}
          {busy && <li className="self-start rounded-2xl bg-card px-3.5 py-2 text-muted-foreground ring-1 ring-border/60">{t("Məsləhətçi yazır…")}</li>}
        </ol>
        {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
      {!messages.length && (
        <div className="flex flex-col items-end gap-1.5 px-1 pb-2">
          {ideas.map((i) => <button key={i} type="button" disabled={busy} onClick={() => send(i)} className="max-w-[90%] cursor-pointer rounded-2xl bg-card px-3.5 py-2 text-left text-sm ring-1 ring-border/60 hover:ring-primary disabled:opacity-50">{i}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-4 pr-1.5 ring-1 ring-border/60">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder={t("Mesaj yaz…")} aria-label={t("Mesaj")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        <button disabled={busy || !input.trim()} aria-label={t("Göndər")} className="grid size-9 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"><ArrowUp size={16} aria-hidden /></button>
      </form>
    </div>
  );
}

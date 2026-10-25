"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { chat, getListings, type ChatMessage, type Listing } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ListingTable } from "@/components/listing-table";
import { RequireTenant, useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// **qalın** və [mətn](link) üçün kiçik render; kənar kitabxana lazım deyil.
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        return m ? <a key={i} href={m[2].replace(/ /g, "%20")} target="_blank" rel="noreferrer" className="text-primary underline">{m[1]}</a> : p;
      })}
    </p>
  );
}

function Playground() {
  const { t, num } = useI18n();
  const { tenant } = useSession();
  const mode = tenant?.config.profile?.mode ?? "listings";
  // Nümunə suallar müştərinin öz kataloqundan qurulur (sayta uyğun olsun); alınmasa neytral suallar göstərilir
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
  const ideas = [...new Set(mode === "support" ? supportIdeas : mode === "both" ? [listingIdeas[0]!, listingIdeas[1]!, supportIdeas[0]!, supportIdeas[1]!] : listingIdeas)].slice(0, 4);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cost, setCost] = useState(0);
  const end = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history = messages;
    setMessages([...history, { role: "user", text }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const r = await chat(text, history);
      setMessages((m) => [...m, { role: "model", text: r.answer, listings: r.listings, sources: r.sources, unanswered: r.unanswered }]);
      setCost((c) => c + (r.billing?.billedAzn ?? 0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Sınaq söhbəti")}</h1>
        <p className="text-sm text-muted-foreground">{t("Saytındakı istifadəçi kimi yaz və məsləhətçinin cavabına bax. Hər mesajın xərci balansından çıxılır.")}</p>
      </header>

      {messages.length === 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{t("Hazır nümunə suallar")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ideas.map((i) => (
              <button key={i} type="button" disabled={busy} onClick={() => send(i)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm shadow-[0_1px_2px_rgba(15,23,42,.04)] transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50">
                <span>{i}</span><span aria-hidden className="text-muted-foreground">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {messages.map((m, i) => (
          <li key={i} className={m.role === "user" ? "self-end max-w-[85%] rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" : "flex flex-col gap-3 text-sm"}>
            {m.role === "user" ? m.text : (
              <>
                <div className="rounded-lg border border-border bg-card px-4 py-3"><Rich text={m.text} /></div>
                {m.listings && m.listings.length > 0 && <ListingTable listings={m.listings} />}
                {m.sources && m.sources.length > 0 && (
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{t("Mənbə:")}{" "}
                    {m.sources.map((s, k) => s.url ? <a key={k} href={s.url} target="_blank" rel="noreferrer" className="text-primary underline">{s.title}</a> : <span key={k}>{s.title}</span>)}</p>
                )}
                {m.unanswered && <p className="text-xs text-amber">{t("Çat bu sualın cavabını sənədlərdə tapmadı: “Müraciətlər” bölməsində cavabsız suallara düşür.")}</p>}
              </>
            )}
          </li>
        ))}
        {busy && <li className="text-sm text-muted-foreground">{t("Məsləhətçi yazır…")}</li>}
      </ol>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div ref={end} />

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-4 flex gap-2 rounded-lg border border-border bg-card p-2">
        <Input aria-label={t("Mesaj")} maxLength={500} value={input} onChange={(e) => setInput(e.target.value)} placeholder={mode === "support" ? t("Məsələn: Çatdırılma haqqında soruş") : t("Məsələn: 3000 AZN-ə qədər skuter")} className="border-0" />
        <Button disabled={busy || !input.trim()}><Send size={16} aria-hidden /> {t("Göndər")}</Button>
      </form>
      {cost > 0 && <p className="text-xs text-muted-foreground">{t("Bu söhbətin xərci: {a} AZN", { a: cost.toFixed(3) })}</p>}
    </div>
  );
}

export default function PlaygroundPage() {
  return <RequireTenant><Playground /></RequireTenant>;
}

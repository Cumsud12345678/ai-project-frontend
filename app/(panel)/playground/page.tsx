"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { chat, getWidget, type ChatMessage } from "@/lib/api";
import { Rich, useSampleIdeas } from "@/components/assistant-preview";
import { accentStyle } from "@/lib/accent";
import { useI18n } from "@/lib/i18n";
import { ListingCards } from "@/components/listing-cards";
import { RequireTenant, useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


function Playground() {
  const { t } = useI18n();
  const { tenant } = useSession();
  const mode = tenant?.config.profile?.mode ?? "listings";
  // Kartlar vidjetin rəngində: müştərinin saytda görəcəyi kimi
  const [accent, setAccent] = useState<string | undefined>();
  useEffect(() => { getWidget().then((w) => setAccent(w.widget.color)).catch(() => {}); }, []);
  const ideas = useSampleIdeas();
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
          <li key={i} className={m.role === "user" ? "self-end max-w-[85%] rounded-lg px-4 py-2 text-sm" : "flex flex-col gap-3 text-sm"} style={m.role === "user" ? accentStyle(accent) : undefined}>
            {m.role === "user" ? m.text : (
              <>
                <div className="rounded-lg border border-border bg-card px-4 py-3"><Rich text={m.text} /></div>
                {m.listings && m.listings.length > 0 && <div className="max-w-sm"><ListingCards listings={m.listings} accent={accent} /></div>}
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

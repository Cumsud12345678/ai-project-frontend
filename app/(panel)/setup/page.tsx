"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Copy, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { activate, chat, getKb, getWidget, kbAddUrl, type KbInfo, type WidgetResponse } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";

type Step = 1 | 2 | 3 | 4;

/** Yeni müştəri üçün 4 addım: biznes, sayt məlumatı, sınaq, saytına qoy. Hər addımın vəziyyəti real məlumatdan oxunur, səhifə yenilənəndə yeri itmir. */
export default function SetupPage() {
  const { t } = useI18n();
  const { tenant } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>(tenant ? 2 : 1);
  const [kb, setKb] = useState<KbInfo | null>(null);
  const [widget, setWidget] = useState<WidgetResponse | null>(null);
  const [tested, setTested] = useState(false);

  const loadKb = useCallback(() => { getKb().then(setKb).catch(() => {}); }, []);
  useEffect(() => {
    if (!tenant) return;
    loadKb();
    getWidget().then(setWidget).catch(() => {});
  }, [tenant, loadKb]);

  const ready = (kb?.sources ?? []).some((s) => s.status === "ready");
  const installed = Boolean(widget?.widget.lastSeenAt);
  const done: Record<Step, boolean> = { 1: Boolean(tenant), 2: ready, 3: tested, 4: installed };
  const names: Record<Step, string> = { 1: t("Biznes"), 2: t("Sayt məlumatı"), 3: t("Sınaq"), 4: t("Saytına qoş") };
  const go = (s: Step) => { if (s === 1 || tenant) setStep(s); };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Quraşdırma")}</h1>
        <p className="text-sm text-muted-foreground">{t("4 addımda çatı hazırla. Təxminən 5 dəqiqə çəkir.")}</p>
      </header>

      <ol className="grid grid-cols-4 gap-2" aria-label={t("Addımlar")}>
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <li key={s}>
            <button type="button" onClick={() => go(s)} aria-current={step === s ? "step" : undefined} disabled={s > 1 && !tenant}
              className={cn("flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors disabled:cursor-default sm:flex-row sm:justify-center sm:gap-2 sm:text-sm",
                step === s ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs", done[s] ? "border-primary bg-primary text-primary-foreground" : step === s ? "border-primary" : "border-border")}>
                {done[s] ? <Check size={14} aria-hidden /> : s}
              </span>
              <span className="text-center">{names[s]}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 1 && <StepBusiness onDone={() => setStep(2)} />}
      {step === 2 && <StepSource kb={kb} reload={loadKb} onNext={() => setStep(3)} />}
      {step === 3 && <StepTest ready={ready} onTested={() => setTested(true)} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
      {step === 4 && widget && <StepInstall widget={widget} reload={() => getWidget().then(setWidget).catch(() => {})} onBack={() => setStep(3)} onFinish={() => router.push("/dashboard")} />}
      {step === 4 && !widget && <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>}

      {step === 1 && (
        <p className="text-sm text-muted-foreground">
          {t("Saytındakı elanları, məhsulları və ya xidmətləri də axtarıb göstərməlidir?")} <Link href="/connection" className="text-primary underline">{t("Elan mənbəyini qoşmaqla başla")}</Link>
        </p>
      )}
    </div>
  );
}

function StepBusiness({ onDone }: { onDone: () => void }) {
  const { t, locale } = useI18n();
  const { refresh } = useSession();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !domain.trim()) return setError(t("Biznes adını və domeni yaz."));
    setBusy(true); setError("");
    try {
      await activate({ businessName: name.trim(), domain: domain.trim(), profile: { mode: "support", language: locale } });
      await refresh();
      toast.success(t("Aktivləşdi."));
      onDone();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("1. Biznesin haqqında")}</CardTitle><CardDescription>{t("Çat bu adla təqdim olunur. Domen çatın yalnız sənin saytında işləməsi üçün lazımdır.")}</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1"><Label htmlFor="su-name">{t("Biznes adı")}</Label><Input id="su-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="su-domain">{t("Sayt domeni")}</Label><Input id="su-domain" placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div><Button disabled={busy}>{busy ? t("Gözlə…") : t("Davam et")}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}

function StepSource({ kb, reload, onNext }: { kb: KbInfo | null; reload: () => void; onNext: () => void }) {
  const { t } = useI18n();
  const { tenant } = useSession();
  const [url, setUrl] = useState(tenant?.domain ?? "");
  const [crawl, setCrawl] = useState(false);
  const [busy, setBusy] = useState(false);
  const sources = kb?.sources ?? [];
  const processing = sources.some((s) => s.status === "processing");
  const ready = sources.some((s) => s.status === "ready");

  // Oxunma gedərkən statusu 2.5 saniyədən bir yenilə
  useEffect(() => {
    if (!processing) return;
    const i = setInterval(reload, 2500);
    return () => clearInterval(i);
  }, [processing, reload]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = url.trim();
    if (!v || busy) return;
    setBusy(true);
    try { await kbAddUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`, crawl); toast.success(t("Sayt əlavə edildi, oxunur…")); reload(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("2. Çat nədən cavab versin?")}</CardTitle><CardDescription>{t("Saytının ünvanını yaz: çat səhifələri oxuyub müştəri suallarına onlardan cavab verəcək. İstəsən sonra PDF, Word və ya FAQ mətni də əlavə edə bilərsən.")}</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={add} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="su-url">{t("Sayt və ya səhifə ünvanı")}</Label>
            <div className="flex gap-2">
              <Input id="su-url" inputMode="url" placeholder="https://saytin.az" value={url} onChange={(e) => setUrl(e.target.value)} />
              <Button className="shrink-0 whitespace-nowrap" disabled={busy || !url.trim()}>{busy ? t("Gözlə…") : t("Saytı oxu")}</Button>
            </div>
          </div>
          <SwitchRow checked={crawl} onChange={setCrawl} on={t("Açıq")} off={t("Bağlı")}
            title={t("Bütün saytı oxu (sitemap və linklərlə, maksimum 40 səhifə)")}
            description={t("Söndürsən yalnız bu bir səhifə oxunur. Sayt sonradan dəyişəndə “Yenilə” düyməsi ilə təzələ.")} />
        </form>

        {sources.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{s.url ? s.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") : s.name}</span>
                {s.status === "processing" && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 size={14} className="animate-spin" aria-hidden />{t("Oxunur…")}</span>}
                {s.status === "ready" && <span className="text-primary">{t("Hazırdır")} · {t("{n} hissə", { n: s.chunks })}</span>}
                {s.status === "failed" && <span role="alert" className="text-destructive">{t("Alınmadı")}</span>}
              </li>
            ))}
          </ul>
        )}
        {sources.some((s) => s.status === "failed") && !ready && <p className="text-sm text-muted-foreground">{t("Sayt oxuna bilmədisə, mətni və ya PDF-i əlavə et:")} <Link href="/knowledge" className="text-primary underline">{t("Bilik bazası")}</Link></p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onNext} disabled={!ready}>{t("Davam et")}</Button>
          {!ready && <Button variant="ghost" onClick={onNext}>{t("Sonra əlavə edərəm")}</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function StepTest({ ready, onTested, onNext, onBack }: { ready: boolean; onTested: () => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [msgs, setMsgs] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const ideas = [t("Sizinlə necə əlaqə saxlaya bilərəm?"), t("Xidmətləriniz hansılardır?"), t("İş saatlarınız necədir?")];
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length, busy]);

  async function send(text: string) {
    const v = text.trim();
    if (!v || busy) return;
    const history = msgs;
    setMsgs([...history, { role: "user", text: v }]); setInput(""); setBusy(true);
    try {
      const r = await chat(v, history.map((m) => ({ role: m.role, text: m.text })));
      setMsgs((cur) => [...cur, { role: "model", text: r.answer }]);
      onTested();
    } catch (e) { setMsgs((cur) => [...cur, { role: "model", text: (e as Error).message }]); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("3. Çatı sına")}</CardTitle><CardDescription>{ready ? t("Müştəri kimi bir neçə sual ver. Cavab səhv və ya çatışmazdırsa, geri qayıdıb məlumat əlavə et.") : t("Hələ məlumat əlavə etməmisən: çat “bilmirəm” deyəcək. Geri qayıdıb saytını oxut.")}</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!msgs.length && (
          <div className="flex flex-wrap gap-2">
            {ideas.map((i) => <button key={i} type="button" onClick={() => send(i)} disabled={busy} className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary hover:text-primary disabled:opacity-50">{i}</button>)}
          </div>
        )}
        {!!msgs.length && (
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg bg-muted/40 p-3" role="log" aria-live="polite" aria-label={t("Söhbət")}>
            {msgs.map((m, i) => <div key={i} className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-sm", m.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start border border-border bg-card")}>{m.text}</div>)}
            {busy && <div className="self-start text-sm text-muted-foreground"><Loader2 size={14} className="inline animate-spin" aria-hidden /> {t("Cavab yazılır…")}</div>}
            <div ref={endRef} />
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} aria-label={t("Mesaj")} placeholder={t("Müştəri kimi sual yaz…")} />
          <Button disabled={busy || !input.trim()}><Send size={16} aria-hidden />{t("Göndər")}</Button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={onBack}>{t("Geri")}</Button>
          <Button onClick={onNext}>{t("Davam et")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StepInstall({ widget, reload, onBack, onFinish }: { widget: WidgetResponse; reload: () => void; onBack: () => void; onFinish: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const installed = Boolean(widget.widget.lastSeenAt);
  const code = `<script src="${widget.scriptUrl}" data-key="${widget.widget.key}" defer></script>`;
  // Skript saytda ilk dəfə yüklənəndə "Aşkar edildi" göstərilsin
  useEffect(() => {
    if (installed) return;
    const i = setInterval(reload, 5000);
    return () => clearInterval(i);
  }, [installed, reload]);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error(t("Kopyalamaq alınmadı, kodu əl ilə seç.")); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("4. Saytına qoş")}</CardTitle><CardDescription>{t("Bu sətri saytının hər səhifəsində </body> teqindən əvvəl yapışdır (Next.js-də layout faylına). Çat düyməsi sağ aşağıda görünəcək.")}</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs"><code>{code}</code></pre>
        <div><Button variant="outline" onClick={copy}><Copy size={16} aria-hidden />{copied ? t("Kopyalandı") : t("Kodu kopyala")}</Button></div>
        <div role="status" className={cn("flex items-start gap-3 rounded-lg border p-4 text-sm", installed ? "border-primary/40 bg-primary/5" : "border-border bg-muted/40")}>
          {installed ? <Check size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden /> : <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />}
          <div>
            <p className="font-medium">{installed ? t("Çat saytında aşkar edildi. Hər şey hazırdır!") : t("Saytda hələ görünmür. Kodu yapışdırıb səhifəni yenilə, burada avtomatik yoxlanır.")}</p>
            {!installed && <p className="mt-1 text-muted-foreground">{t("Domenin düzgün yazıldığına və kodun </body>-dən əvvəl olduğuna baxın. Vidjet açar və domeni “Saytına qoş” bölməsində idarə edirsən.")}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={onBack}>{t("Geri")}</Button>
          <Button onClick={onFinish}>{installed ? t("Panelə keç") : t("Sonra quraşdıracam")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

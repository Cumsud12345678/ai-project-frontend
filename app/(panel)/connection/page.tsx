"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ShoppingBag, Upload } from "lucide-react";
import { toast } from "sonner";
import { activate, ApiError, testConfig, updateConfig, type ConfigJson, type TestResult } from "@/lib/api";
import { makeExampleText, stripJsonComments, isLegacyConfig, normalizeConfig, parseConfigText } from "@/lib/config-file";
import { jsonErrorLocation, lintConfig, type Issue } from "@/lib/config-edit";
import { useI18n } from "@/lib/i18n";
import { ConfigGuide } from "@/components/config-guide";
import { ConfigTools } from "@/components/config-tools";
import { ConfigAssist } from "@/components/config-assist";
import { KeyReveal } from "@/components/key-reveal";
import { ListingTable } from "@/components/listing-table";
import { useSession } from "@/components/session";
import { CardSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

const MAX_FILE = 200 * 1024;

function ListingsSetup() {
  const { tenant, refresh } = useSession();
  const { t, locale } = useI18n();
  const [text, setText] = useState(() => (tenant ? JSON.stringify(normalizeConfig(tenant.config, t), null, 2) : ""));
  const [businessName, setBusinessName] = useState(tenant?.businessName ?? "");
  const [domain, setDomain] = useState(tenant?.domain ?? "");
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<{ message: string; dropped?: string[] } | null>(null);
  const [issuedKey, setIssuedKey] = useState("");
  const [busy, setBusy] = useState<"" | "test" | "save">("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmEx, setConfirmEx] = useState(false);

  // Canlı yoxlama: JSON səhvi (sətir/sütun ilə) və ya konfiqurasiya xəbərdarlıqları
  const live = useMemo<{ json?: string; issues: Issue[]; legacy?: boolean } | null>(() => {
    if (!text.trim()) return null;
    const p = parseConfigText(text, t);
    if ("error" in p) {
      let loc = "";
      try { JSON.parse(stripJsonComments(text)); } catch (e) { loc = jsonErrorLocation(text, (e as Error).message, t); }
      return { json: `${p.error}${loc ? ` (${loc})` : ""}. ${t("Çox vaxt səbəb: artıq vergül, çatışmayan dırnaq və ya mötərizə.")}`, issues: [] };
    }
    return { issues: lintConfig(p.config, t), legacy: isLegacyConfig(p.config) };
  }, [text, t]);

  // Açar göstərilərkən səhifəni tərk etməyə cəhd olsa xəbərdarlıq.
  useEffect(() => {
    if (!issuedKey) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [issuedKey]);

  /** Mətni qəbul edir; JSON-da biznes adı/domen varsa və sahələr boşdursa onları doldurur. */
  function adopt(next: string) {
    setText(next);
    setResult(null);
    setError(null);
    const parsed = parseConfigText(next, t);
    if ("config" in parsed) {
      if (parsed.config.businessName && !businessName) setBusinessName(String(parsed.config.businessName));
      if (parsed.config.domain && !domain) setDomain(String(parsed.config.domain));
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE) return setError({ message: t("Fayl çox böyükdür (maksimum 200 KB).") });
    adopt(await file.text());
  }

  function build(): ConfigJson | null {
    const parsed = parseConfigText(text, t);
    if ("error" in parsed) { setError({ message: parsed.error }); return null; }
    const config = { ...parsed.config, businessName: businessName.trim() || parsed.config.businessName, domain: domain.trim() || parsed.config.domain };
    if (!config.businessName || !config.domain) { setError({ message: t("Biznes adını və domeni yaz.") }); return null; }
    return config;
  }

  async function run(kind: "test" | "save") {
    setError(null);
    setResult(null);
    const config = build();
    if (!config) return;
    setBusy(kind);
    try {
      if (kind === "test") { setResult(await testConfig(config)); toast.success(t("Yoxlama uğurlu oldu.")); }
      else if (tenant) {
        const r = await updateConfig(config);
        setResult({ ok: true, sampleCount: r.sampleListings.length, sampleListings: r.sampleListings, supportedFilters: [] });
        toast.success(t("Konfiqurasiya yeniləndi. API açarın dəyişmədi."));
        await refresh();
      } else {
        const r = await activate(config);
        setResult({ ok: true, sampleCount: r.sampleListings.length, sampleListings: r.sampleListings, supportedFilters: [] });
        setIssuedKey(r.apiKey);
        toast.success(t("Aktivləşdi."));
        await refresh();
      }
    } catch (e) {
      setError({ message: (e as Error).message, dropped: e instanceof ApiError ? e.debug?.dropped : undefined });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Elan mənbəyi")}</h1>
        <p className="text-sm text-muted-foreground">
          {tenant
            ? t("Konfiqurasiya JSON-unu dəyişib yenidən yoxla və yenilə.")
            : t("Saytının elan, məhsul və ya xidmət API-sini JSON konfiqurasiya ilə təsvir et. Yoxlamadan keçəndə məsləhətçi aktiv olur və API açarını alırsan.")}
        </p>
      </header>

      <ConfigAssist text={text} onChange={adopt} />
      <ConfigGuide />

      {issuedKey && <KeyReveal apiKey={issuedKey} title={t("Aktivləşdi. Bu sənin API açarındır")} onDone={() => setIssuedKey("")} />}

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor="bn">{t("Biznes adı")}</Label><Input id="bn" maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="dm">{t("Sayt domeni")}</Label><Input id="dm" placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="json">{t("Konfiqurasiya JSON")}</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => {
                if (text.trim() && !confirmEx) { setConfirmEx(true); return; }
                setConfirmEx(false); adopt(makeExampleText(t, locale));
              }} onBlur={() => setConfirmEx(false)}>{text.trim() ? (confirmEx ? t("Bəli, nümunə ilə əvəz et") : t("Nümunəni göstər")) : t("Nümunəni doldur")}</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload size={14} aria-hidden /> {t("JSON faylı seç")}</Button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} aria-label={t("JSON faylı seç")} />
            </div>
          </div>
          <ConfigTools text={text} onChange={adopt} />
          <Textarea id="json" spellCheck={false} rows={18} className="font-mono text-xs leading-relaxed" placeholder='{ "source": { "type": "rest", "baseUrl": "https://…", … } }'
            value={text} onChange={(e) => adopt(e.target.value)} />
          {live && (
            <div className="flex flex-col gap-1 text-sm" aria-live="polite">
              {live.json && <p role="alert" className="text-destructive">{t("JSON səhvi:")} {live.json}</p>}
              {live.legacy && (
                <p className="flex flex-wrap items-center gap-2">
                  <span>{t("Bu konfiqurasiya köhnə qısa yazılışdan istifadə edir (bəzi filtrlərdə yalnız param var).")}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => { const p = parseConfigText(text, t); if ("config" in p) adopt(JSON.stringify(normalizeConfig(p.config, t), null, 2)); }}>{t("Avtomatik düzəlt")}</Button>
                </p>
              )}
              {!live.json && live.issues.length === 0 && <p className="text-primary">{t("Quruluş qaydasındadır. “Yoxla” düyməsinə bas.")}</p>}
              {live.issues.map((i, k) => (
                <p key={k} className={i.level === "error" ? "text-destructive" : i.level === "warn" ? "text-amber" : "text-muted-foreground"}>
                  {i.level === "error" ? t("Səhv:") : i.level === "warn" ? t("Diqqət:") : t("Məsləhət:")} {i.text}
                </p>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t("Fayl seç və ya JSON-u bura yapışdır.")} {t("JSON-da // ilə şərh yaza bilərsən.")} <code className="font-mono">apiSecret</code> {t("yalnız API-n açar tələb edirsə lazımdır: şifrələnib saxlanır və bir daha göstərilmir.")}
            {tenant && ` ${t("Dəyişmək istəmirsənsə JSON-a əlavə etmə, köhnəsi qalır.")}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => run("test")} disabled={!!busy}>{busy === "test" ? t("Yoxlanır…") : t("Yoxla")}</Button>
          <Button onClick={() => run("save")} disabled={!!busy}>{busy === "save" ? t("Gözlə…") : tenant ? t("Yenilə") : t("Aktivləşdir")}</Button>
          <p className="text-xs text-muted-foreground">{t("Hər iki düymə saytının API-sinə real sorğu göndərir.")}</p>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex flex-col gap-1 rounded-lg border border-destructive/40 bg-card p-4 text-sm">
          <p className="text-destructive">{error.message}</p>
          {error.dropped && error.dropped.length > 0 && <p className="text-muted-foreground">{t("Atılan qeydlər:")} {[...new Set(error.dropped)].slice(0, 5).join(", ")}</p>}
        </div>
      )}
      {busy && <CardSkeleton rows={2} />}
      {!busy && result && (
        <div className="flex flex-col gap-3">
          <p className="text-sm"><strong>{result.sampleCount}</strong> {t("qeyd oxundu")}{result.debug?.dropped?.length ? <span className="text-destructive">. {t("Atılan qeydlər:")} {[...new Set(result.debug.dropped)].join(", ")}.</span> : "."}</p>
          {result.supportedFilters.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm">{t("Dəstəklənən süzgəclər:")} {result.supportedFilters.map((f) => <Badge key={f}>{f}</Badge>)}</div>}
          {result.sampleListings.length > 0 && <ListingTable listings={result.sampleListings} />}
        </div>
      )}
    </div>
  );
}

/** Yeni hesab: iki yoldan birini seç. Dəstək botu üçün yalnız ad və domen lazımdır. */
function SupportSetup({ onBack }: { onBack: () => void }) {
  const { t, locale } = useI18n();
  const { refresh } = useSession();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issuedKey, setIssuedKey] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!businessName.trim() || !domain.trim()) return setError(t("Biznes adını və domeni yaz."));
    setBusy(true);
    setError("");
    try {
      const r = await activate({ businessName: businessName.trim(), domain: domain.trim(), profile: { mode: "support", language: locale } });
      setIssuedKey(r.apiKey);
      toast.success(t("Aktivləşdi."));
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  if (issuedKey) return (
    <div className="flex flex-col gap-4">
      <KeyReveal apiKey={issuedKey} title={t("Aktivləşdi. Bu sənin API açarındır")} onDone={async () => { await refresh(); router.push("/knowledge"); }} />
      <p className="text-sm text-muted-foreground">{t("Çatı saytına qoymaq üçün API açarı lazım deyil. Növbəti addım: bilik bazasına sənəd və ya sayt linki əlavə et.")}</p>
    </div>
  );
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1"><Label htmlFor="sb-name">{t("Biznes adı")}</Label><Input id="sb-name" maxLength={120} value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></div>
        <div className="flex flex-col gap-1"><Label htmlFor="sb-domain">{t("Sayt domeni")}</Label><Input id="sb-domain" placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>{t("Geri")}</Button>
        <Button disabled={busy}>{busy ? t("Gözlə…") : t("Dəstək botunu yarat")}</Button>
      </div>
    </form>
  );
}

export default function ConnectionPage() {
  const { tenant } = useSession();
  const { t } = useI18n();
  const [choice, setChoice] = useState<"" | "listings" | "support">("");
  if (tenant || choice === "listings") return <ListingsSetup />;
  const Card = ({ icon: Icon, title, text, onClick }: { icon: typeof BookOpen; title: string; text: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex cursor-pointer flex-col items-start gap-2 rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">
      <Icon size={22} className="text-primary" aria-hidden />
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </button>
  );
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Çatı necə qurmaq istəyirsən?")}</h1>
        <p className="text-sm text-muted-foreground">{t("Sonradan ikisini də birlikdə işlədə bilərsən.")}</p>
      </header>
      {choice === "support" ? <SupportSetup onBack={() => setChoice("")} /> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card icon={BookOpen} title={t("Dəstək botu")} text={t("Şirkətin PDF, Word, sayt linki və ya FAQ-larından cavab verir. Operator əvəzi: uydurmur, bilmirsə operatora yönləndirir.")} onClick={() => setChoice("support")} />
          <Card icon={ShoppingBag} title={t("Elan və məhsul məsləhətçisi")} text={t("Saytındakı elanları, məhsulları və ya xidmətləri (maşın, daşınmaz əmlak, geyim, texnika və s.) axtarıb istifadəçiyə uyğununu təklif edir. Onları qaytaran API lazımdır.")} onClick={() => setChoice("listings")} />
        </div>
      )}
    </div>
  );
}

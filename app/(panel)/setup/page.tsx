"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BookOpen, Building2, Check, ChevronDown, CircleCheck, Code2, Copy, FileText, FileUp, Globe, Headset, Link2, Loader2, Mail, MessageCircle,
  Plug, Rocket, Search, Send, ShoppingBag, ShoppingCart, Sparkles, Store, Target, Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  activate, chat, getKb, getOverview, saveSetupGoals, getTelegram, getWhatsApp, getWidget, kbAddText, kbAddUrl, kbUploadFile, saveProfile, saveWidget, updateConfig,
  type BizType, type CompanyInfo, type KbInfo, type Listing, type Overview, type TelegramStatus, type WhatsAppStatus, type WidgetResponse,
} from "@/lib/api";
import { wooBaseUrl, wooConfig } from "@/lib/presets/woocommerce";
import { dataDone, readiness, setupSteps, type Goal, type StepId } from "@/lib/setup-steps";
import { cleanDomain, hasSite, noSiteDomain } from "@/lib/site";
import { accentStyle } from "@/lib/accent";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ApiBuilder } from "@/components/api-builder";
import { FeedSetup } from "@/components/feed-setup";
import { ListingTable } from "@/components/listing-table";
import { ListingCards } from "@/components/listing-cards";
import { Rich } from "@/components/assistant-preview";
import { FilterPills } from "@/components/page-header";
import { useSession } from "@/components/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SetupRequestCard } from "@/components/setup-request-card";
import { QuickStart, ReadySummary, bizTypes, testIdeas } from "@/components/setup-quickstart";

// ---------------------------------------------------------------- vəziyyət
// Addımlar, adları və "hazırdır" şərtləri lib/setup-steps.ts-dədir: yuxarı zolaq, Ümumi baxış və Köməkçi səhifəsi eyni mənbədən oxuyur.
// Canlı operator məqsəd deyil, ayardır: "Yayımla" addımında və Ayarlarda açılır.
/** Köhnə versiya məqsədləri brauzerdə saxlayırdı: bir dəfə serverə köçürülür */
function legacyGoals(id?: string): Goal[] {
  try {
    const v = JSON.parse(localStorage.getItem(`ca_setup_${id ?? "new"}`) || "{}") as { goals?: unknown[] };
    return (v.goals ?? []).filter((g): g is Goal => g === "answer" || g === "catalog");
  } catch { return []; }
}
const STEP_IDS: StepId[] = ["business", "goals", "data", "test", "launch"];

const FILE_MAX = 6 * 1024 * 1024;

/**
 * Quraşdırma sehirbazı. Addımlar müştərinin seçiminə görə dəyişir:
 * saytı yoxdursa sayt skanı və vidjet kodu göstərilmir, yalnız elan istəyirsə bilik bölməsi görünmür və s.
 * Hər addımın "hazırdır" vəziyyəti real məlumatdan oxunur (məqsədlər serverdə, bilik bazası, mənbə, vidjet, kanallar).
 */
export default function SetupPage() {
  const { t } = useI18n();
  const { tenant, refresh } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [testedNow, setTestedNow] = useState(false); // server yenilənənə qədər dərhal göstərmək üçün
  const [kb, setKb] = useState<KbInfo | null>(null);
  const [widget, setWidget] = useState<WidgetResponse | null>(null);
  const [step, setStep] = useState<StepId>("business");
  const top = useRef<HTMLDivElement>(null);
  const site = hasSite(tenant?.domain);

  const serverGoals = tenant?.setup?.goals ?? [];
  useEffect(() => {
    if (serverGoals.length) { setGoals(serverGoals); return; }
    const local = legacyGoals(tenant?.tenantId);
    setGoals(local);
    if (tenant?.setup && local.length) void saveSetupGoals(local).then(refresh).catch(() => {});
  }, [tenant?.tenantId, serverGoals.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const bizType = tenant?.setup?.bizType;
  async function chooseGoals(g: Goal[], type?: BizType) {
    setGoals(g);
    await saveSetupGoals(g, type);
    await refresh();
  }

  const loadKb = useCallback(() => { getKb().then(setKb).catch(() => {}); }, []);
  const loadWidget = useCallback(() => { getWidget().then(setWidget).catch(() => {}); }, []);
  useEffect(() => { if (tenant) { loadKb(); loadWidget(); } }, [tenant, loadKb, loadWidget]);
  // Server tərəfi hazırlıq (yuxarı zolaqla eyni): Telegram/WhatsApp qoşulubsa yayım, real məlumatla sınaq edilibsə sınaq tamamdır
  const [ov, setOv] = useState<Overview | null>(null);
  useEffect(() => {
    if (!tenant) return;
    const f = () => { getOverview().then(setOv).catch(() => {}); };
    f();
    window.addEventListener("ca:overview", f);
    return () => window.removeEventListener("ca:overview", f);
  }, [tenant]);
  const rd = readiness(ov);

  const company = tenant?.config.profile?.company;
  const kbReady = (kb?.sources ?? []).some((s) => s.status === "ready") || Boolean(company && Object.values(company).some((v) => typeof v === "string" && v.trim()));
  const catalogReady = Boolean(tenant && tenant.config.profile?.mode !== "support" && (tenant.config.source as { type?: string } | undefined)?.type);
  const dataReady = dataDone(goals, catalogReady, kbReady, rd?.dataReady ?? false);

  const steps = useMemo(() => setupSteps({
    hasTenant: Boolean(tenant), goals, dataReady,
    tested: testedNow || Boolean(tenant?.setup?.tested) || Boolean(rd?.tested),
    launched: Boolean(widget?.widget.lastSeenAt) || Boolean(rd?.launched),
    hasSite: site,
  }, t), [t, tenant, goals, dataReady, testedNow, rd?.tested, rd?.launched, widget, site]);

  // İlk açılışda: ?step=… (Ümumi baxışdan gələndə) və ya ilk bitməmiş addım
  const first = useRef(true);
  useEffect(() => {
    if (!first.current || (tenant && !kb)) return;
    first.current = false;
    let want: StepId | null = null;
    try { const q = new URLSearchParams(window.location.search).get("step") as StepId | null; if (q && STEP_IDS.includes(q)) want = q; } catch { /* */ }
    setStep(want && (want === "business" || tenant) ? want : steps.find((s) => !s.done)?.id ?? "launch");
  }, [steps, tenant, kb]);

  const idx = Math.max(0, steps.findIndex((s) => s.id === step));
  const go = (id: StepId) => { setStep(id); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const next = () => { const n = steps[idx + 1]; if (n) go(n.id); };
  const back = () => { const p = steps[idx - 1]; if (p) go(p.id); };
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Quraşdırma")}</h1>
          <p className="text-sm text-muted-foreground">{t("Bir neçə sual, sonra köməkçin işləməyə hazırdır. Təxminən 5 dəqiqə.")}</p>
        </div>
        <div className="flex min-w-48 items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
          <span className="text-sm font-medium tabular-nums">{doneCount}/{steps.length}</span>
        </div>
      </header>

      <SetupRequestCard businessName={tenant?.businessName} />

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label={t("Addımlar")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
          {steps.map((s, i) => {
            const locked = s.id !== "business" && !tenant;
            const on = s.id === step;
            return (
              <button key={s.id} type="button" disabled={locked} onClick={() => go(s.id)} aria-current={on ? "step" : undefined}
                className={cn("flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 lg:border-transparent",
                  on ? "border-foreground bg-card shadow-sm lg:border-border" : "border-border bg-card/50 hover:bg-card")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", s.done ? "bg-emerald-500 text-white" : on ? "border-2 border-foreground" : "border border-border text-muted-foreground")}>
                  {s.done ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{s.label}</span>
                  <span className="hidden truncate text-xs text-muted-foreground lg:block">{s.note}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div key={step} className="min-w-0">
          {step === "business" && <StepBusiness onDone={() => go("goals")} />}
          {step === "goals" && tenant && <StepGoals goals={goals} bizType={bizType} site={site} onSave={async (g, type) => { await chooseGoals(g, type); go("data"); }} onBack={back} />}
          {step === "data" && tenant && <StepData goals={goals} bizType={bizType} onQuick={() => { loadKb(); go("test"); }} kb={kb} reload={loadKb} site={site} kbReady={kbReady} catalogReady={catalogReady} onDone={() => go("test")}
            onAddAnswer={() => void chooseGoals([...goals, "answer"])} onNext={next} onBack={back} />}
          {step === "test" && tenant && <StepTest goals={goals} bizType={bizType} dataReady={dataReady} accent={widget?.widget.color} onTested={() => setTestedNow(true)} onFix={() => go(goals.length ? "data" : "goals")} onNext={next} onBack={back} />}
          {step === "launch" && tenant && <StepLaunch widget={widget} reload={loadWidget} site={site} goals={goals} onBack={back} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ümumi hissələr
function Panel({ icon: Icon, title, desc, children, footer }: { icon: React.ElementType; title: string; desc?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"><Icon size={19} aria-hidden /></span>
        <div className="min-w-0"><h2 className="text-lg font-semibold leading-snug">{title}</h2>{desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}</div>
      </header>
      <div className="flex flex-col gap-5 p-5 sm:p-6">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-4 sm:px-6">{footer}</footer>}
    </section>
  );
}
function Nav({ onBack, next, skip }: { onBack?: () => void; next?: React.ReactNode; skip?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <div>{onBack && <Button variant="ghost" onClick={onBack}><ArrowLeft size={16} aria-hidden />{t("Geri")}</Button>}</div>
      <div className="flex flex-wrap items-center gap-2">{skip}{next}</div>
    </>
  );
}
/** Seçim kartı (radio və ya checkbox kimi) */
function Choice({ on, onClick, icon: Icon, title, text, badge, role = "radio" }: { on: boolean; onClick: () => void; icon: React.ElementType; title: string; text: string; badge?: string; role?: "radio" | "checkbox" }) {
  return (
    <button type="button" role={role} aria-checked={on} onClick={onClick}
      className={cn("relative flex h-full cursor-pointer flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors", on ? "border-foreground bg-muted/40 ring-1 ring-foreground" : "border-border hover:border-foreground/40")}>
      <span className="flex w-full items-center gap-2">
        <span className={cn("grid size-9 place-items-center rounded-lg", on ? "bg-foreground text-background" : "bg-muted")}><Icon size={18} aria-hidden /></span>
        {badge && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{badge}</span>}
        <span className={cn("grid size-5 place-items-center rounded-full border", !badge && "ml-auto", on ? "border-foreground bg-foreground text-background" : "border-border")}>{on && <Check size={12} strokeWidth={3} aria-hidden />}</span>
      </span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </button>
  );
}

// ---------------------------------------------------------------- 1. Biznes
function StepBusiness({ onDone }: { onDone: () => void }) {
  const { t, locale } = useI18n();
  const { tenant, refresh } = useSession();
  const [name, setName] = useState("");
  const [site, setSite] = useState<boolean | null>(null);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const clean = cleanDomain(domain);

  // Yaradılandan sonra da ad və "saytım var/yoxdur" seçimi dəyişdirilə bilir (səhvən seçilibsə)
  function startEdit() {
    if (!tenant) return;
    setName(tenant.businessName);
    setSite(hasSite(tenant.domain));
    setDomain(hasSite(tenant.domain) ? tenant.domain : "");
    setError(""); setEditing(true);
  }

  if (tenant && !editing) return (
    <Panel icon={Building2} title={t("Biznes yaradılıb")} desc={t("Ad və sayt qeyd olunub. Səhv seçmisənsə, dəyişə bilərsən.")}
      footer={<Nav next={<Button onClick={onDone}>{t("Davam et")}<ArrowRight size={16} aria-hidden /></Button>} />}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{t("Biznes adı")}</dt><dd className="mt-0.5 font-medium">{tenant.businessName}</dd></div>
          <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{t("Sayt")}</dt><dd className="mt-0.5 font-medium">{hasSite(tenant.domain) ? tenant.domain : t("Sayt yoxdur: Telegram və WhatsApp")}</dd></div>
        </dl>
        <Button type="button" variant="outline" className="sm:self-center" onClick={startEdit}>{t("Dəyiş")}</Button>
      </div>
    </Panel>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) return setError(t("Biznes adını yaz."));
    if (site === null) return setError(t("Saytın olub-olmadığını seç."));
    if (site && !clean) return setError(t("Domeni düzgün yaz, məs. saytim.az"));
    setBusy(true); setError("");
    try {
      if (tenant) {
        // Mövcud konfiqurasiya (mənbə, profil) olduğu kimi qalır, yalnız ad və domen dəyişir.
        // Saytsızdan sayta və ya əksinə keçəndə yeni domen yazılır (saytsız üçün ".invalid" yer tutucu).
        const keepNoSite = !site && !hasSite(tenant.domain);
        await updateConfig({ ...tenant.config, businessName: name.trim(), domain: site ? clean : keepNoSite ? tenant.domain : noSiteDomain() });
        await refresh();
        toast.success(t("Saxlandı."));
        setEditing(false);
        return;
      }
      await activate({ businessName: name.trim(), domain: site ? clean : noSiteDomain(), profile: { mode: "support", language: locale } });
      await refresh();
      toast.success(t("Biznes yaradıldı."));
      onDone();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit}>
      <Panel icon={Building2} title={editing ? t("Biznes məlumatını dəyiş") : t("Biznesin haqqında")} desc={t("Köməkçi özünü bu adla təqdim edəcək.")}
        footer={<Nav onBack={editing ? () => setEditing(false) : undefined} next={<Button disabled={busy}>{busy ? t("Gözlə…") : editing ? t("Saxla") : t("Davam et")}{!busy && !editing && <ArrowRight size={16} aria-hidden />}</Button>} />}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-name">{t("Biznes adı")}</Label>
          <Input id="su-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={t("məs. Moto Elan")} className="h-11" />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("Saytın var?")}</legend>
          <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
            <Choice on={site === true} onClick={() => setSite(true)} icon={Globe} title={t("Bəli, saytım var")} text={t("Çat düyməsi saytında görünəcək, köməkçi saytındakı məlumatı da oxuya bilər.")} />
            <Choice on={site === false} onClick={() => setSite(false)} icon={MessageCircle} title={t("Xeyr, saytım yoxdur")} text={t("Köməkçi Telegram və ya WhatsApp-da işləyəcək. Sayt sonra da əlavə oluna bilər.")} />
          </div>
        </fieldset>
        {site && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-domain">{t("Saytın domeni")}</Label>
            <Input id="su-domain" inputMode="url" placeholder="saytim.az" value={domain} onChange={(e) => setDomain(e.target.value)} className="h-11" aria-invalid={Boolean(domain.trim()) && !clean} />
            <p className="text-xs text-muted-foreground">{domain.trim() && clean && clean !== domain.trim().toLowerCase() ? t("Belə yadda saxlanacaq: {d}", { d: clean }) : t("Təhlükəsizlik üçün çat yalnız bu domendə (və alt domenlərində) işləyəcək.")}</p>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </Panel>
    </form>
  );
}

// ---------------------------------------------------------------- 2. Məqsəd
function StepGoals({ goals, bizType, site, onSave, onBack }: { goals: Goal[]; bizType?: BizType; site: boolean; onSave: (g: Goal[], type: BizType) => Promise<void>; onBack: () => void }) {
  const { t } = useI18n();
  const [type, setType] = useState<BizType | null>(bizType ?? null);
  const [catalog, setCatalog] = useState(goals.includes("catalog"));
  const [busy, setBusy] = useState(false);
  const canCatalog = type === "shop" || type === "social" || type === "other";
  async function save() {
    if (!type) return;
    setBusy(true);
    try { await onSave(canCatalog && catalog ? ["answer", "catalog"] : ["answer"], type); } finally { setBusy(false); }
  }
  return (
    <Panel icon={Target} title={t("Biznesin nədir?")} desc={t("Seçiminə görə köməkçi hazır ayarlarla qurulur: sifariş, randevu, xatırlatma. Hamısını sonra dəyişə bilərsən.")}
      footer={<Nav onBack={onBack} next={<Button disabled={busy || !type} onClick={save}>{t("Davam et")}<ArrowRight size={16} aria-hidden /></Button>} />}>
      <div role="radiogroup" aria-label={t("Biznesin nədir?")} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {bizTypes(t).map((b) => <Choice key={b.id} on={type === b.id} onClick={() => setType(b.id)} icon={b.icon} title={b.title} text={b.text} />)}
      </div>
      {canCatalog && (
        <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
          <input type="checkbox" className="mt-0.5" checked={catalog} onChange={(e) => setCatalog(e.target.checked)} />
          <span><span className="block font-medium">{t("Məhsul kataloqum da var (sayt API-si, WooCommerce, CSV və ya Excel)")}</span><span className="block text-muted-foreground">{t("Köməkçi “150 AZN-ə qədər qulaqlıq” kimi istəyə kataloqdan uyğun məhsul tapıb kart kimi göstərəcək. İstəyə bağlıdır.")}</span></span>
        </label>
      )}
      {!site && canCatalog && catalog && <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">{t("Saytın yoxdursa da kataloq işləyir: məhsulları CSV və ya Excel faylı ilə yükləyə bilərsən, köməkçi Telegram və WhatsApp-da onlardan axtaracaq.")}</p>}
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><Headset size={14} className="mt-0.5 shrink-0" aria-hidden />{t("Canlı operator (köməkçi bilmədikdə komandana ötürmə) son addımda bir düymə ilə açılır.")}</p>
    </Panel>
  );
}

// ---------------------------------------------------------------- 3. Məlumat (kataloq + bilik bir yerdə)
/**
 * Bir addım, iki bölmə: "Elanların" (strukturlu, filtrlə canlı axtarılır) və "Suallar üçün məlumat" (mətn, bilik bazası).
 * Hansı bölmənin görünəcəyini Məqsəd seçimi həll edir: yalnız elan istəyən müştəri bilik hissəsini ümumiyyətlə görmür.
 * İkisi də seçilibsə akkordeon: hazır olmayan birinci açılır, hər başlıqda vəziyyət yazılır.
 */
function StepData({ goals, bizType, onQuick, kb, reload, site, kbReady, catalogReady, onAddAnswer, onDone, onNext, onBack }: {
  goals: Goal[]; bizType?: BizType; onQuick: () => void; kb: KbInfo | null; reload: () => void; site: boolean; kbReady: boolean; catalogReady: boolean; onAddAnswer: () => void; onDone: () => void; onNext: () => void; onBack: () => void;
}) {
  const { t } = useI18n();
  const cat = goals.includes("catalog");
  const ans = goals.includes("answer");
  const both = cat && ans;
  const [open, setOpen] = useState<"catalog" | "kb" | null>(cat && !catalogReady ? "catalog" : ans && !kbReady ? "kb" : cat ? "catalog" : "kb");
  const ready = cat ? catalogReady : kbReady;
  const title = both ? t("Köməkçiyə məlumat ver") : cat ? t("Elanlarını qoş") : t("Köməkçi cavabları nədən götürsün?");
  const desc = both ? t("Elanlar filtrlə canlı axtarılır, suallar üçün məlumat isə köməkçinin danışdığı mətndir. Hər birini ayrıca qoş.")
    : cat ? t("Köməkçi müştərinin istəyinə görə elanlarını süzüb kart kimi göstərəcək. Saytına ən uyğun yolu seç.")
    : t("Bir və ya bir neçə mənbə əlavə et. Köməkçi yalnız bunlara əsasən cavab verir, bilmədiyini uydurmur.");

  // API saxlananda: suallar bölməsi hələ boşdursa onu aç, yoxsa sınağa keç
  const catalog = <CatalogSection goals={goals} ready={catalogReady} onSaved={() => (both && !kbReady ? setOpen("kb") : onDone())} />;
  const knowledge = <KnowledgeSection kb={kb} reload={reload} site={site} catalog={cat} />;

  return (
    <Panel icon={cat ? ShoppingBag : BookOpen} title={title} desc={desc}
      footer={<Nav onBack={onBack} skip={!ready ? <Button variant="ghost" onClick={onNext}>{t("Sonra edərəm")}</Button> : undefined} next={<Button disabled={!ready} onClick={onNext}>{t("Davam et")}<ArrowRight size={16} aria-hidden /></Button>} />}>
      {ans && bizType && <QuickStart type={bizType} onDone={onQuick} />}
      {ans && bizType && <p className="-mb-2 text-sm font-medium">{t("Daha çox məlumat (istəyə bağlı)")}</p>}
      {both ? (
        <div className="flex flex-col gap-3">
          <Block icon={ShoppingBag} title={t("Elanlar və kataloq")} note={t("Qiymət, marka, şəhər üzrə axtarış")} ready={catalogReady} open={open === "catalog"} onToggle={() => setOpen(open === "catalog" ? null : "catalog")}>{catalog}</Block>
          <Block icon={BookOpen} title={t("Suallar üçün məlumat")} note={t("Çatdırılma, ödəniş, əlaqə, qaydalar")} ready={kbReady} open={open === "kb"} onToggle={() => setOpen(open === "kb" ? null : "kb")}>{knowledge}</Block>
        </div>
      ) : cat ? catalog : knowledge}
      {cat && !ans && (
        <button type="button" onClick={onAddAnswer} className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 text-left text-sm hover:border-foreground/40">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted"><BookOpen size={16} aria-hidden /></span>
          <span className="min-w-0 flex-1"><span className="block font-medium">{t("Çatdırılma, ödəniş kimi suallara da cavab versin?")}</span><span className="block text-xs text-muted-foreground">{t("İstəyə bağlıdır. Sonra Bilik bazası bölməsindən də əlavə edə bilərsən.")}</span></span>
          <span className="text-sm font-medium">{t("Əlavə et")}</span>
        </button>
      )}
    </Panel>
  );
}

/** Akkordeon bölməsi: başlıqda vəziyyət, içində forma */
function Block({ icon: Icon, title, note, ready, open, onToggle, children }: { icon: React.ElementType; title: string; note: string; ready: boolean; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className={cn("rounded-xl border", open ? "border-foreground/30" : "border-border")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 p-4 text-left">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><Icon size={17} aria-hidden /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block truncate text-xs text-muted-foreground">{note}</span></span>
        {ready ? <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><CircleCheck size={15} aria-hidden />{t("Hazırdır")}</span>
          : <span className="text-sm text-muted-foreground">{t("Qoşulmayıb")}</span>}
        <ChevronDown size={16} aria-hidden className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="flex flex-col gap-5 border-t border-border p-4">{children}</div>}
    </div>
  );
}

type KTab = "site" | "file" | "text" | "contact";
function KnowledgeSection({ kb, reload, site, catalog }: { kb: KbInfo | null; reload: () => void; site: boolean; catalog: boolean }) {
  const { t } = useI18n();
  const { tenant, refresh } = useSession();
  const [tab, setTab] = useState<KTab>(site ? "site" : "file");
  const [url, setUrl] = useState(site ? tenant?.domain ?? "" : "");
  const [crawl, setCrawl] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [c, setC] = useState<CompanyInfo>(tenant?.config.profile?.company ?? {});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sources = kb?.sources ?? [];
  const processing = sources.some((s) => s.status === "processing");
  useEffect(() => { if (!processing) return; const i = setInterval(reload, 2500); return () => clearInterval(i); }, [processing, reload]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); reload(); return true; } catch (err) { toast.error((err as Error).message); return false; } finally { setBusy(false); }
  };
  async function onFiles(list: FileList | null) {
    for (const f of Array.from(list ?? [])) {
      if (f.size > FILE_MAX) { toast.error(t("{name}: fayl 6 MB-dan böyükdür.", { name: f.name })); continue; }
      await run(() => kbUploadFile(f), t("{name} yükləndi, oxunur…", { name: f.name }));
    }
  }
  const tabs: { value: KTab; label: string }[] = [
    ...(site ? [{ value: "site" as KTab, label: t("Saytım") }] : []),
    { value: "file", label: t("Fayl") }, { value: "text", label: t("Mətn və FAQ") }, { value: "contact", label: t("Əlaqə məlumatı") },
  ];
  const fields: [keyof CompanyInfo, string, string][] = [["phone", t("Telefon"), "+994 12 000 00 00"], ["whatsapp", "WhatsApp", "+994 50 000 00 00"], ["email", t("E-poçt"), "info@sirket.az"], ["hours", t("İş saatları"), t("B.e.–Cümə 09:00–18:00")], ["address", t("Ünvan"), t("Bakı, Nizami küç. 10")]];

  return (
    <>
      <FilterPills value={tab} onChange={setTab} label={t("Mənbə")} items={tabs} />

      {tab === "site" && (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); const v = url.trim(); if (v) void run(() => kbAddUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`, crawl), t("Sayt əlavə edildi, oxunur…")); }}>
          <Label htmlFor="su-url">{t("Sayt və ya səhifə ünvanı")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="su-url" inputMode="url" placeholder="https://saytim.az" value={url} onChange={(e) => setUrl(e.target.value)} className="h-11" />
            <Button className="h-11 shrink-0" disabled={busy || !url.trim()}><Search size={16} aria-hidden />{t("Saytı oxu")}</Button>
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={crawl} onChange={(e) => setCrawl(e.target.checked)} className="mt-0.5 size-4" />
            <span>{t("Bütün saytı oxu (40 səhifəyə qədər)")}<span className="block text-xs text-muted-foreground">{catalog ? t("Söndürsən yalnız bu bir səhifə oxunur. Elanları burada yox, yuxarıdakı kataloq bölməsində qoş: onda qiymət və filtr dəqiq işləyir.") : t("Söndürsən yalnız bu bir səhifə oxunur.")}</span></span>
          </label>
        </form>
      )}

      {tab === "file" && (
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onFiles(e.dataTransfer.files); }}
          className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><FileUp size={22} aria-hidden /></span>
          <p className="text-sm font-medium">{t("Faylı bura at və ya seç")}</p>
          <p className="text-xs text-muted-foreground">{t("PDF, Word, TXT, MD, CSV, HTML · 6 MB-a qədər. Qaydalar, qiymət siyahısı, FAQ, müqavilə şərtləri.")}</p>
          <Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={16} aria-hidden />{t("Fayl seç")}</Button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.html,.htm" className="hidden" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
        </div>
      )}

      {tab === "text" && (
        <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => kbAddText(title.trim() || t("Ümumi məlumat"), text.trim()), t("Mətn əlavə edildi."))) { setTitle(""); setText(""); } }}>
          <div className="flex flex-col gap-1.5"><Label htmlFor="su-tt">{t("Başlıq")}</Label><Input id="su-tt" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t("məs. Çatdırılma və qaytarma")} /></div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-tx">{t("Mətn")}</Label>
            <Textarea id="su-tx" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Sual-cavab şəklində yaza bilərsən:\nÇatdırılma neçə günə olur? Bakı daxili 1-2 gün.\nQaytarmaq olar? 14 gün ərzində, qəbzlə.")} />
          </div>
          <div className="flex justify-end"><Button disabled={busy || text.trim().length < 20}>{t("Əlavə et")}</Button></div>
        </form>
      )}

      {tab === "contact" && (
        <form className="flex flex-col gap-3" onSubmit={async (e) => {
          e.preventDefault();
          const clean = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, (v ?? "").trim()]).filter(([, v]) => v)) as CompanyInfo;
          if (await run(() => saveProfile({ company: clean }), t("Saxlandı. Köməkçi artıq bu məlumatı istifadə edir."))) await refresh();
        }}>
          <p className="text-sm text-muted-foreground">{t("Müştəri telefon, ünvan və ya iş saatı soruşanda köməkçi yalnız buradakını deyir. Sənəd yükləməsən də bu kifayətdir.")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(([k, label, ph]) => (
              <div key={k} className={cn("flex flex-col gap-1.5", (k === "hours" || k === "address") && "sm:col-span-2")}>
                <Label htmlFor={`su-c-${k}`}>{label}</Label>
                <Input id={`su-c-${k}`} value={c[k] ?? ""} onChange={(e) => setC({ ...c, [k]: e.target.value })} placeholder={ph} maxLength={200} />
              </div>
            ))}
          </div>
          <div className="flex justify-end"><Button disabled={busy || !Object.values(c).some((v) => v?.trim())}>{t("Saxla")}</Button></div>
        </form>
      )}

      {sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("Əlavə etdiklərin")}</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {sources.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {s.url ? <Link2 size={15} className="shrink-0 text-muted-foreground" aria-hidden /> : <FileText size={15} className="shrink-0 text-muted-foreground" aria-hidden />}
                <span className="min-w-0 flex-1 truncate">{s.url ? s.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "") : s.name}</span>
                {s.status === "processing" && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 size={14} className="animate-spin" aria-hidden />{t("Oxunur…")}</span>}
                {s.status === "ready" && <span className="inline-flex items-center gap-1 text-emerald-700"><CircleCheck size={14} aria-hidden />{t("Hazırdır")}</span>}
                {s.status === "failed" && <span role="alert" className="text-destructive">{t("Alınmadı")}</span>}
              </li>
            ))}
          </ul>
          {sources.some((s) => s.status === "failed") && <p className="text-xs text-muted-foreground">{t("Sayt oxunmadısa (məs. qorunur və ya şəkil kimi PDF-dir), mətni “Mətn və FAQ” bölməsinə yapışdır.")}</p>}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("Hamısını sonra")} <Link href="/knowledge" className="font-medium text-foreground underline underline-offset-2">{t("Bilik bazası")}</Link> {t("bölməsində idarə edirsən: hazır cavablar, ssenarilər, yeniləmə.")}</p>
    </>
  );
}

type CWay = "woo" | "feed" | "api";
function CatalogSection({ goals, ready, onSaved }: { goals: Goal[]; ready: boolean; onSaved: () => void }) {
  const { t } = useI18n();
  const { tenant, refresh } = useSession();
  const [way, setWay] = useState<CWay | null>(null);
  const [woo, setWoo] = useState(hasSite(tenant?.domain) ? `https://${tenant?.domain}` : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sample, setSample] = useState<Listing[] | null>(null);
  const site = hasSite(tenant?.domain);
  const [changing, setChanging] = useState(false);
  // Fayl/WooCommerce qoşulanda (ready yalnız indi true oldu) seçim bağlanır, yerinə "qoşulub" kartı görünür
  const wasReady = useRef(ready);
  useEffect(() => { if (ready && !wasReady.current) { setWay(null); setChanging(false); } wasReady.current = ready; }, [ready]);
  const src = tenant?.config.source as { type?: string; baseUrl?: string; search?: { path?: string }; filters?: Record<string, unknown>; feed?: { url?: string; fileName?: string; count?: number } } | undefined;
  const nFilters = Object.keys(src?.filters ?? {}).filter((k) => k !== "sort" && k !== "limit").length;
  const kind = src?.type === "feed" ? t("Fayl və ya link") : /wp-json\/wc\/store/.test(src?.search?.path ?? "") ? "WooCommerce" : t("Saytın API-si");
  const where = src?.type === "feed" ? src.feed?.url ?? src.feed?.fileName ?? "" : `${(src?.baseUrl ?? "").replace(/^https?:\/\//, "")}${(src?.search?.path ?? "").split("?")[0]}`;

  async function connectWoo(e: React.FormEvent) {
    e.preventDefault();
    const base = wooBaseUrl(woo);
    if (!base || !tenant) { setErr(t("Saytın ünvanını yaz, məs. https://magaza.az (https olmalıdır).")); return; }
    setBusy(true); setErr("");
    try {
      // Diqqət: profil "support" rejimində qalsa backend mənbəni nəzərə almır, ona görə rejimi məqsədə görə qoyuruq
      const profile = { ...wooConfig(base).profile, ...tenant.config.profile, mode: goals.includes("answer") ? "both" as const : "listings" as const };
      const r = await updateConfig({ ...wooConfig(base), businessName: tenant.businessName, domain: tenant.domain, profile });
      setSample(r.sampleListings);
      await refresh();
      toast.success(t("Mağaza qoşuldu: {n} məhsul oxundu.", { n: r.sampleListings.length }));
    } catch (er) { setErr((er as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      {ready && !way && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-600/25 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CircleCheck size={20} className="shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t("Elanların qoşulub: {kind}", { kind })}</span>
            <span className="block truncate text-emerald-800/80">{where}{nFilters ? ` · ${t("{n} filtr", { n: nFilters })}` : ""}</span>
          </span>
          {!changing && <Button type="button" variant="outline" size="sm" className="bg-card" onClick={() => setChanging(true)}>{t("Dəyiş")}</Button>}
        </div>
      )}
      {(!ready || changing || way) && <div role="radiogroup" aria-label={t("Qoşulma yolu")} className="grid gap-3 md:grid-cols-3">
        <Choice on={way === "woo"} onClick={() => setWay("woo")} icon={ShoppingCart} title="WooCommerce" badge={t("1 dəqiqə")} text={t("WordPress mağazası: yalnız sayt ünvanı lazımdır, açar və proqramçı lazım deyil.")} />
        <Choice on={way === "feed"} onClick={() => setWay("feed")} icon={FileUp} title={t("Fayl və ya link")} badge={t("Proqramçısız")} text={t("CSV, Excel-dən CSV, JSON, XML fayl və ya feed linki (Google Merchant, Facebook kataloqu). Link avtomatik yenilənir.")} />
        <Choice on={way === "api"} onClick={() => setWay("api")} icon={Plug} title={t("Saytın API-si və filtrləri")} badge={t("Ən dəqiq")} text={t("Köməkçi saytının öz axtarışını və filtrlərini (marka, qiymət, şəhər…) işlədir. API ünvanını yapışdır, qalanını forma ilə qur: 5–10 dəqiqə.")} />
      </div>}

      {way === "woo" && (
        <form onSubmit={connectWoo} className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4">
          <Label htmlFor="su-woo">{t("Mağazanın ünvanı")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="su-woo" className="h-11" placeholder="https://magaza.az" value={woo} onChange={(e) => setWoo(e.target.value)} />
            <Button className="h-11 shrink-0" disabled={busy || !woo.trim()}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ShoppingCart size={16} aria-hidden />}{t("Qoş və yoxla")}</Button>
          </div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <p className="text-xs text-muted-foreground">{t("“Məhsul gəlmədi” xətası çıxsa, hosting və ya təhlükəsizlik plaginində /wp-json yolu bağlı ola bilər.")}</p>
        </form>
      )}
      {way === "feed" && tenant && <FeedSetup businessName={tenant.businessName} domain={tenant.domain} onIssuedKey={() => {}} />}
      {way === "api" && (
        <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <ApiBuilder goals={goals} onSaved={() => { setWay(null); setChanging(false); onSaved(); }} />
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            {t("API ünvanını bilmirsən?")}
            <a href={`mailto:?subject=${encodeURIComponent(t("Saytın API-sini çat köməkçisinə qoşmaq"))}&body=${encodeURIComponent(t("Salam! Saytımızın elan siyahısını qaytaran API ünvanı lazımdır (məs. https://api.saytimiz.az/listings), açar varsa onu da. Bir də filtr parametrlərinin adları: marka, qiymət aralığı, şəhər və s."))}`} className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline"><Mail size={13} aria-hidden />{t("Proqramçıdan soruş")}</a>
            {!site && <span>{t("Saytın yoxdursa, fayl yolu daha uyğundur.")}</span>}
          </p>
        </div>
      )}
      {sample && sample.length > 0 && <ListingTable listings={sample} />}
    </>
  );
}

// ---------------------------------------------------------------- 5. Sınaq
function StepTest({ goals, bizType, dataReady, accent, onTested, onFix, onNext, onBack }: { goals: Goal[]; bizType?: BizType; dataReady: boolean; accent?: string; onTested: () => void; onFix: () => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [msgs, setMsgs] = useState<{ role: "user" | "model"; text: string; listings?: Listing[] }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typed = testIdeas(bizType, t);
  const ideas = typed.length ? [...typed, ...(goals.includes("catalog") ? [t("Ən ucuz variant hansıdır?")] : [])] : [
    ...(goals.includes("answer") ? [t("İş saatlarınız necədir?"), t("Çatdırılma var?")] : []),
    ...(goals.includes("catalog") ? [t("1000 AZN-ə qədər nə təklif edərsiniz?"), t("Ən ucuz variant hansıdır?")] : []),
    t("Sizinlə necə əlaqə saxlaya bilərəm?"),
  ];
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length, busy]);
  async function send(text: string) {
    const v = text.trim();
    if (!v || busy) return;
    const history = msgs;
    setMsgs([...history, { role: "user", text: v }]); setInput(""); setBusy(true);
    try {
      const r = await chat(v, history.map((m) => ({ role: m.role, text: m.text })));
      setMsgs((cur) => [...cur, { role: "model", text: r.answer, listings: r.listings }]);
      // Yalnız real məlumatla verilmiş cavab sınaq sayılır (köməkçi "bilmirəm" deyibsə yox)
      if (dataReady && !r.unanswered) onTested();
    }
    catch (e) { setMsgs((cur) => [...cur, { role: "model", text: (e as Error).message }]); }
    finally { setBusy(false); }
  }
  return (
    <Panel icon={Sparkles} title={t("Müştəri kimi yoxla")} desc={t("Bir neçə sual ver. Cavab səhv və ya natamamdırsa, geri qayıdıb məlumat əlavə et.")}
      footer={<Nav onBack={onBack} next={<Button onClick={onNext}>{t("Davam et")}<ArrowRight size={16} aria-hidden /></Button>} />}>
      {!dataReady && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="min-w-0 flex-1">{t("Köməkçinin hələ məlumatı yoxdur, ona görə suallara cavab verə bilməyəcək. Əvvəl elanlarını və ya məlumatını əlavə et.")}</span>
          <Button type="button" size="sm" variant="outline" className="bg-card" onClick={onFix}>{t("Məlumat əlavə et")}</Button>
        </div>
      )}
      <div className="flex h-[30rem] flex-col overflow-hidden rounded-xl border border-border">
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-muted/30 p-4" role="log" aria-live="polite" aria-label={t("Söhbət")}>
          {!msgs.length && (
            <div className="m-auto flex max-w-md flex-col items-center gap-3 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-card shadow-sm"><Sparkles size={19} aria-hidden /></span>
              <p className="text-sm text-muted-foreground">{t("Hazır suallardan birini seç və ya özün yaz.")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ideas.map((i) => <button key={i} type="button" onClick={() => send(i)} disabled={busy} className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-foreground/40 disabled:opacity-50">{i}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex max-w-full flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
              <div className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "rounded-br-md" : "rounded-bl-md border border-border bg-card")} style={m.role === "user" ? accentStyle(accent) : undefined}>{m.role === "model" ? <Rich text={m.text} /> : m.text}</div>
              {m.listings && m.listings.length > 0 && <div className="w-full max-w-sm"><ListingCards listings={m.listings} accent={accent} /></div>}
            </div>
          ))}
          {busy && <div className="self-start text-sm text-muted-foreground"><Loader2 size={14} className="inline animate-spin" aria-hidden /> {t("Cavab yazılır…")}</div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2 border-t border-border bg-card p-2.5">
          <Input value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} aria-label={t("Mesaj")} placeholder={t("Müştəri kimi sual yaz…")} />
          <Button disabled={busy || !input.trim()} aria-label={t("Göndər")}><Send size={16} aria-hidden /></Button>
        </form>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- 6. Yayımla
type Platform = "html" | "wordpress" | "next" | "gtm" | "builder";
function StepLaunch({ widget, reload, site, goals, onBack }: { widget: WidgetResponse | null; reload: () => void; site: boolean; goals: Goal[]; onBack: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pf, setPf] = useState<Platform>("html");
  const [copied, setCopied] = useState(false);
  const [tg, setTg] = useState<TelegramStatus | null>(null);
  const [wa, setWa] = useState<WhatsAppStatus | null>(null);
  const installed = Boolean(widget?.widget.lastSeenAt);
  useEffect(() => { getTelegram().then(setTg).catch(() => {}); getWhatsApp().then(setWa).catch(() => {}); }, []);
  useEffect(() => { if (!site || installed) return; const i = setInterval(reload, 5000); return () => clearInterval(i); }, [site, installed, reload]);
  const code = widget ? `<script src="${widget.scriptUrl}" data-key="${widget.widget.key}" defer></script>` : "";
  const how: Record<Platform, string> = {
    html: t("Saytının hər səhifəsində </body> teqindən dərhal əvvəl yapışdır (adətən ümumi şablon və ya footer faylı)."),
    wordpress: t("“WPCode” (və ya “Insert Headers and Footers”) plaginini qur → Code Snippets → Footer bölməsinə yapışdır → Saxla. Plaginsiz: Görünüş → Tema redaktoru → footer.php, </body>-dən əvvəl."),
    next: t("app/layout.tsx faylında <body> içinə next/script ilə əlavə et: <Script src=… data-key=… strategy=\"afterInteractive\" />."),
    gtm: t("Google Tag Manager → Yeni teq → Custom HTML → kodu yapışdır → Trigger: All Pages → Submit və Publish."),
    builder: t("Tilda: Sayt ayarları → Daha çox → HEAD/BODY kodu. Wix: Ayarlar → Custom Code → Body-end. Shopify: Online Store → Themes → Edit code → theme.liquid, </body>-dən əvvəl."),
  };
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast.error(t("Kopyalamaq alınmadı, kodu əl ilə seç.")); }
  }
  const mail = `mailto:?subject=${encodeURIComponent(t("Sayta çat kodu əlavə etmək"))}&body=${encodeURIComponent(`${t("Salam! Bu kodu saytın bütün səhifələrində </body> teqindən əvvəl əlavə edə bilərsən?")}\n\n${code}`)}`;
  const channelBadge = (on: boolean | undefined) => on ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CircleCheck size={13} aria-hidden />{t("Qoşulub")}</span> : <span className="text-xs text-muted-foreground">{t("Qoşulmayıb")}</span>;

  const nextSteps = [
    { href: "/embed", icon: Code2, title: t("Çatın görünüşü"), note: t("Rəng, salam mesajı, düymənin yeri") },
    { href: "/settings/team", icon: Headset, title: t("Komandanı dəvət et"), note: t("Operatorlar söhbətlərə cavab versin") },
    { href: "/knowledge", icon: BookOpen, title: t("Bilik bazasını genişləndir"), note: t("Hazır cavablar və ssenarilər") },
    { href: "/settings/notifications", icon: Rocket, title: t("Bildirişlər"), note: t("Yeni söhbəti dərhal gör") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <ReadySummary />
      {site && (
        <Panel icon={Code2} title={t("Çatı saytına qoş")} desc={t("Bir sətir kod. Bir dəfə yapışdırırsan, sonrakı dəyişikliklər (rəng, mətn) paneldən avtomatik tətbiq olunur.")}>
          <FilterPills value={pf} onChange={setPf} label={t("Platforma")} items={[{ value: "html", label: "HTML" }, { value: "wordpress", label: "WordPress" }, { value: "next", label: "Next.js / React" }, { value: "gtm", label: "Tag Manager" }, { value: "builder", label: "Tilda · Wix · Shopify" }]} />
          <div className="overflow-hidden rounded-xl bg-[#09090b]">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
              <span className="text-xs font-medium text-white/60">{t("Quraşdırma kodu")}</span>
              <button type="button" onClick={copy} disabled={!code} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-white/85 hover:bg-white/10">{copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}{copied ? t("Kopyalandı") : t("Kopyala")}</button>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-zinc-200"><code>{code || "…"}</code></pre>
          </div>
          <p className="text-sm text-muted-foreground">{how[pf]}</p>
          <div className="flex flex-wrap gap-2">
            <a href={mail} className={buttonVariants({ variant: "outline" })}><Mail size={16} aria-hidden />{t("Proqramçıya göndər")}</a>
            {widget && <a href={`https://${widget.domain ?? ""}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost" })}><Globe size={16} aria-hidden />{t("Saytı aç")}</a>}
          </div>
          <div role="status" className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", installed ? "border-emerald-600/25 bg-emerald-50 text-emerald-900" : "border-border bg-muted/40")}>
            {installed ? <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden /> : <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />}
            <div>
              <p className="font-medium">{installed ? t("Çat saytında aşkar edildi. Hər şey hazırdır!") : t("Saytda hələ görünmür. Kodu yapışdırıb saytını yenilə, burada avtomatik yoxlanır.")}</p>
              {!installed && <p className="mt-1 text-muted-foreground">{t("Görünmürsə: domenin düzgün olduğuna, kodun bütün səhifələrdə olduğuna və keşin təmizləndiyinə bax.")}</p>}
            </div>
          </div>
        </Panel>
      )}

      <Panel icon={MessageCircle} title={site ? t("Başqa kanallar (istəyə bağlı)") : t("Köməkçini harada işlədəcəksən?")} desc={t("Eyni köməkçi və bilik bazası Telegram və WhatsApp-da da cavab verir, söhbətlər bir qutuya düşür.")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { id: "telegram", icon: Send, name: "Telegram", note: t("Öz botunu bir tokenlə qoş."), on: tg?.connected, href: "/channels?c=telegram" },
            { id: "whatsapp", icon: MessageCircle, name: "WhatsApp", note: t("Nömrəni QR kodla qoş."), on: wa?.connected, href: "/channels?c=whatsapp" },
          ].map((c) => (
            <Link key={c.id} href={c.href} className="flex items-center gap-3 rounded-xl border border-border p-4 hover:border-foreground/40">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"><c.icon size={18} aria-hidden /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{c.name}</span><span className="block text-xs text-muted-foreground">{c.note}</span></span>
              {channelBadge(c.on)}
            </Link>
          ))}
        </div>
      </Panel>

      <LiveCard widget={widget} reload={reload} />

      <Panel icon={Store} title={t("Növbəti addımlar")} desc={t("Köməkçin işləyir. Bunlar onu daha da faydalı edir.")}
        footer={<Nav onBack={onBack} next={<Button onClick={() => router.push("/dashboard")}>{t("Panelə keç")}<ArrowRight size={16} aria-hidden /></Button>} />}>
        <div className="grid gap-2 sm:grid-cols-2">
          {nextSteps.map((s) => (
            <Link key={s.href} href={s.href} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-foreground/40">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted"><s.icon size={17} aria-hidden /></span>
              <span className="min-w-0"><span className="block text-sm font-medium">{s.title}</span><span className="block truncate text-xs text-muted-foreground">{s.note}</span></span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** Canlı operator: köməkçi bilmədikdə və ya müştəri istəyəndə söhbət komandaya ötürülür. Ayarlarda da dəyişir. */
function LiveCard({ widget, reload }: { widget: WidgetResponse | null; reload: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const on = Boolean(widget?.widget.live?.enabled);
  async function toggle(v: boolean) {
    setBusy(true);
    try { await saveWidget({ live: { enabled: v } }); reload(); toast.success(v ? t("Canlı operator açıldı.") : t("Canlı operator bağlandı.")); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"><Headset size={19} aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{t("Canlı operator")} <span className="text-sm font-normal text-muted-foreground">{t("(istəyə bağlı)")}</span></h2>
        <p className="text-sm text-muted-foreground">{t("Köməkçi cavab tapmayanda və ya müştəri insanla danışmaq istəyəndə söhbət sənə ötürülür, paneldən cavab yazırsan.")}</p>
      </div>
      <Switch checked={on} onChange={(v) => { if (!busy) void toggle(v); }} label={t("Canlı operator")} />
    </section>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { clearActionLog, deleteActions, getActionLog, getActions, newSigningSecret, saveActions, testAction, type ActionItem, type ActionLogEntry, type ActionParam, type ActionsData, type ActionTestResult } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { DangerAction } from "@/components/danger-action";
import { KeyReveal } from "@/components/key-reveal";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const blankParam = (): ActionParam => ({ name: "", type: "string", description: "", required: true });
const blankAction = (p: Partial<ActionItem> = {}): ActionItem => ({ key: "", title: "", description: "", method: "POST", path: "/", params: [], requireIdentity: false, enabled: true, ...p });
type Form = Omit<ActionItem, "params"> & { params: (ActionParam & { enumText?: string })[] };
const toForm = (a: ActionItem): Form => ({ ...a, params: a.params.map((p) => ({ ...p, enumText: p.enum?.join(", ") ?? "" })) });
const toItem = (f: Form): ActionItem => ({
  key: f.key.trim(), title: f.title.trim(), description: f.description.trim(), method: f.method, path: f.path.trim(),
  requireIdentity: f.requireIdentity === true, enabled: f.enabled !== false,
  ...(f.confirmText?.trim() && { confirmText: f.confirmText.trim() }), ...(f.successMessage?.trim() && { successMessage: f.successMessage.trim() }),
  params: f.params.filter((p) => p.name.trim()).map((p) => ({
    name: p.name.trim(), type: p.type, description: p.description.trim(), required: p.required === true,
    ...(p.type === "enum" && { enum: (p.enumText ?? "").split(",").map((x) => x.trim()).filter(Boolean) }),
    ...(p.type === "string" && p.maxLength ? { maxLength: Number(p.maxLength) } : {}),
    ...((p.type === "number" || p.type === "integer") && p.min !== undefined && String(p.min) !== "" ? { min: Number(p.min) } : {}),
    ...((p.type === "number" || p.type === "integer") && p.max !== undefined && String(p.max) !== "" ? { max: Number(p.max) } : {}),
  })),
});

const VERIFY_NODE = `import crypto from "node:crypto";
// req.rawBody: dəyişdirilməmiş sorğu gövdəsi (string). Sirr: bu səhifədəki imza açarı.
export function verifyChatbotRequest(req, secret = process.env.CHATBOT_SIGNING_SECRET) {
  const ts = Number(req.headers["x-chatbot-timestamp"]);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false; // köhnə/təkrar sorğu
  const signed = \`\${ts}.\${req.method}.\${req.originalUrl}.\${req.rawBody ?? ""}\`;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(signed).digest("hex");
  const got = String(req.headers["x-chatbot-signature"] ?? "");
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
// Eyni X-Chatbot-Idempotency-Key ikinci dəfə gələrsə əməliyyatı təkrar icra etmə.`;
const VERIFY_PY = `import hashlib, hmac, time
def verify_chatbot_request(method, path_with_query, raw_body, headers, secret):
    ts = int(headers.get("X-Chatbot-Timestamp", "0"))
    if abs(time.time() - ts) > 300:
        return False  # köhnə/təkrar sorğu
    signed = f"{ts}.{method}.{path_with_query}.{raw_body}".encode()
    expected = "sha256=" + hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(headers.get("X-Chatbot-Signature", ""), expected)
# Eyni X-Chatbot-Idempotency-Key ikinci dəfə gələrsə əməliyyatı təkrar icra etmə.`;

function Code({ code }: { code: string }) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed"><code>{code}</code></pre>
      <Button type="button" size="sm" variant="outline" className="absolute right-2 top-2" onClick={() => { navigator.clipboard?.writeText(code).then(() => toast.success(t("Kopyalandı")), () => toast.error(t("Kopyalanmadı. Açarı əl ilə seçib kopyala."))); }}>{t("Kopyala")}</Button>
    </div>
  );
}

const select = "h-10 rounded-md border border-border bg-card px-2 text-sm";

function ActionCard({ f, set, remove, index, identityReady }: { f: Form; set: (a: Form) => void; remove: () => void; index: number; identityReady: boolean }) {
  const { t } = useI18n();
  const up = (p: Partial<Form>) => set({ ...f, ...p });
  const setParam = (i: number, p: Partial<Form["params"][number]>) => up({ params: f.params.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const id = (n: string) => `act${index}-${n}`;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle className="text-base">{f.title || t("Yeni əməliyyat")}</CardTitle><CardDescription>{t("AI bu əməliyyatı yalnız istifadəçi açıq istəyəndə təklif edir; icra üçün istifadəçi ayrıca təsdiq verir.")}</CardDescription></div>
          <Button type="button" size="sm" variant="outline" onClick={remove}>{t("Sil")}</Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor={id("title")}>{t("Ad (istifadəçiyə görünür)")}</Label><Input id={id("title")} value={f.title} maxLength={60} onChange={(e) => up({ title: e.target.value })} required /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("key")}>{t("Texniki ad (latın, kiçik hərf)")}</Label><Input id={id("key")} value={f.key} onChange={(e) => up({ key: e.target.value })} placeholder="cancel_order" pattern="[a-z][a-z0-9_]{1,30}" required /></div>
        </div>
        <div className="flex flex-col gap-1"><Label htmlFor={id("desc")}>{t("Təsvir: AI bu əməliyyatı nə vaxt təklif etsin?")}</Label><Input id={id("desc")} value={f.description} maxLength={300} onChange={(e) => up({ description: e.target.value })} required /></div>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div className="flex flex-col gap-1"><Label htmlFor={id("m")}>{t("Metod")}</Label>
            <select id={id("m")} value={f.method} onChange={(e) => up({ method: e.target.value as Form["method"] })} className={select}><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("path")}>{t("Sorğu ünvanı")}</Label><Input id={id("path")} value={f.path} onChange={(e) => up({ path: e.target.value })} placeholder="/orders/{orderNo}/cancel" required /></div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.requireIdentity === true} onChange={(e) => up({ requireIdentity: e.target.checked })} />{t("Yalnız daxil olmuş istifadəçi üçün (tövsiyə olunur)")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.enabled !== false} onChange={(e) => up({ enabled: e.target.checked })} />{t("Aktivdir")}</label>
        </div>
        {f.requireIdentity
          ? <p className="text-xs text-muted-foreground">{t("İstifadəçinin ID-si sorğuya (userId) saytın imzaladığı tokendən əlavə olunur. Ünvanda {userId} yaza bilərsən. AI onu dəyişə bilməz.")}{!identityReady && <> <b>{t("Əvvəlcə “Müştəri məlumatı” bölməsində gizli açar yarat.")}</b></>}</p>
          : <p className="text-xs text-destructive">{t("Diqqət: bu əməliyyat daxil olmamış ziyarətçilərə də açıqdır. Yalnız zərərsiz əməliyyatlar üçün (bilet, müraciət, rezerv) istifadə et; sifariş ləğvi kimi hesaba aid işlər üçün yuxarıdakı qutunu işarələ.")}</p>}
        <div>
          <p className="mb-2 text-sm font-medium">{t("Parametrlər: AI bunları istifadəçidən soruşur")}</p>
          <div className="flex flex-col gap-2">
            {f.params.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_7rem_1fr_auto]">
                <Input aria-label={t("Ad")} placeholder={t("Ad (məs. orderNo)")} value={p.name} onChange={(e) => setParam(i, { name: e.target.value })} />
                <select aria-label={t("Növ")} value={p.type} onChange={(e) => setParam(i, { type: e.target.value as ActionParam["type"] })} className={select}>
                  <option value="string">{t("Mətn")}</option><option value="number">{t("Ədəd")}</option><option value="integer">{t("Tam ədəd")}</option><option value="boolean">{t("Bəli/xeyr")}</option><option value="enum">{t("Siyahıdan seçim")}</option></select>
                <Input aria-label={t("Təsvir")} placeholder={t("Təsvir (AI üçün)")} value={p.description} onChange={(e) => setParam(i, { description: e.target.value })} className="col-span-2 sm:col-span-1" />
                <Button type="button" size="sm" variant="outline" aria-label={t("Sil")} onClick={() => up({ params: f.params.filter((_, j) => j !== i) })}>×</Button>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={p.required === true} onChange={(e) => setParam(i, { required: e.target.checked })} />{t("Məcburi")}</label>
                {p.type === "enum" && <Input aria-label={t("Dəyərlər")} placeholder={t("Dəyərlər (vergüllə): gec, səhv, başqa")} value={p.enumText ?? ""} onChange={(e) => setParam(i, { enumText: e.target.value })} className="col-span-2 sm:col-span-3" />}
                {p.type === "string" && <Input aria-label={t("Maksimum uzunluq")} type="number" placeholder={t("Maks. uzunluq (200)")} value={p.maxLength ?? ""} onChange={(e) => setParam(i, { maxLength: e.target.value ? Number(e.target.value) : undefined })} className="col-span-2 sm:col-span-3" />}
                {(p.type === "number" || p.type === "integer") && <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-3"><Input aria-label="min" type="number" placeholder="min" value={p.min ?? ""} onChange={(e) => setParam(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} /><Input aria-label="max" type="number" placeholder="max" value={p.max ?? ""} onChange={(e) => setParam(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>}
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => up({ params: [...f.params, blankParam()] })} disabled={f.params.length >= 8}>{t("Parametr əlavə et")}</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor={id("ct")}>{t("Təsdiq mətni (ixtiyari)")}</Label><Input id={id("ct")} value={f.confirmText ?? ""} maxLength={200} onChange={(e) => up({ confirmText: e.target.value })} placeholder={t("Sifariş {orderNo} ləğv olunacaq")} /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("sm")}>{t("Uğur mesajı (ixtiyari)")}</Label><Input id={id("sm")} value={f.successMessage ?? ""} maxLength={200} onChange={(e) => up({ successMessage: e.target.value })} placeholder={t("Sifariş {orderNo} ləğv edildi.")} /></div>
        </div>
        <p className="text-xs text-muted-foreground">{t("Təsdiq kartında bütün parametr dəyərləri həmişə göstərilir: mətn onları gizlədə bilməz.")}</p>
      </CardContent>
    </Card>
  );
}

function ActionsPage() {
  const { t, short } = useI18n();
  const [data, setData] = useState<ActionsData | null>(null);
  const [error, setError] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authType, setAuthType] = useState("bearer");
  const [authName, setAuthName] = useState("X-Api-Key");
  const [secret, setSecret] = useState("");
  const [items, setItems] = useState<Form[]>([]);
  const [preset, setPreset] = useState("cancel");
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [lang, setLang] = useState<"node" | "py">("node");
  const [log, setLog] = useState<ActionLogEntry[] | null>(null);
  const [testKey, setTestKey] = useState("");
  const [testVals, setTestVals] = useState<Record<string, string>>({});
  const [testUser, setTestUser] = useState("test-user");
  const [realOk, setRealOk] = useState(false);
  const [testOut, setTestOut] = useState<ActionTestResult | string | null>(null);

  const apply = useCallback((d: ActionsData) => {
    setData(d);
    setBaseUrl(d.baseUrl ?? ""); setAuthType(d.auth?.type ?? "bearer"); setAuthName(d.auth?.name ?? "X-Api-Key");
    setItems(d.items.map(toForm)); setTestKey((k) => k || d.items[0]?.key || "");
  }, []);
  const loadLog = useCallback(() => { getActionLog().then((r) => setLog(r.entries)).catch(() => setLog([])); }, []);
  useEffect(() => { getActions().then(apply).catch((e: Error) => setError(e.message)); loadLog(); }, [apply, loadLog]);

  const STATUS: Record<ActionLogEntry["status"], string> = { done: t("icra olundu"), failed: t("alınmadı"), unknown: t("bəlli deyil"), cancelled: t("ləğv edildi"), expired: t("vaxtı bitdi"), denied: t("rədd edildi"), test: t("sınaq") };
  const presets: { id: string; label: string; make: () => Form }[] = [
    { id: "cancel", label: t("Sifarişi ləğv et"), make: () => toForm(blankAction({ key: "cancel_order", title: t("Sifarişi ləğv et"), description: t("İstifadəçi öz sifarişini ləğv etmək istəyəndə"), path: "/orders/{orderNo}/cancel", requireIdentity: true,
      params: [{ name: "orderNo", type: "string", description: t("Sifariş nömrəsi"), required: true, maxLength: 30 }], confirmText: t("Sifariş {orderNo} ləğv olunacaq"), successMessage: t("Sifariş {orderNo} ləğv edildi.") })) },
    { id: "ticket", label: t("Dəstək bileti yarat"), make: () => toForm(blankAction({ key: "create_ticket", title: t("Dəstək bileti yarat"), description: t("İstifadəçi problem barədə rəsmi müraciət (bilet) açmaq istəyəndə"), path: "/tickets",
      params: [{ name: "subject", type: "string", description: t("Problemin qısa mövzusu"), required: true, maxLength: 100 }, { name: "message", type: "string", description: t("Problemin təsviri"), required: true, maxLength: 500 }], confirmText: t("Bilet açılacaq: {subject}"), successMessage: t("Biletiniz yaradıldı, tezliklə cavab veriləcək.") })) },
    { id: "book", label: t("Görüş / rezerv"), make: () => toForm(blankAction({ key: "book_appointment", title: t("Görüş rezerv et"), description: t("İstifadəçi görüş, qəbul və ya rezerv etmək istəyəndə"), path: "/appointments",
      params: [{ name: "date", type: "string", description: t("Tarix (YYYY-MM-DD)"), required: true, maxLength: 10 }, { name: "time", type: "string", description: t("Saat (HH:MM)"), required: true, maxLength: 5 }, { name: "phone", type: "string", description: t("Telefon nömrəsi"), required: true, maxLength: 20 }], confirmText: t("{date} {time} üçün rezerv ediləcək"), successMessage: t("Rezerviniz qeydə alındı.") })) },
    { id: "lead", label: t("Lead göndər (CRM)"), make: () => toForm(blankAction({ key: "send_lead", title: t("Müraciət göndər"), description: t("İstifadəçi satış və ya təklif üçün əlaqə qoymaq istəyəndə"), path: "/leads",
      params: [{ name: "name", type: "string", description: t("Ad"), required: true, maxLength: 80 }, { name: "phone", type: "string", description: t("Telefon nömrəsi"), required: true, maxLength: 20 }], confirmText: t("{name} ({phone}) üçün müraciət göndəriləcək"), successMessage: t("Müraciətiniz göndərildi.") })) },
    { id: "custom", label: t("Digər (özün təyin et)"), make: () => toForm(blankAction()) },
  ];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const body = {
        baseUrl: baseUrl.trim(), ...(secret.trim() && { apiSecret: secret.trim() }),
        auth: authType === "none" ? { type: "none" } : { type: authType, ...(authType === "header" && { name: authName.trim() }) },
        items: items.map(toItem),
      };
      const r = await saveActions(body);
      const { signingSecret, ...view } = r;
      apply(view); setSecret("");
      if (signingSecret) setRevealed(signingSecret);
      toast.success(t("Yadda saxlanıldı."));
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }
  async function rotate() {
    try { setRevealed((await newSigningSecret()).signingSecret); setData(await getActions()); }
    catch (err) { toast.error((err as Error).message); }
  }
  const testSpec = data?.items.find((i) => i.key === testKey);
  async function runTest(send: boolean) {
    if (!testSpec) return;
    setTestOut(null);
    try {
      const params = Object.fromEntries(Object.entries(testVals).filter(([k, v]) => v.trim() && testSpec.params.some((p) => p.name === k)));
      setTestOut(await testAction({ key: testSpec.key, params, send, ...(testSpec.requireIdentity && { userId: testUser.trim() }) }));
      if (send) loadLog();
    } catch (err) { setTestOut((err as Error).message); }
  }

  if (!data) return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <FormSkeleton />;
  const saved = data.configured && data.items.length > 0;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Əməliyyatlar")}</h1>
        <p className="text-sm text-muted-foreground">{t("Çat istifadəçinin istəyi ilə sənin saytında əməliyyat icra edə bilsin: sifarişi ləğv et, bilet yarat, görüş rezerv et, müraciət göndər. Hər əməliyyat yalnız istifadəçi kartı görüb təsdiq verəndən sonra icra olunur.")}</p>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge className={saved ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>{t("Əməliyyatlar qoşulub")}</Badge>
        <Badge className={data.signing.configured ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>{t("İmza açarı yaradılıb")}</Badge>
        <Badge className={data.identityReady ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>{t("İstifadəçi tokeni hazırdır")}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Təhlükəsizlik necə işləyir")}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <p>{t("AI heç vaxt əməliyyatı özü icra etmir. O yalnız təklif yaradır; istifadəçi nə olacağını (bütün dəyərlərlə) kartda görür və “Təsdiq et” düyməsinə basır. Təsdiq birdəfəliklədir və 10 dəqiqədən sonra bitir.")}</p>
          <p>{t("Yalnız burada təyin etdiyin əməliyyatlar və parametrlər mümkündür. Hər parametr tip, uzunluq və icazəli dəyərlər üzrə yoxlanır, artıq sahələr atılır.")}</p>
          <p>{t("İstifadəçi ID-si yalnız saytın imzaladığı tokendən gəlir; AI və ya ziyarətçi başqasının adından əməliyyat edə bilməz. Təsdiqi də eyni istifadəçi verməlidir.")}</p>
          <p>{t("Sorğular imzalanır (HMAC), təkrar icra qarşısı üçün unikal açarla gedir və avtomatik təkrarlanmır. Cavab gəlməzsə nəticə “bəlli deyil” kimi bildirilir, uğur uydurulmur.")}</p>
          <p>{t("İstifadəçi başına saatda 5 icra, sayt üzrə gündə 500 icra limiti var. Hər addım aşağıdakı jurnala yazılır.")}</p>
        </CardContent>
      </Card>

      <form onSubmit={save} className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("1. Sənin API-n")}</CardTitle><CardDescription>{t("Əməliyyatları icra edən daxili API. Yalnız yazma sorğuları (POST, PUT, PATCH, DELETE) göndərilir; oxuma üçün “Müştəri məlumatı” bölməsindən istifadə et.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1"><Label htmlFor="ac-base">{t("API ünvanı (https)")}</Label><Input id="ac-base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.saytin.az" required /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1"><Label htmlFor="ac-at">{t("Autentifikasiya")}</Label>
                <select id="ac-at" value={authType} onChange={(e) => setAuthType(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm"><option value="bearer">Bearer</option><option value="header">Header</option><option value="none">{t("Yoxdur")}</option></select></div>
              {authType === "header" && <div className="flex flex-col gap-1"><Label htmlFor="ac-an">{t("Ad")}</Label><Input id="ac-an" value={authName} onChange={(e) => setAuthName(e.target.value)} /></div>}
              {authType !== "none" && <div className="flex flex-col gap-1"><Label htmlFor="ac-sec">{t("API açarı")}</Label><Input id="ac-sec" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={data.auth?.hasSecret ? t("Saxlanılıb (dəyişmək üçün yaz)") : ""} /></div>}
            </div>
            <p className="text-xs text-muted-foreground">{t("Bu açar yalnız əməliyyatlar üçün ayrıca, mümkün qədər məhdud səlahiyyətli açar olsun.")}</p>
          </CardContent>
        </Card>
        <div>
          <h2 className="font-medium">{t("2. Hansı əməliyyatlar olsun?")}</h2>
          <p className="text-sm text-muted-foreground">{t("Hər biri üçün ünvan, parametrlər və təsdiq mətni göstərilir. Ən çox 10 əməliyyat.")}</p>
        </div>
        {items.map((f, i) => <ActionCard key={i} index={i} f={f} identityReady={data.identityReady === true} set={(n) => setItems((cur) => cur.map((x, j) => (j === i ? n : x)))} remove={() => setItems((cur) => cur.filter((_, j) => j !== i))} />)}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1"><Label htmlFor="ac-preset">{t("Əməliyyat əlavə et")}</Label>
            <select id="ac-preset" value={preset} onChange={(e) => setPreset(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">{presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
          <Button type="button" variant="outline" disabled={items.length >= 10} onClick={() => setItems((cur) => [...cur, presets.find((p) => p.id === preset)!.make()])}>{t("Əlavə et")}</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={saving || items.length === 0} className="self-start">{saving ? t("Yoxlanılır…") : t("Yadda saxla")}</Button>
      </form>

      {revealed && <KeyReveal apiKey={revealed} title={t("İmza açarı (sorğunun həqiqiliyini yoxlamaq üçün)")} onDone={() => setRevealed(null)} />}

      {saved && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Yoxla")}</CardTitle><CardDescription>{t("Əvvəlcə sorğunun necə görünəcəyinə bax (heç nə göndərilmir). Sonra istəsən real sınaq sorğusu göndər: o X-Chatbot-Test: 1 başlığı ilə gedir, API-n bunu görüb əməliyyatı real icra etməməlidir.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <select aria-label={t("Əməliyyat")} value={testKey} onChange={(e) => { setTestKey(e.target.value); setTestVals({}); setTestOut(null); }} className={select}>{data.items.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</select>
              {testSpec?.requireIdentity && <Input aria-label={t("İstifadəçi ID-si")} value={testUser} onChange={(e) => setTestUser(e.target.value)} placeholder={t("İstifadəçi ID-si")} className="max-w-xs" />}
            </div>
            {testSpec && <div className="grid gap-2 sm:grid-cols-2">{testSpec.params.map((p) => <Input key={p.name} aria-label={p.name} placeholder={`${p.name}${p.required ? " *" : ""}`} value={testVals[p.name] ?? ""} onChange={(e) => setTestVals((v) => ({ ...v, [p.name]: e.target.value }))} />)}</div>}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" disabled={!testSpec} onClick={() => runTest(false)}>{t("Sorğuya bax")}</Button>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={realOk} onChange={(e) => setRealOk(e.target.checked)} />{t("Real sorğunun sənin API-na göndəriləcəyini başa düşürəm")}</label>
              <Button type="button" variant="outline" disabled={!testSpec || !realOk} onClick={() => runTest(true)}>{t("Real sınaq göndər")}</Button>
            </div>
            {testOut && <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{typeof testOut === "string" ? testOut : JSON.stringify(testOut.preview ? testOut.preview : { status: testOut.status, httpStatus: testOut.httpStatus, message: testOut.message ? t(testOut.message) : undefined, ms: testOut.ms }, null, 2)}</pre>}
          </CardContent>
        </Card>
      )}

      {data.configured && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("3. Sorğunun həqiqiliyini yoxla")}</CardTitle>
            <CardDescription>{data.signing.configured ? t("İmza açarı yaradılıb: {d}. Yeni açar yaratsan köhnəsi ilə imzalanan yoxlama uğursuz olacaq.", { d: data.signing.createdAt ? short(data.signing.createdAt) : "" }) : t("Hələ yaradılmayıb.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t("Hər sorğu X-Chatbot-Signature başlığı ilə gəlir. API-nda onu yoxla: yalnız bizdən gələn sorğuları qəbul et. X-Chatbot-Idempotency-Key təkrar gələrsə əməliyyatı bir də icra etmə.")}</p>
            <div className="flex gap-1 text-sm" role="tablist">
              {(["node", "py"] as const).map((k) => <button key={k} role="tab" type="button" aria-selected={lang === k} onClick={() => setLang(k)} className={`rounded px-3 py-1.5 ${lang === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{k === "node" ? "Node.js" : "Python"}</button>)}
            </div>
            <Code code={lang === "node" ? VERIFY_NODE : VERIFY_PY} />
            {!revealed && <DangerAction label={t("Yeni imza açarı yarat")} confirm={{ kind: "text", expected: t("yarat"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("yarat") }) }} warning={t("Köhnə açar dərhal etibarsız olur, API-ndakı yoxlamanı yeni açarla yeniləməlisən.")} onConfirm={rotate} />}
          </CardContent>
        </Card>
      )}

      {data.configured && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle className="text-base">{t("Jurnal")}</CardTitle><CardDescription>{t("Son əməliyyatlar: kim, nə vaxt, nəticə. E-poçtlar maskalanır, 90 gün saxlanır.")}</CardDescription></div>
              <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={loadLog}>{t("Yenilə")}</Button>
                <Button type="button" size="sm" variant="outline" disabled={!log?.length} onClick={() => { clearActionLog().then(() => setLog([])).catch((e: Error) => toast.error(e.message)); }}>{t("Təmizlə")}</Button></div>
            </div>
          </CardHeader>
          <CardContent>
            {!log ? <p className="text-sm text-muted-foreground">…</p> : log.length === 0 ? <p className="text-sm text-muted-foreground">{t("Hələ əməliyyat olmayıb.")}</p> : (
              <div className="overflow-x-auto"><table className="w-full text-left text-xs">
                <thead className="text-muted-foreground"><tr><th className="py-1 pr-3">{t("Vaxt")}</th><th className="pr-3">{t("Əməliyyat")}</th><th className="pr-3">{t("İstifadəçi")}</th><th className="pr-3">{t("Nəticə")}</th><th>{t("Dəyərlər")}</th></tr></thead>
                <tbody>{log.map((e, i) => (
                  <tr key={e.id ?? i} className="border-t border-border align-top">
                    <td className="whitespace-nowrap py-1 pr-3">{short(e.at)}</td><td className="pr-3">{e.title}</td><td className="pr-3">{e.subject ?? "-"}</td>
                    <td className="whitespace-nowrap pr-3">{STATUS[e.status] ?? e.status}{e.httpStatus ? ` (${e.httpStatus})` : ""}</td>
                    <td className="break-all text-muted-foreground">{Object.entries(e.params ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")}</td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      )}

      {data.configured && (
        <DangerAction label={t("Əməliyyatları söndür")} confirm={{ kind: "text", expected: t("sil"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("sil") }) }} warning={t("Bütün əməliyyatlar, API açarı və imza açarı silinəcək. Çat artıq heç bir əməliyyat təklif etməyəcək.")} onConfirm={async () => { await deleteActions(); apply(await getActions()); setLog([]); toast.success(t("Əməliyyatlar söndürüldü.")); }} />
      )}
    </div>
  );
}

export default function ActionsRoute() {
  return <RequireTenant><ActionsPage /></RequireTenant>;
}

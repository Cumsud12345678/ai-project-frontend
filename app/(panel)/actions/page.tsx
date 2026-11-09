"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FlaskConical, KeyRound, Pencil, Plug, Plus, ShieldCheck, Trash2, Zap } from "lucide-react";
import { clearActionLog, deleteActions, getActionLog, getActions, getActionStats, newSigningSecret, saveActions, testAction, type ActionItem, type ActionLogEntry, type ActionStats, type ActionParam, type ActionsData, type ActionTestResult } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { DangerAction } from "@/components/danger-action";
import { IdentitySetup } from "@/components/identity-setup";
import { KeyReveal } from "@/components/key-reveal";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { Switch } from "@/components/ui/switch";
import { ConnectionModal, SetupSteps, connInput, type ConnValue } from "@/components/api-connection";
import { FilterPills, PageHeader } from "@/components/page-header";

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

/** Bir əməliyyatın forması (modalın içində) */
function ActionFields({ f, set, identityReady }: { f: Form; set: (a: Form) => void; identityReady: boolean }) {
  const { t } = useI18n();
  const up = (p: Partial<Form>) => set({ ...f, ...p });
  const setParam = (i: number, p: Partial<Form["params"][number]>) => up({ params: f.params.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor="af-title">{t("Ad (istifadəçiyə görünür)")}</Label><Input id="af-title" value={f.title} maxLength={60} onChange={(e) => up({ title: e.target.value })} required /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="af-key">{t("Texniki ad (latın, kiçik hərf)")}</Label><Input id="af-key" value={f.key} onChange={(e) => up({ key: e.target.value })} placeholder="cancel_order" pattern="[a-z][a-z0-9_]{1,30}" required /></div>
        </div>
        <div className="flex flex-col gap-1"><Label htmlFor="af-desc">{t("Təsvir: AI bu əməliyyatı nə vaxt təklif etsin?")}</Label><Input id="af-desc" value={f.description} maxLength={300} onChange={(e) => up({ description: e.target.value })} required /></div>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div className="flex flex-col gap-1"><Label htmlFor="af-m">{t("Metod")}</Label>
            <select id="af-m" value={f.method} onChange={(e) => up({ method: e.target.value as Form["method"] })} className={select}><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></div>
          <div className="flex flex-col gap-1"><Label htmlFor="af-path">{t("Sorğu ünvanı")}</Label><Input id="af-path" value={f.path} onChange={(e) => up({ path: e.target.value })} placeholder="/orders/{orderNo}/cancel" required /></div>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={f.requireIdentity === true} onChange={(e) => up({ requireIdentity: e.target.checked })} />{t("Yalnız daxil olmuş istifadəçi üçün (tövsiyə olunur)")}</label>
        {f.requireIdentity
          ? <p className="text-xs text-muted-foreground">{t("İstifadəçinin ID-si sorğuya (userId) saytın imzaladığı tokendən əlavə olunur. Ünvanda {userId} yaza bilərsən. AI onu dəyişə bilməz.")}{!identityReady && <> <b>{t("Təhlükəsizlik bölməsində gizli açar yarat.")}</b></>}</p>
          : <p className="text-xs text-destructive">{t("Diqqət: bu əməliyyat daxil olmamış ziyarətçilərə də açıqdır. Yalnız zərərsiz əməliyyatlar üçün (bilet, müraciət, rezerv) istifadə et; sifariş ləğvi kimi hesaba aid işlər üçün yuxarıdakı qutunu işarələ.")}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <div><h3 className="text-sm font-semibold">{t("Parametrlər: AI bunları istifadəçidən soruşur")}</h3></div>
        {f.params.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            {f.params.map((p, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 border-b border-border p-2.5 last:border-b-0 sm:grid-cols-[1fr_8rem_1.4fr_auto]">
                <Input aria-label={t("Ad")} placeholder={t("Ad (məs. orderNo)")} value={p.name} onChange={(e) => setParam(i, { name: e.target.value })} />
                <select aria-label={t("Növ")} value={p.type} onChange={(e) => setParam(i, { type: e.target.value as ActionParam["type"] })} className={select}>
                  <option value="string">{t("Mətn")}</option><option value="number">{t("Ədəd")}</option><option value="integer">{t("Tam ədəd")}</option><option value="boolean">{t("Bəli/xeyr")}</option><option value="enum">{t("Siyahıdan seçim")}</option></select>
                <Input aria-label={t("Təsvir")} placeholder={t("Təsvir (AI üçün)")} value={p.description} onChange={(e) => setParam(i, { description: e.target.value })} className="col-span-2 sm:col-span-1" />
                <Button type="button" size="sm" variant="ghost" aria-label={t("Sil")} onClick={() => up({ params: f.params.filter((_, j) => j !== i) })} className="self-center"><Trash2 size={14} aria-hidden /></Button>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={p.required === true} onChange={(e) => setParam(i, { required: e.target.checked })} />{t("Məcburi")}</label>
                {p.type === "enum" && <Input aria-label={t("Dəyərlər")} placeholder={t("Dəyərlər (vergüllə): gec, səhv, başqa")} value={p.enumText ?? ""} onChange={(e) => setParam(i, { enumText: e.target.value })} className="col-span-2 sm:col-span-3" />}
                {p.type === "string" && <Input aria-label={t("Maksimum uzunluq")} type="number" placeholder={t("Maks. uzunluq (200)")} value={p.maxLength ?? ""} onChange={(e) => setParam(i, { maxLength: e.target.value ? Number(e.target.value) : undefined })} className="col-span-2 sm:col-span-3" />}
                {(p.type === "number" || p.type === "integer") && <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-3"><Input aria-label="min" type="number" placeholder="min" value={p.min ?? ""} onChange={(e) => setParam(i, { min: e.target.value === "" ? undefined : Number(e.target.value) })} /><Input aria-label="max" type="number" placeholder="max" value={p.max ?? ""} onChange={(e) => setParam(i, { max: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>}
              </div>
            ))}
          </div>
        )}
        <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => up({ params: [...f.params, blankParam()] })} disabled={f.params.length >= 8}><Plus size={14} aria-hidden />{t("Parametr əlavə et")}</Button>
      </section>

      <section className="flex flex-col gap-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor="af-ct">{t("Təsdiq mətni (ixtiyari)")}</Label><Input id="af-ct" value={f.confirmText ?? ""} maxLength={200} onChange={(e) => up({ confirmText: e.target.value })} placeholder={t("Sifariş {orderNo} ləğv olunacaq")} /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="af-sm">{t("Uğur mesajı (ixtiyari)")}</Label><Input id="af-sm" value={f.successMessage ?? ""} maxLength={200} onChange={(e) => up({ successMessage: e.target.value })} placeholder={t("Sifariş {orderNo} ləğv edildi.")} /></div>
        </div>
        <p className="text-xs text-muted-foreground">{t("Təsdiq kartında bütün parametr dəyərləri həmişə göstərilir: mətn onları gizlədə bilməz.")}</p>
      </section>
    </div>
  );
}

type Tab = "items" | "security" | "log";

function ActionsPage() {
  const { t, short } = useI18n();
  const [data, setData] = useState<ActionsData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("items");
  const [picker, setPicker] = useState(false);
  const [edit, setEdit] = useState<{ f: Form; index: number | null } | null>(null);
  const [conn, setConn] = useState<{ pending: ActionItem[] | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [del, setDel] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [lang, setLang] = useState<"node" | "py">("node");
  const [log, setLog] = useState<ActionLogEntry[] | null>(null);
  const [stats, setStats] = useState<ActionStats | null>(null);
  const [test, setTest] = useState<ActionItem | null>(null);
  const [testVals, setTestVals] = useState<Record<string, string>>({});
  const [testUser, setTestUser] = useState("test-user");
  const [realOk, setRealOk] = useState(false);
  const [testOut, setTestOut] = useState<ActionTestResult | string | null>(null);

  const load = useCallback(() => getActions().then(setData).catch((e: Error) => setLoadError(e.message)), []);
  const loadLog = useCallback(() => { getActionLog().then((r) => setLog(r.entries)).catch(() => setLog([])); getActionStats().then(setStats).catch(() => setStats(null)); }, []);
  useEffect(() => { void load(); loadLog(); }, [load, loadLog]);

  const STATUS: Record<ActionLogEntry["status"], string> = { done: t("icra olundu"), failed: t("alınmadı"), unknown: t("bəlli deyil"), cancelled: t("ləğv edildi"), expired: t("vaxtı bitdi"), denied: t("rədd edildi"), test: t("sınaq") };
  const presets: { id: string; label: string; hint: string; make: () => Form }[] = [
    { id: "cancel", label: t("Sifarişi ləğv et"), hint: t("İstifadəçi öz sifarişini ləğv etmək istəyəndə"), make: () => toForm(blankAction({ key: "cancel_order", title: t("Sifarişi ləğv et"), description: t("İstifadəçi öz sifarişini ləğv etmək istəyəndə"), path: "/orders/{orderNo}/cancel", requireIdentity: true,
      params: [{ name: "orderNo", type: "string", description: t("Sifariş nömrəsi"), required: true, maxLength: 30 }], confirmText: t("Sifariş {orderNo} ləğv olunacaq"), successMessage: t("Sifariş {orderNo} ləğv edildi.") })) },
    { id: "ticket", label: t("Dəstək bileti yarat"), hint: t("İstifadəçi problem barədə rəsmi müraciət (bilet) açmaq istəyəndə"), make: () => toForm(blankAction({ key: "create_ticket", title: t("Dəstək bileti yarat"), description: t("İstifadəçi problem barədə rəsmi müraciət (bilet) açmaq istəyəndə"), path: "/tickets",
      params: [{ name: "subject", type: "string", description: t("Problemin qısa mövzusu"), required: true, maxLength: 100 }, { name: "message", type: "string", description: t("Problemin təsviri"), required: true, maxLength: 500 }], confirmText: t("Bilet açılacaq: {subject}"), successMessage: t("Biletiniz yaradıldı, tezliklə cavab veriləcək.") })) },
    { id: "book", label: t("Görüş / rezerv"), hint: t("İstifadəçi görüş, qəbul və ya rezerv etmək istəyəndə"), make: () => toForm(blankAction({ key: "book_appointment", title: t("Görüş rezerv et"), description: t("İstifadəçi görüş, qəbul və ya rezerv etmək istəyəndə"), path: "/appointments",
      params: [{ name: "date", type: "string", description: t("Tarix (YYYY-MM-DD)"), required: true, maxLength: 10 }, { name: "time", type: "string", description: t("Saat (HH:MM)"), required: true, maxLength: 5 }, { name: "phone", type: "string", description: t("Telefon nömrəsi"), required: true, maxLength: 20 }], confirmText: t("{date} {time} üçün rezerv ediləcək"), successMessage: t("Rezerviniz qeydə alındı.") })) },
    { id: "lead", label: t("Lead göndər (CRM)"), hint: t("İstifadəçi satış və ya təklif üçün əlaqə qoymaq istəyəndə"), make: () => toForm(blankAction({ key: "send_lead", title: t("Müraciət göndər"), description: t("İstifadəçi satış və ya təklif üçün əlaqə qoymaq istəyəndə"), path: "/leads",
      params: [{ name: "name", type: "string", description: t("Ad"), required: true, maxLength: 80 }, { name: "phone", type: "string", description: t("Telefon nömrəsi"), required: true, maxLength: 20 }], confirmText: t("{name} ({phone}) üçün müraciət göndəriləcək"), successMessage: t("Müraciətiniz göndərildi.") })) },
    { id: "custom", label: t("Digər (özün təyin et)"), hint: t("Boş formadan başla"), make: () => toForm(blankAction()) },
  ];

  const connOf = (d: ActionsData): ConnValue => ({ baseUrl: d.baseUrl ?? "", authType: d.auth?.type ?? "bearer", authName: d.auth?.name ?? "X-Api-Key", secret: "" });
  /** Hamısını saxlayır: bağlantı (dəyişməyibsə mövcud) + əməliyyatlar */
  async function persist(items: ActionItem[], c?: ConnValue): Promise<boolean> {
    if (!data) return false;
    setSaving(true); setErr("");
    try {
      const r = await saveActions({ ...connInput(c ?? connOf(data), ["header"]), items });
      const { signingSecret, ...view } = r;
      setData(view);
      if (signingSecret) setRevealed(signingSecret);
      toast.success(t("Yadda saxlanıldı."));
      return true;
    } catch (e) { setErr((e as Error).message); return false; }
    finally { setSaving(false); }
  }
  async function saveEdit() {
    if (!data || !edit) return;
    const item = toItem(edit.f);
    const items = edit.index === null ? [...data.items, item] : data.items.map((x, i) => (i === edit.index ? item : x));
    // API hələ qoşulmayıbsa: əvvəl bağlantı soruşulur, əməliyyat onunla birlikdə saxlanır
    if (!data.configured) { setConn({ pending: items }); setEdit(null); return; }
    if (await persist(items)) setEdit(null);
  }
  async function remove(i: number) {
    if (!data) return;
    if (data.items.length === 1) { await deleteActions(); await load(); setLog([]); toast.success(t("Əməliyyatlar söndürüldü.")); }
    else await persist(data.items.filter((_, j) => j !== i));
    setDel(null);
  }
  async function rotate() {
    try { setRevealed((await newSigningSecret()).signingSecret); await load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function runTest(send: boolean) {
    if (!test) return;
    setTestOut(null);
    try {
      const params = Object.fromEntries(Object.entries(testVals).filter(([k, v]) => v.trim() && test.params.some((p) => p.name === k)));
      setTestOut(await testAction({ key: test.key, params, send, ...(test.requireIdentity && { userId: testUser.trim() }) }));
      if (send) loadLog();
    } catch (e) { setTestOut((e as Error).message); }
  }

  if (!data) return loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : <FormSkeleton />;
  const needsIdentity = data.items.some((x) => x.requireIdentity);
  const newBtn = <Button onClick={() => { setErr(""); setPicker(true); }} disabled={data.items.length >= 10}><Plus size={16} aria-hidden />{t("Yeni əməliyyat")}</Button>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Əməliyyatlar")}
        description={t("Çat istifadəçinin istəyi ilə sənin saytında əməliyyat icra edə bilsin: sifarişi ləğv et, bilet yarat, görüş rezerv et, müraciət göndər. Hər əməliyyat yalnız istifadəçi kartı görüb təsdiq verəndən sonra icra olunur.")}
        actions={<>{data.configured && <Button variant="outline" onClick={() => { setErr(""); setConn({ pending: null }); }}><Plug size={16} aria-hidden />{t("API bağlantısı")}</Button>}{newBtn}</>} />

      <SetupSteps steps={[
        { title: t("Əməliyyatlar qoşulub"), done: data.configured && data.items.length > 0, action: { label: t("Əlavə et"), run: () => setPicker(true) } },
        { title: t("İmza açarı yaradılıb"), done: data.signing.configured, action: data.configured ? { label: t("Bax"), run: () => setTab("security") } : undefined },
        { title: t("İstifadəçi tokeni hazırdır"), done: data.identityReady === true || !needsIdentity, action: { label: t("Qur"), run: () => setTab("security") } },
      ]} />

      <FilterPills value={tab} onChange={setTab} label={t("Bölmələr")} items={[
        { value: "items", label: t("Əməliyyatlar"), count: data.items.length, icon: <Zap size={14} aria-hidden /> },
        { value: "security", label: t("Təhlükəsizlik"), icon: <ShieldCheck size={14} aria-hidden /> },
        ...(data.configured ? [{ value: "log" as const, label: t("Jurnal"), count: log?.length }] : []),
      ]} />

      {tab === "items" && (data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><Zap size={22} aria-hidden /></span>
          <h2 className="font-semibold">{t("Hələ əməliyyat yoxdur")}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t("Hazır nümunədən başla: sifarişi ləğv et, bilet yarat, görüş rezerv et. Sonra öz API-nin ünvanını yaz.")}</p>
          {newBtn}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>
              <th className="px-4 py-3 font-medium">{t("Ad")}</th><th className="px-4 py-3 font-medium">{t("Sorğu")}</th><th className="px-4 py-3 font-medium">{t("Kim üçün")}</th><th className="px-4 py-3 font-medium">{t("30 gündə")}</th><th className="px-4 py-3 font-medium">{t("Aktiv")}</th><th className="w-12 px-2" />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {data.items.map((a, i) => {
                const r = stats?.byKey[a.key];
                const other = r ? (r.failed ?? 0) + (r.cancelled ?? 0) + (r.unknown ?? 0) + (r.expired ?? 0) + (r.denied ?? 0) : 0;
                return (
                  <tr key={a.key} className="align-middle hover:bg-muted/40">
                    <td className="px-4 py-3"><button type="button" onClick={() => { setErr(""); setEdit({ f: toForm(a), index: i }); }} className="cursor-pointer text-left"><span className="block font-medium hover:underline">{a.title}</span><span className="font-mono text-xs text-muted-foreground">{a.key}</span></button></td>
                    <td className="px-4 py-3"><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{a.method}</span> <span className="font-mono text-xs">{a.path}</span></td>
                    <td className="px-4 py-3 text-xs">{a.requireIdentity ? t("Daxil olmuş istifadəçi") : <span className="text-amber">{t("Hamı")}</span>}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{r ? t("{done} icra · {other} yox", { done: r.done ?? 0, other }) : "—"}</td>
                    <td className="px-4 py-3"><Switch checked={a.enabled !== false} label={a.title} onChange={(v) => void persist(data.items.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} /></td>
                    <td className="px-2 py-3 text-right"><RowMenu items={[
                      { label: t("Redaktə et"), icon: Pencil, run: () => { setErr(""); setEdit({ f: toForm(a), index: i }); } },
                      { label: t("Sına"), icon: FlaskConical, run: () => { setTest(a); setTestVals({}); setTestOut(null); setRealOk(false); } },
                      { label: t("Sil"), icon: Trash2, danger: true, run: () => setDel(i) },
                    ]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {tab === "security" && (
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl bg-muted/50 p-5">
            <h2 className="mb-2 font-semibold">{t("Təhlükəsizlik necə işləyir")}</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              <li>{t("AI heç vaxt əməliyyatı özü icra etmir. O yalnız təklif yaradır; istifadəçi nə olacağını (bütün dəyərlərlə) kartda görür və “Təsdiq et” düyməsinə basır. Təsdiq birdəfəliklədir və 10 dəqiqədən sonra bitir.")}</li>
              <li>{t("Yalnız burada təyin etdiyin əməliyyatlar və parametrlər mümkündür. Hər parametr tip, uzunluq və icazəli dəyərlər üzrə yoxlanır, artıq sahələr atılır.")}</li>
              <li>{t("İstifadəçi ID-si yalnız saytın imzaladığı tokendən gəlir; AI və ya ziyarətçi başqasının adından əməliyyat edə bilməz. Təsdiqi də eyni istifadəçi verməlidir.")}</li>
              <li>{t("Sorğular imzalanır (HMAC), təkrar icra qarşısı üçün unikal açarla gedir və avtomatik təkrarlanmır. Cavab gəlməzsə nəticə “bəlli deyil” kimi bildirilir, uğur uydurulmur.")}</li>
              <li>{t("İstifadəçi başına saatda 5 icra, sayt üzrə gündə 500 icra limiti var. Hər addım aşağıdakı jurnala yazılır.")}</li>
            </ul>
          </section>
          {data.configured && (
            <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1"><h2 className="flex items-center gap-2 font-semibold"><KeyRound size={16} aria-hidden />{t("Sorğunun həqiqiliyini yoxla")}</h2>
                  <p className="text-sm text-muted-foreground">{data.signing.configured ? t("İmza açarı yaradılıb: {d}. Yeni açar yaratsan köhnəsi ilə imzalanan yoxlama uğursuz olacaq.", { d: data.signing.createdAt ? short(data.signing.createdAt) : "" }) : t("Hələ yaradılmayıb.")}</p></div>
              </div>
              <p className="text-sm text-muted-foreground">{t("Hər sorğu X-Chatbot-Signature başlığı ilə gəlir. API-nda onu yoxla: yalnız bizdən gələn sorğuları qəbul et. X-Chatbot-Idempotency-Key təkrar gələrsə əməliyyatı bir də icra etmə.")}</p>
              <FilterPills value={lang} onChange={setLang} label={t("Dil")} items={[{ value: "node", label: "Node.js" }, { value: "py", label: "Python" }]} />
              <Code code={lang === "node" ? VERIFY_NODE : VERIFY_PY} />
              {!revealed && <DangerAction label={t("Yeni imza açarı yarat")} confirm={{ kind: "text", expected: t("yarat"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("yarat") }) }} warning={t("Köhnə açar dərhal etibarsız olur, API-ndakı yoxlamanı yeni açarla yeniləməlisən.")} onConfirm={rotate} />}
            </section>
          )}
          <IdentitySetup onChanged={() => { void load(); }} />
          {data.configured && (
            <section className="flex flex-col gap-2 rounded-2xl border border-destructive/30 p-5">
              <h2 className="font-semibold text-destructive">{t("Təhlükəli zona")}</h2>
              <DangerAction label={t("Əməliyyatları söndür")} confirm={{ kind: "text", expected: t("sil"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("sil") }) }} warning={t("Bütün əməliyyatlar, API açarı və imza açarı silinəcək. Çat artıq heç bir əməliyyat təklif etməyəcək.")} onConfirm={async () => { await deleteActions(); await load(); setLog([]); setTab("items"); toast.success(t("Əməliyyatlar söndürüldü.")); }} />
            </section>
          )}
        </div>
      )}

      {tab === "log" && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 text-sm text-muted-foreground">{t("Son əməliyyatlar: kim, nə vaxt, nəticə. E-poçtlar maskalanır, 90 gün saxlanır.")}</p>
            <Button type="button" size="sm" variant="outline" onClick={loadLog}>{t("Yenilə")}</Button>
            <Button type="button" size="sm" variant="outline" disabled={!log?.length} onClick={() => { clearActionLog().then(() => setLog([])).catch((e: Error) => toast.error(e.message)); }}>{t("Təmizlə")}</Button>
          </div>
          {!log ? <p className="text-sm text-muted-foreground">…</p> : log.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("Hələ əməliyyat olmayıb.")}</p> : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full min-w-[36rem] text-left text-xs">
              <thead className="border-b border-border text-muted-foreground"><tr><th className="px-4 py-2.5 font-medium">{t("Vaxt")}</th><th className="px-4 font-medium">{t("Əməliyyat")}</th><th className="px-4 font-medium">{t("İstifadəçi")}</th><th className="px-4 font-medium">{t("Nəticə")}</th><th className="px-4 font-medium">{t("Dəyərlər")}</th></tr></thead>
              <tbody className="divide-y divide-border">{log.map((e, i) => (
                <tr key={e.id ?? i} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2">{short(e.at)}</td><td className="px-4 py-2">{e.title}</td><td className="px-4 py-2">{e.subject ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-2"><Badge className={e.status === "done" ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" : e.status === "test" ? "bg-muted text-muted-foreground" : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"}>{STATUS[e.status] ?? e.status}{e.httpStatus ? ` (${e.httpStatus})` : ""}</Badge></td>
                  <td className="break-all px-4 py-2 text-muted-foreground">{Object.entries(e.params ?? {}).map(([k, v]) => `${k}=${v}`).join(", ")}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </section>
      )}

      {/* Hazır nümunə seçimi */}
      <Modal open={picker} onClose={() => setPicker(false)} title={t("Yeni əməliyyat")} description={t("Hazır nümunədən başla, sonra öz API-nə uyğunlaşdır.")} size="lg">
        <div className="grid gap-2 sm:grid-cols-2">
          {presets.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPicker(false); setErr(""); setEdit({ f: p.make(), index: null }); }}
              className="flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-border p-4 text-left hover:border-foreground/40 hover:bg-muted/40">
              <span className="font-medium">{p.label}</span><span className="text-xs text-muted-foreground">{p.hint}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Əməliyyatın redaktəsi */}
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} busy={saving} size="lg" title={edit?.index === null ? t("Yeni əməliyyat") : edit?.f.title || t("Əməliyyat")}
        description={t("AI bu əməliyyatı yalnız istifadəçi açıq istəyəndə təklif edir; icra üçün istifadəçi ayrıca təsdiq verir.")}
        footer={<>{err && <p role="alert" className="mr-auto text-sm text-destructive">{err}</p>}<Button type="button" variant="outline" onClick={() => setEdit(null)} disabled={saving}>{t("Ləğv et")}</Button><Button type="submit" form="act-form" disabled={saving}>{saving ? t("Yoxlanılır…") : data.configured ? t("Saxla") : t("Davam et")}</Button></>}>
        {edit && <form id="act-form" onSubmit={(e) => { e.preventDefault(); void saveEdit(); }}><ActionFields f={edit.f} set={(f) => setEdit({ ...edit, f })} identityReady={data.identityReady === true} /></form>}
      </Modal>

      {/* API bağlantısı (ilk dəfə: əməliyyatla birlikdə saxlanır) */}
      <ConnectionModal open={Boolean(conn)} onClose={() => setConn(null)} initial={connOf(data)} hasSecret={Boolean(data.auth?.hasSecret)} saving={saving} error={err}
        types={[{ value: "bearer", label: "Bearer" }, { value: "header", label: "Header" }, { value: "none", label: t("Yoxdur") }]} named={["header"]}
        description={t("Əməliyyatları icra edən daxili API. Yalnız yazma sorğuları (POST, PUT, PATCH, DELETE) göndərilir; oxuma üçün “Müştəri məlumatı” bölməsindən istifadə et.")}
        hint={t("Bu açar yalnız əməliyyatlar üçün ayrıca, mümkün qədər məhdud səlahiyyətli açar olsun.")}
        saveLabel={conn?.pending ? t("Qoş və saxla") : undefined}
        onSave={async (c) => { if (await persist(conn?.pending ?? data.items, c)) setConn(null); }} />

      {/* Silmə təsdiqi */}
      <Modal open={del !== null} onClose={() => setDel(null)} size="sm" title={t("Əməliyyat silinsin?")}
        description={data.items.length === 1 ? t("Bu sonuncu əməliyyatdır: silinsə API bağlantısı və imza açarı da silinəcək.") : t("Çat artıq bu əməliyyatı təklif etməyəcək.")}
        footer={<><Button type="button" variant="outline" onClick={() => setDel(null)}>{t("Ləğv et")}</Button><Button type="button" variant="destructive" disabled={saving} onClick={() => del !== null && void remove(del)}>{t("Sil")}</Button></>}>
        <p className="text-sm font-medium">{del !== null ? data.items[del]?.title : ""}</p>
      </Modal>

      {/* Sınaq */}
      <Modal open={Boolean(test)} onClose={() => setTest(null)} size="lg" title={t("Sına: {name}", { name: test?.title ?? "" })}
        description={t("Əvvəlcə sorğunun necə görünəcəyinə bax (heç nə göndərilmir). Sonra istəsən real sınaq sorğusu göndər: o X-Chatbot-Test: 1 başlığı ilə gedir, API-n bunu görüb əməliyyatı real icra etməməlidir.")}
        footer={<><Button type="button" variant="outline" onClick={() => runTest(false)}>{t("Sorğuya bax")}</Button><Button type="button" disabled={!realOk} onClick={() => runTest(true)}>{t("Real sınaq göndər")}</Button></>}>
        {test && (
          <div className="flex flex-col gap-3">
            {test.requireIdentity && <div className="flex flex-col gap-1"><Label htmlFor="ts-user">{t("İstifadəçi ID-si")}</Label><Input id="ts-user" value={testUser} onChange={(e) => setTestUser(e.target.value)} className="max-w-xs" /></div>}
            {test.params.length > 0 && <div className="grid gap-2 sm:grid-cols-2">{test.params.map((p) => <div key={p.name} className="flex flex-col gap-1"><Label htmlFor={`ts-${p.name}`}>{p.name}{p.required ? " *" : ""}</Label><Input id={`ts-${p.name}`} value={testVals[p.name] ?? ""} onChange={(e) => setTestVals((v) => ({ ...v, [p.name]: e.target.value }))} /></div>)}</div>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={realOk} onChange={(e) => setRealOk(e.target.checked)} />{t("Real sorğunun sənin API-na göndəriləcəyini başa düşürəm")}</label>
            {testOut && <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-3 text-xs">{typeof testOut === "string" ? testOut : JSON.stringify(testOut.preview ? testOut.preview : { status: testOut.status, httpStatus: testOut.httpStatus, message: testOut.message ? t(testOut.message) : undefined, ms: testOut.ms }, null, 2)}</pre>}
          </div>
        )}
      </Modal>

      {revealed && <Modal open onClose={() => setRevealed(null)} title={t("İmza açarı")} size="md"><KeyReveal apiKey={revealed} title={t("İmza açarı (sorğunun həqiqiliyini yoxlamaq üçün)")} onDone={() => setRevealed(null)} /></Modal>}
    </div>
  );
}

export default function ActionsRoute() {
  return <RequireTenant><ActionsPage /></RequireTenant>;
}

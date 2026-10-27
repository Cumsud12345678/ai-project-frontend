"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { deletePrivateData, getPrivateData, newIdentitySecret, savePrivateData, testPrivateData, type FieldSpec, type PrivateData, type PrivateSource } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { DangerAction } from "@/components/danger-action";
import { KeyReveal } from "@/components/key-reveal";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

// ---- forma ↔ konfiqurasiya çevirmələri ----
type FieldRow = { label: string; path: string; type: "text" | "number" | "date" | "url"; divide: string; max: string };
type SrcForm = { key: string; title: string; description: string; path: string; userParam: string; itemsPath: string; idField: string; ownerField: string; fields: FieldRow[]; linesPath: string; linesTitle: string; linesQty: string };
const row = (label = "", path = "", type: FieldRow["type"] = "text"): FieldRow => ({ label, path, type, divide: "", max: "" });
const blank = (p: Partial<SrcForm> = {}): SrcForm => ({ key: "", title: "", description: "", path: "/users/{userId}/", userParam: "", itemsPath: "data", idField: "", ownerField: "", fields: [row()], linesPath: "", linesTitle: "", linesQty: "", ...p });

// Hazır şablonlar (Azərbaycan açarı: render zamanı tərcümə olunur)
const PRESETS: { id: string; label: string; make: () => SrcForm }[] = [
  { id: "orders", label: "Sifarişlər", make: () => blank({ key: "orders", title: "Sifarişlər", description: "istifadəçinin sifarişləri və çatdırılma statusu", path: "/users/{userId}/orders", idField: "id", fields: [row("Nömrə", "id"), row("Status", "status"), row("Tarix", "createdAt", "date"), row("Məbləğ", "total", "number"), row("İzləmə linki", "tracking", "url")] }) },
  { id: "payments", label: "Ödənişlər", make: () => blank({ key: "payments", title: "Ödənişlər", description: "istifadəçinin ödəniş tarixçəsi", path: "/users/{userId}/payments", idField: "id", fields: [row("Nömrə", "id"), row("Məbləğ", "amount", "number"), row("Üsul", "method"), row("Status", "status"), row("Tarix", "date", "date")] }) },
  { id: "complaints", label: "Şikayətlər", make: () => blank({ key: "complaints", title: "Şikayətlər", description: "istifadəçinin göndərdiyi şikayətlər və onların statusu", path: "/users/{userId}/complaints", idField: "id", fields: [row("Nömrə", "id"), row("Mövzu", "subject"), row("Mətn", "message"), row("Status", "status"), row("Tarix", "createdAt", "date")] }) },
  { id: "requests", label: "Sorğular / müraciətlər", make: () => blank({ key: "requests", title: "Sorğular", description: "istifadəçinin göndərdiyi sorğular və müraciətlər", path: "/users/{userId}/requests", idField: "id", fields: [row("Nömrə", "id"), row("Mövzu", "title"), row("Status", "status"), row("Tarix", "createdAt", "date")] }) },
  { id: "subscriptions", label: "Abunələr", make: () => blank({ key: "subscriptions", title: "Abunələr", description: "istifadəçinin abunəliyi, planı və bitmə tarixi", path: "/users/{userId}/subscriptions", fields: [row("Plan", "plan"), row("Status", "status"), row("Bitmə tarixi", "expiresAt", "date")] }) },
  { id: "custom", label: "Digər (özün təyin et)", make: () => blank() },
];

const specOf = (f: FieldSpec): { path: string; type: FieldRow["type"]; divide: string; max: string } =>
  typeof f === "string" ? { path: f, type: "text", divide: "", max: "" } : { path: f.path ?? f.template ?? "", type: f.type ?? "text", divide: f.divide ? String(f.divide) : "", max: f.max ? String(f.max) : "" };
const toForm = (s: PrivateSource): SrcForm => ({
  key: s.key, title: s.title, description: s.description, path: s.path, userParam: s.userParam ?? "", itemsPath: s.itemsPath, idField: s.idField ?? "", ownerField: s.ownerField ?? "",
  fields: Object.entries(s.fields).map(([label, f]) => ({ label, ...specOf(f) })),
  linesPath: s.lines?.path ?? "", linesTitle: s.lines?.title ?? "", linesQty: s.lines?.qty ?? "",
});
function toSource(f: SrcForm): PrivateSource {
  const fields: Record<string, FieldSpec> = {};
  for (const r of f.fields) {
    if (!r.label.trim() || !r.path.trim()) continue;
    fields[r.label.trim()] = r.type === "text" && !r.max ? r.path.trim() : { path: r.path.trim(), type: r.type, ...(r.type === "number" && Number(r.divide) > 0 && { divide: Number(r.divide) }), ...(r.type === "text" && Number(r.max) > 0 && { max: Number(r.max) }) };
  }
  return {
    key: f.key.trim(), title: f.title.trim(), description: f.description.trim(), path: f.path.trim(), itemsPath: f.itemsPath.trim(), fields,
    ...(f.userParam.trim() && { userParam: f.userParam.trim() }), ...(f.idField.trim() && { idField: f.idField.trim() }), ...(f.ownerField.trim() && { ownerField: f.ownerField.trim() }),
    ...(f.linesPath.trim() && f.linesTitle.trim() && { lines: { path: f.linesPath.trim(), title: f.linesTitle.trim(), ...(f.linesQty.trim() && { qty: f.linesQty.trim() }) } }),
  };
}

const NODE = `import crypto from "node:crypto";
const b64u = (b) => Buffer.from(b).toString("base64url");
export function carAdvisorToken(userId, secret = process.env.CAR_ADVISOR_SECRET) {
  const p = b64u(JSON.stringify({ sub: String(userId), exp: Math.floor(Date.now() / 1000) + 900 }));
  return \`v1.\${p}.\${crypto.createHmac("sha256", secret).update(\`v1.\${p}\`).digest("base64url")}\`;
}`;
const PHP = `function carAdvisorToken($userId, $secret) {
  $b64u = fn($s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
  $p = $b64u(json_encode(['sub' => (string)$userId, 'exp' => time() + 900]));
  return "v1.$p." . $b64u(hash_hmac('sha256', "v1.$p", $secret, true));
}`;
const PY = `import base64, hashlib, hmac, json, time
def car_advisor_token(user_id, secret):
    b64u = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    p = b64u(json.dumps({"sub": str(user_id), "exp": int(time.time()) + 900}).encode())
    return f"v1.{p}." + b64u(hmac.new(secret.encode(), f"v1.{p}".encode(), hashlib.sha256).digest())`;
const PAGE_JS = `<script>
  // Daxil olmuş istifadəçi üçün: tokeni SERVER yaradır (gizli açar brauzerə düşməməlidir)
  function caIdentify(token) {
    var go = function () { window.CarAdvisor && window.CarAdvisor.identify(token); };
    window.CarAdvisor ? go() : window.addEventListener("load", go);
  }
  caIdentify("TOKEN_SERVERDƏN"); // istifadəçi çıxanda: caIdentify(null)
  // Token bitəndə (15 dəq) yenisini al:
  window.addEventListener("caradvisor:identity-expired", function () {
    fetch("/api/car-advisor-token").then(function (r) { return r.text(); }).then(caIdentify);
  });
</script>`;

function Code({ code }: { code: string }) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed"><code>{code}</code></pre>
      <Button type="button" size="sm" variant="outline" className="absolute right-2 top-2" onClick={() => { navigator.clipboard?.writeText(code).then(() => toast.success(t("Kopyalandı")), () => toast.error(t("Kopyalanmadı. Açarı əl ilə seçib kopyala."))); }}>{t("Kopyala")}</Button>
    </div>
  );
}

function SourceCard({ f, set, remove, index }: { f: SrcForm; set: (s: SrcForm) => void; remove: () => void; index: number }) {
  const { t } = useI18n();
  const up = (p: Partial<SrcForm>) => set({ ...f, ...p });
  const setRow = (i: number, p: Partial<FieldRow>) => up({ fields: f.fields.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const id = (n: string) => `src${index}-${n}`;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle className="text-base">{f.title || t("Yeni məlumat növü")}</CardTitle><CardDescription>{t("AI bu növü aşağıdakı təsvirə görə seçir.")}</CardDescription></div>
          <Button type="button" size="sm" variant="outline" onClick={remove}>{t("Sil")}</Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor={id("title")}>{t("Ad (istifadəçiyə görünür)")}</Label><Input id={id("title")} value={f.title} onChange={(e) => up({ title: e.target.value })} required /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("key")}>{t("Texniki ad (latın, kiçik hərf)")}</Label><Input id={id("key")} value={f.key} onChange={(e) => up({ key: e.target.value })} placeholder="orders" pattern="[a-z][a-z0-9_]{1,30}" required /></div>
        </div>
        <div className="flex flex-col gap-1"><Label htmlFor={id("desc")}>{t("Təsvir: AI bu məlumatı nə vaxt gətirsin?")}</Label><Input id={id("desc")} value={f.description} onChange={(e) => up({ description: e.target.value })} required /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor={id("path")}>{t("Sorğu ünvanı")}</Label><Input id={id("path")} value={f.path} onChange={(e) => up({ path: e.target.value })} placeholder="/users/{userId}/orders" required /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("items")}>{t("Siyahının yolu cavabda")}</Label><Input id={id("items")} value={f.itemsPath} onChange={(e) => up({ itemsPath: e.target.value })} placeholder="data" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("up")}>{t("İstifadəçi ID-si sorğu parametri (ünvanda {userId} yoxdursa)")}</Label><Input id={id("up")} value={f.userParam} onChange={(e) => up({ userParam: e.target.value })} placeholder="userId" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("own")}>{t("Sahibi göstərən sahə (əlavə qoruma, ixtiyari)")}</Label><Input id={id("own")} value={f.ownerField} onChange={(e) => up({ ownerField: e.target.value })} placeholder="userId" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={id("idf")}>{t("Qeyd nömrəsi sahəsi (ixtiyari)")}</Label><Input id={id("idf")} value={f.idField} onChange={(e) => up({ idField: e.target.value })} placeholder="id" /></div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{t("Göstəriləcək sahələr")}</p>
          <div className="flex flex-col gap-2">
            {f.fields.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_7rem_6rem_auto]">
                <Input aria-label={t("Göstərilən ad")} placeholder={t("Göstərilən ad")} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
                <Input aria-label={t("Sənin API-ndəki ad")} placeholder={t("Sənin API-ndəki ad")} value={r.path} onChange={(e) => setRow(i, { path: e.target.value })} />
                <select aria-label={t("Növ")} value={r.type} onChange={(e) => setRow(i, { type: e.target.value as FieldRow["type"] })} className="h-10 rounded-md border border-border bg-card px-2 text-sm"><option value="text">{t("Mətn")}</option><option value="number">{t("Rəqəm")}</option><option value="date">{t("Tarix")}</option><option value="url">{t("Link")}</option></select>
                {r.type === "number" ? <Input aria-label={t("Sentlə gəlirsə bölünən")} type="number" placeholder="100" value={r.divide} onChange={(e) => setRow(i, { divide: e.target.value })} />
                  : r.type === "text" ? <Input aria-label={t("Maksimum uzunluq")} type="number" placeholder="200" value={r.max} onChange={(e) => setRow(i, { max: e.target.value })} /> : <span />}
                <Button type="button" size="sm" variant="outline" aria-label={t("Sil")} onClick={() => up({ fields: f.fields.filter((_, j) => j !== i) })} disabled={f.fields.length === 1}>×</Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => up({ fields: [...f.fields, row()] })} disabled={f.fields.length >= 20}>{t("Sahə əlavə et")}</Button>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t("Daxili siyahı (məs. sifarişdəki məhsullar), ixtiyari")}</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1"><Label htmlFor={id("lp")}>{t("Siyahı")}</Label><Input id={id("lp")} value={f.linesPath} onChange={(e) => up({ linesPath: e.target.value })} placeholder="items" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor={id("lt")}>{t("Məhsul adı")}</Label><Input id={id("lt")} value={f.linesTitle} onChange={(e) => up({ linesTitle: e.target.value })} placeholder="name" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor={id("lq")}>{t("Say")}</Label><Input id={id("lq")} value={f.linesQty} onChange={(e) => up({ linesQty: e.target.value })} placeholder="qty" /></div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function CustomerData() {
  const { t, short } = useI18n();
  const [data, setData] = useState<PrivateData | null>(null);
  const [error, setError] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [authType, setAuthType] = useState("header");
  const [authName, setAuthName] = useState("X-Api-Key");
  const [secret, setSecret] = useState("");
  const [sources, setSources] = useState<SrcForm[]>([]);
  const [preset, setPreset] = useState("orders");
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [lang, setLang] = useState<"node" | "php" | "py">("node");
  const [testKind, setTestKind] = useState("");
  const [testUser, setTestUser] = useState("");
  const [testOut, setTestOut] = useState("");

  const apply = useCallback((d: PrivateData) => {
    setData(d);
    setBaseUrl(d.baseUrl ?? ""); setAuthType(d.auth?.type ?? "header"); setAuthName(d.auth?.name ?? "X-Api-Key");
    setSources(d.sources.map(toForm)); setTestKind((k) => k || d.sources[0]?.key || "");
  }, []);
  useEffect(() => { getPrivateData().then(apply).catch((e: Error) => setError(e.message)); }, [apply]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const body = {
        baseUrl: baseUrl.trim(), ...(secret.trim() && { apiSecret: secret.trim() }),
        auth: authType === "none" ? { type: "none" } : { type: authType, ...(authType !== "bearer" && { name: authName.trim() }) },
        sources: sources.map(toSource),
      };
      apply(await savePrivateData(body)); setSecret("");
      toast.success(t("Yadda saxlanıldı."));
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }
  async function makeSecret() {
    try { setRevealed((await newIdentitySecret()).identitySecret); setData(await getPrivateData()); }
    catch (err) { toast.error((err as Error).message); }
  }
  async function runTest() {
    setTestOut("…");
    try { const r = await testPrivateData(testKind || data?.sources[0]?.key || "", testUser.trim()); setTestOut(r.ok ? (r.records?.length ? JSON.stringify(r.records, null, 2) : t("Bu istifadəçi üçün qeyd gəlmədi.")) : r.error ?? t("Xəta baş verdi")); }
    catch (err) { setTestOut((err as Error).message); }
  }

  if (!data) return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <FormSkeleton />;
  const codes = { node: NODE, php: PHP, py: PY };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Müştəri məlumatı")}</h1>
        <p className="text-sm text-muted-foreground">{t("Saytında hesabına daxil olmuş istifadəçi çatdan öz məlumatını (sifarişləri, ödənişləri, şikayətləri, sorğuları və s.) soruşa bilsin. Məlumat sorğu anında sənin API-ndən alınır və bizdə saxlanmır.")}</p>
      </header>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge className={data.configured ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>{t("API qoşulub")}</Badge>
        <Badge className={data.identity.configured ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>{t("Gizli açar yaradılıb")}</Badge>
        <Badge className={data.ready ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}>{data.ready ? t("Aktivdir: son addım saytda token verməkdir") : t("Saytda token ver")}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("Təhlükəsizlik necə işləyir")}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <p>{t("İstifadəçinin kim olduğunu yalnız sənin saytın deyir: serverin gizli açarla imzalanmış qısaömürlü token yaradır (15 dəqiqə).")}</p>
          <p>{t("AI istifadəçi ID-sini özü seçə bilmir. Ziyarətçi çatda başqasının nömrəsini və ya ID-sini yazsa belə, yalnız tokendəki istifadəçinin məlumatı gətirilir.")}</p>
          <p>{t("Kart nömrələri maskalanır, cavab mətni sorğu tarixçəsində saxlanmır, hər istifadəçi üçün sorğular məhdudlaşdırılıb.")}</p>
          <p>{t("Gizli açar və API açarın şifrələnmiş saxlanır, yalnız bir dəfə göstərilir.")}</p>
        </CardContent>
      </Card>

      <form onSubmit={save} className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("1. Sənin API-n")}</CardTitle><CardDescription>{t("İstifadəçinin məlumatını (sifariş, ödəniş, şikayət və s.) ID-si ilə qaytaran daxili API. Yalnız oxuma (GET) sorğuları göndərilir.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1"><Label htmlFor="pd-base">{t("API ünvanı (https)")}</Label><Input id="pd-base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.saytin.az" required /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1"><Label htmlFor="pd-at">{t("Autentifikasiya")}</Label>
                <select id="pd-at" value={authType} onChange={(e) => setAuthType(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm"><option value="header">Header</option><option value="bearer">Bearer</option><option value="query">Query</option><option value="none">{t("Yoxdur")}</option></select></div>
              {(authType === "header" || authType === "query") && <div className="flex flex-col gap-1"><Label htmlFor="pd-an">{t("Ad")}</Label><Input id="pd-an" value={authName} onChange={(e) => setAuthName(e.target.value)} /></div>}
              {authType !== "none" && <div className="flex flex-col gap-1"><Label htmlFor="pd-sec">{t("API açarı")}</Label><Input id="pd-sec" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={data.auth?.hasSecret ? t("Saxlanıb, dəyişmək üçün yeni yaz") : ""} /></div>}
            </div>
          </CardContent>
        </Card>
        <div>
          <h2 className="font-medium">{t("2. Hansı məlumatları göstərək?")}</h2>
          <p className="text-sm text-muted-foreground">{t("İstənilən növ əlavə et: sifarişlər, ödənişlər, şikayətlər, sorğular, abunələr və ya özünkü. Hər biri üçün sənin API-ndəki ünvan və sahələr göstərilir.")}</p>
        </div>
        {sources.map((f, i) => <SourceCard key={i} index={i} f={f} set={(n) => setSources((cur) => cur.map((x, j) => (j === i ? n : x)))} remove={() => setSources((cur) => cur.filter((_, j) => j !== i))} />)}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1"><Label htmlFor="preset">{t("Növ əlavə et")}</Label>
            <select id="preset" value={preset} onChange={(e) => setPreset(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">{PRESETS.map((p) => <option key={p.id} value={p.id}>{t(p.label)}</option>)}</select></div>
          <Button type="button" variant="outline" disabled={sources.length >= 10} onClick={() => setSources((cur) => [...cur, PRESETS.find((p) => p.id === preset)!.make()])}>{t("Əlavə et")}</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button disabled={saving || sources.length === 0} className="self-start">{saving ? t("Yoxlanılır…") : t("Yadda saxla")}</Button>
      </form>

      {data.configured && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("Yoxla")}</CardTitle><CardDescription>{t("Saytındakı real istifadəçi ID-si ilə API-nin düzgün oxunduğunu yoxla.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <select aria-label={t("Növ")} value={testKind} onChange={(e) => setTestKind(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">{data.sources.map((s) => <option key={s.key} value={s.key}>{s.title}</option>)}</select>
              <Input aria-label={t("İstifadəçi ID-si")} value={testUser} onChange={(e) => setTestUser(e.target.value)} placeholder={t("İstifadəçi ID-si")} className="max-w-xs" />
              <Button type="button" variant="outline" disabled={!testUser.trim()} onClick={runTest}>{t("Yoxla")}</Button>
            </div>
            {testOut && <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{testOut}</pre>}
          </CardContent>
        </Card>
      )}

      {data.configured && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("3. Gizli açar (token imzalamaq üçün)")}</CardTitle>
            <CardDescription>{data.identity.configured ? t("Yaradılıb: {d}. Yeni açar yaratsan köhnəsi dərhal işləməyi dayandırır.", { d: data.identity.createdAt ? short(data.identity.createdAt) : "" }) : t("Hələ yaradılmayıb.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {revealed && <KeyReveal apiKey={revealed} title={t("Yeni gizli açar")} onDone={() => setRevealed(null)} />}
            {!revealed && (data.identity.configured
              ? <DangerAction label="Yeni açar yarat" confirm={{ kind: "text", expected: t("yarat"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("yarat") }) }} warning={t("Köhnə açar dərhal etibarsız olur, saytındakı token kodunu yeni açarla yeniləməsən istifadəçilər öz məlumatlarını görə bilməyəcək.")} onConfirm={makeSecret} />
              : <Button type="button" className="self-start" onClick={makeSecret}>{t("Gizli açar yarat")}</Button>)}
          </CardContent>
        </Card>
      )}

      {data.identity.configured && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("4. Saytında token ver")}</CardTitle><CardDescription>{t("Server tərəfdə (istifadəçi daxil olanda) token yarat. Gizli açarı heç vaxt brauzerə vermə.")}</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-1 text-sm" role="tablist">
              {(["node", "php", "py"] as const).map((k) => <button key={k} role="tab" type="button" aria-selected={lang === k} onClick={() => setLang(k)} className={`rounded px-3 py-1.5 ${lang === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{k === "node" ? "Node.js" : k === "php" ? "PHP" : "Python"}</button>)}
            </div>
            <Code code={codes[lang]} />
            <p className="text-sm text-muted-foreground">{t("Səhifədə vidjet skriptindən sonra tokeni vidjetə ver. İstifadəçi çıxanda null göndər: söhbət və şəxsi cavablar brauzerdən silinir.")}</p>
            <Code code={PAGE_JS} />
          </CardContent>
        </Card>
      )}

      {data.configured && (
        <DangerAction label="Müştəri məlumatını söndür" confirm={{ kind: "text", expected: t("sil"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("sil") }) }} warning={t("API ayarları və gizli açar silinəcək, çat şəxsi məlumatı göstərməyəcək.")} onConfirm={async () => { await deletePrivateData(); apply({ configured: false, sources: [], identity: { configured: false } }); toast.success(t("Söndürüldü.")); }} />
      )}
    </div>
  );
}

export default function CustomerDataPage() {
  return <RequireTenant><CustomerData /></RequireTenant>;
}

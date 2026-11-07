"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Database, FlaskConical, Pencil, Plug, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { deletePrivateData, getPrivateData, savePrivateData, testPrivateData, type FieldSpec, type PrivateData, type PrivateSource } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { DangerAction } from "@/components/danger-action";
import { IdentitySetup } from "@/components/identity-setup";
import { RequireTenant } from "@/components/session";
import { FormSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { ConnectionModal, SetupSteps, connInput, type ConnValue } from "@/components/api-connection";
import { FilterPills, PageHeader } from "@/components/page-header";

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

const sel = "h-10 rounded-md border border-border bg-card px-2 text-sm";

/** Bir məlumat növünün forması (modalın içində) */
function SourceFields({ f, set }: { f: SrcForm; set: (s: SrcForm) => void }) {
  const { t } = useI18n();
  const up = (p: Partial<SrcForm>) => set({ ...f, ...p });
  const setRow = (i: number, p: Partial<FieldRow>) => up({ fields: f.fields.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor="sf-title">{t("Ad (istifadəçiyə görünür)")}</Label><Input id="sf-title" value={f.title} onChange={(e) => up({ title: e.target.value })} required /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="sf-key">{t("Texniki ad (latın, kiçik hərf)")}</Label><Input id="sf-key" value={f.key} onChange={(e) => up({ key: e.target.value })} placeholder="orders" pattern="[a-z][a-z0-9_]{1,30}" required /></div>
        </div>
        <div className="flex flex-col gap-1"><Label htmlFor="sf-desc">{t("Təsvir: AI bu məlumatı nə vaxt gətirsin?")}</Label><Input id="sf-desc" value={f.description} onChange={(e) => up({ description: e.target.value })} required /></div>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{t("Sənin API-ndən necə oxunur")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1"><Label htmlFor="sf-path">{t("Sorğu ünvanı")}</Label><Input id="sf-path" value={f.path} onChange={(e) => up({ path: e.target.value })} placeholder="/users/{userId}/orders" required /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="sf-items">{t("Siyahının yolu cavabda")}</Label><Input id="sf-items" value={f.itemsPath} onChange={(e) => up({ itemsPath: e.target.value })} placeholder="data" /></div>
        </div>
        <details className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t("Əlavə ayarlar (ixtiyari)")}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1"><Label htmlFor="sf-up">{t("İstifadəçi ID-si sorğu parametri (ünvanda {userId} yoxdursa)")}</Label><Input id="sf-up" value={f.userParam} onChange={(e) => up({ userParam: e.target.value })} placeholder="userId" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="sf-own">{t("Sahibi göstərən sahə (əlavə qoruma, ixtiyari)")}</Label><Input id="sf-own" value={f.ownerField} onChange={(e) => up({ ownerField: e.target.value })} placeholder="userId" /></div>
            <div className="flex flex-col gap-1"><Label htmlFor="sf-idf">{t("Qeyd nömrəsi sahəsi (ixtiyari)")}</Label><Input id="sf-idf" value={f.idField} onChange={(e) => up({ idField: e.target.value })} placeholder="id" /></div>
          </div>
        </details>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("Göstəriləcək sahələr")}</h3>
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="hidden grid-cols-[1fr_1fr_7rem_6rem_2.5rem] gap-2 border-b border-border bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground sm:grid"><span>{t("Göstərilən ad")}</span><span>{t("Sənin API-ndəki ad")}</span><span>{t("Növ")}</span><span>{t("Əlavə")}</span><span /></div>
          {f.fields.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 border-b border-border p-2.5 last:border-b-0 sm:grid-cols-[1fr_1fr_7rem_6rem_2.5rem]">
              <Input aria-label={t("Göstərilən ad")} placeholder={t("Göstərilən ad")} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
              <Input aria-label={t("Sənin API-ndəki ad")} placeholder={t("Sənin API-ndəki ad")} value={r.path} onChange={(e) => setRow(i, { path: e.target.value })} />
              <select aria-label={t("Növ")} value={r.type} onChange={(e) => setRow(i, { type: e.target.value as FieldRow["type"] })} className={sel}><option value="text">{t("Mətn")}</option><option value="number">{t("Rəqəm")}</option><option value="date">{t("Tarix")}</option><option value="url">{t("Link")}</option></select>
              {r.type === "number" ? <Input aria-label={t("Sentlə gəlirsə bölünən")} title={t("Sentlə gəlirsə bölünən")} type="number" placeholder="100" value={r.divide} onChange={(e) => setRow(i, { divide: e.target.value })} />
                : r.type === "text" ? <Input aria-label={t("Maksimum uzunluq")} title={t("Maksimum uzunluq")} type="number" placeholder="200" value={r.max} onChange={(e) => setRow(i, { max: e.target.value })} /> : <span />}
              <Button type="button" size="sm" variant="ghost" aria-label={t("Sil")} onClick={() => up({ fields: f.fields.filter((_, j) => j !== i) })} disabled={f.fields.length === 1} className="self-center"><Trash2 size={14} aria-hidden /></Button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" variant="outline" className="self-start" onClick={() => up({ fields: [...f.fields, row()] })} disabled={f.fields.length >= 20}><Plus size={14} aria-hidden />{t("Sahə əlavə et")}</Button>
      </section>
      <details className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted-foreground">{t("Daxili siyahı (məs. sifarişdəki məhsullar), ixtiyari")}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1"><Label htmlFor="sf-lp">{t("Siyahı")}</Label><Input id="sf-lp" value={f.linesPath} onChange={(e) => up({ linesPath: e.target.value })} placeholder="items" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="sf-lt">{t("Məhsul adı")}</Label><Input id="sf-lt" value={f.linesTitle} onChange={(e) => up({ linesTitle: e.target.value })} placeholder="name" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor="sf-lq">{t("Say")}</Label><Input id="sf-lq" value={f.linesQty} onChange={(e) => up({ linesQty: e.target.value })} placeholder="qty" /></div>
        </div>
      </details>
    </div>
  );
}

type Tab = "sources" | "security";

function CustomerData() {
  const { t } = useI18n();
  const [data, setData] = useState<PrivateData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("sources");
  const [picker, setPicker] = useState(false);
  const [edit, setEdit] = useState<{ f: SrcForm; index: number | null } | null>(null);
  const [conn, setConn] = useState<{ pending: PrivateSource[] | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [del, setDel] = useState<number | null>(null);
  const [test, setTest] = useState<PrivateSource | null>(null);
  const [testUser, setTestUser] = useState("");
  const [testOut, setTestOut] = useState("");

  const load = useCallback(() => getPrivateData().then(setData).catch((e: Error) => setLoadError(e.message)), []);
  useEffect(() => { void load(); }, [load]);

  const connOf = (d: PrivateData): ConnValue => ({ baseUrl: d.baseUrl ?? "", authType: d.auth?.type ?? "header", authName: d.auth?.name ?? "X-Api-Key", secret: "" });
  async function persist(sources: PrivateSource[], c?: ConnValue): Promise<boolean> {
    if (!data) return false;
    setSaving(true); setErr("");
    try { setData(await savePrivateData({ ...connInput(c ?? connOf(data), ["header", "query"]), sources })); toast.success(t("Yadda saxlanıldı.")); return true; }
    catch (e) { setErr((e as Error).message); return false; }
    finally { setSaving(false); }
  }
  async function saveEdit() {
    if (!data || !edit) return;
    const src = toSource(edit.f);
    const sources = edit.index === null ? [...data.sources, src] : data.sources.map((x, i) => (i === edit.index ? src : x));
    if (!data.configured) { setConn({ pending: sources }); setEdit(null); return; }
    if (await persist(sources)) setEdit(null);
  }
  async function remove(i: number) {
    if (!data) return;
    if (data.sources.length === 1) { await deletePrivateData(); await load(); toast.success(t("Söndürüldü.")); }
    else await persist(data.sources.filter((_, j) => j !== i));
    setDel(null);
  }
  async function runTest() {
    if (!test) return;
    setTestOut("…");
    try { const r = await testPrivateData(test.key, testUser.trim()); setTestOut(r.ok ? (r.records?.length ? JSON.stringify(r.records, null, 2) : t("Bu istifadəçi üçün qeyd gəlmədi.")) : r.error ?? t("Xəta baş verdi")); }
    catch (e) { setTestOut((e as Error).message); }
  }

  if (!data) return loadError ? <p role="alert" className="text-sm text-destructive">{loadError}</p> : <FormSkeleton />;
  const newBtn = <Button onClick={() => { setErr(""); setPicker(true); }} disabled={data.sources.length >= 10}><Plus size={16} aria-hidden />{t("Yeni məlumat növü")}</Button>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Müştəri məlumatı")}
        description={t("Saytında hesabına daxil olmuş istifadəçi çatdan öz məlumatını (sifarişləri, ödənişləri, şikayətləri, sorğuları və s.) soruşa bilsin. Məlumat sorğu anında sənin API-ndən alınır və bizdə saxlanmır.")}
        actions={<>{data.configured && <Button variant="outline" onClick={() => { setErr(""); setConn({ pending: null }); }}><Plug size={16} aria-hidden />{t("API bağlantısı")}</Button>}{newBtn}</>} />

      <SetupSteps steps={[
        { title: t("API qoşulub"), done: data.configured, action: { label: t("Əlavə et"), run: () => setPicker(true) } },
        { title: t("Gizli açar yaradılıb"), done: data.identity.configured, action: { label: t("Yarat"), run: () => setTab("security") } },
        { title: t("Saytda token ver"), done: Boolean(data.ready), action: { label: t("Bax"), run: () => setTab("security") } },
      ]} />

      <FilterPills value={tab} onChange={setTab} label={t("Bölmələr")} items={[
        { value: "sources", label: t("Məlumat növləri"), count: data.sources.length, icon: <Database size={14} aria-hidden /> },
        { value: "security", label: t("Gizli açar və token"), icon: <ShieldCheck size={14} aria-hidden /> },
      ]} />

      {tab === "sources" && (data.sources.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><Database size={22} aria-hidden /></span>
          <h2 className="font-semibold">{t("Hələ məlumat növü yoxdur")}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{t("Sifarişlər, ödənişlər, şikayətlər kimi hazır nümunədən başla. Sonra öz API-nin ünvanını yaz.")}</p>
          {newBtn}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>
              <th className="px-4 py-3 font-medium">{t("Ad")}</th><th className="px-4 py-3 font-medium">{t("Sorğu")}</th><th className="px-4 py-3 font-medium">{t("Sahələr")}</th><th className="w-12 px-2" />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {data.sources.map((s, i) => (
                <tr key={s.key} className="align-middle hover:bg-muted/40">
                  <td className="px-4 py-3"><button type="button" onClick={() => { setErr(""); setEdit({ f: toForm(s), index: i }); }} className="cursor-pointer text-left"><span className="block font-medium hover:underline">{s.title}</span><span className="text-xs text-muted-foreground">{s.description}</span></button></td>
                  <td className="px-4 py-3"><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">GET</span> <span className="font-mono text-xs">{s.path}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{Object.keys(s.fields).slice(0, 4).join(", ")}{Object.keys(s.fields).length > 4 ? ` +${Object.keys(s.fields).length - 4}` : ""}</td>
                  <td className="px-2 py-3 text-right"><RowMenu items={[
                    { label: t("Redaktə et"), icon: Pencil, run: () => { setErr(""); setEdit({ f: toForm(s), index: i }); } },
                    { label: t("Yoxla"), icon: FlaskConical, run: () => { setTest(s); setTestOut(""); } },
                    { label: t("Sil"), icon: Trash2, danger: true, run: () => setDel(i) },
                  ]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {tab === "security" && (
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl bg-muted/50 p-5">
            <h2 className="mb-2 font-semibold">{t("Təhlükəsizlik necə işləyir")}</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              <li>{t("İstifadəçinin kim olduğunu yalnız sənin saytın deyir: serverin gizli açarla imzalanmış qısaömürlü token yaradır (15 dəqiqə).")}</li>
              <li>{t("AI istifadəçi ID-sini özü seçə bilmir. Ziyarətçi çatda başqasının nömrəsini və ya ID-sini yazsa belə, yalnız tokendəki istifadəçinin məlumatı gətirilir.")}</li>
              <li>{t("Kart nömrələri maskalanır, cavab mətni sorğu tarixçəsində saxlanmır, hər istifadəçi üçün sorğular məhdudlaşdırılıb.")}</li>
              <li>{t("Gizli açar və API açarın şifrələnmiş saxlanır, yalnız bir dəfə göstərilir.")}</li>
            </ul>
          </section>
          <IdentitySetup onChanged={() => { void load(); }} />
          {data.configured && (
            <section className="flex flex-col gap-2 rounded-2xl border border-destructive/30 p-5">
              <h2 className="font-semibold text-destructive">{t("Təhlükəli zona")}</h2>
              <DangerAction label={t("Müştəri məlumatını söndür")} confirm={{ kind: "text", expected: t("sil"), hint: t("Təsdiqləmək üçün “{word}” yaz", { word: t("sil") }) }} warning={t("API ayarları silinəcək, çat şəxsi məlumatı göstərməyəcək. Gizli açar yalnız daxil olmuş istifadəçi üçün əməliyyat yoxdursa silinir.")} onConfirm={async () => { await deletePrivateData(); await load(); setTab("sources"); toast.success(t("Söndürüldü.")); }} />
            </section>
          )}
        </div>
      )}

      <Modal open={picker} onClose={() => setPicker(false)} title={t("Yeni məlumat növü")} description={t("Hazır nümunədən başla, sonra sahələri öz API-nə uyğunlaşdır.")} size="lg">
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPicker(false); setErr(""); const f = p.make(); setEdit({ f: { ...f, title: t(f.title), description: t(f.description), fields: f.fields.map((r) => ({ ...r, label: t(r.label) })) }, index: null }); }}
              className="flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-border p-4 text-left hover:border-foreground/40 hover:bg-muted/40">
              <span className="font-medium">{t(p.label)}</span>{p.id !== "custom" && <span className="text-xs text-muted-foreground">{t(p.make().description)}</span>}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} busy={saving} size="lg" title={edit?.index === null ? t("Yeni məlumat növü") : edit?.f.title || t("Məlumat növü")}
        description={t("AI bu növü aşağıdakı təsvirə görə seçir.")}
        footer={<>{err && <p role="alert" className="mr-auto text-sm text-destructive">{err}</p>}<Button type="button" variant="outline" onClick={() => setEdit(null)} disabled={saving}>{t("Ləğv et")}</Button><Button type="submit" form="src-form" disabled={saving}>{saving ? t("Yoxlanılır…") : data.configured ? t("Saxla") : t("Davam et")}</Button></>}>
        {edit && <form id="src-form" onSubmit={(e) => { e.preventDefault(); void saveEdit(); }}><SourceFields f={edit.f} set={(f) => setEdit({ ...edit, f })} /></form>}
      </Modal>

      <ConnectionModal open={Boolean(conn)} onClose={() => setConn(null)} initial={connOf(data)} hasSecret={Boolean(data.auth?.hasSecret)} saving={saving} error={err}
        types={[{ value: "header", label: "Header" }, { value: "bearer", label: "Bearer" }, { value: "query", label: "Query" }, { value: "none", label: t("Yoxdur") }]} named={["header", "query"]}
        description={t("İstifadəçinin məlumatını (sifariş, ödəniş, şikayət və s.) ID-si ilə qaytaran daxili API. Yalnız oxuma (GET) sorğuları göndərilir.")}
        saveLabel={conn?.pending ? t("Qoş və saxla") : undefined}
        onSave={async (c) => { if (await persist(conn?.pending ?? data.sources, c)) setConn(null); }} />

      <Modal open={del !== null} onClose={() => setDel(null)} size="sm" title={t("Məlumat növü silinsin?")}
        description={data.sources.length === 1 ? t("Bu sonuncu növdür: silinsə API bağlantısı da silinəcək.") : t("Çat artıq bu məlumatı göstərməyəcək.")}
        footer={<><Button type="button" variant="outline" onClick={() => setDel(null)}>{t("Ləğv et")}</Button><Button type="button" variant="destructive" disabled={saving} onClick={() => del !== null && void remove(del)}>{t("Sil")}</Button></>}>
        <p className="text-sm font-medium">{del !== null ? data.sources[del]?.title : ""}</p>
      </Modal>

      <Modal open={Boolean(test)} onClose={() => setTest(null)} title={t("Yoxla: {name}", { name: test?.title ?? "" })} description={t("Saytındakı real istifadəçi ID-si ilə API-nin düzgün oxunduğunu yoxla.")} size="lg"
        footer={<Button type="submit" form="pd-test" disabled={!testUser.trim()}>{t("Yoxla")}</Button>}>
        <form id="pd-test" onSubmit={(e) => { e.preventDefault(); void runTest(); }} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1"><Label htmlFor="pd-user">{t("İstifadəçi ID-si")}</Label><Input id="pd-user" value={testUser} onChange={(e) => setTestUser(e.target.value)} className="max-w-xs" /></div>
          {testOut && <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-3 text-xs">{testOut}</pre>}
        </form>
      </Modal>
    </div>
  );
}

export default function CustomerDataPage() {
  return <RequireTenant><CustomerData /></RequireTenant>;
}

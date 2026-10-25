"use client";
import { useState } from "react";
import { FILTER_KINDS, addAttribute, addFilter, emptyDraft, type Edit, type FilterDraft } from "@/lib/config-edit";
import type { ConfigJson } from "@/lib/api";
import { parseConfigText } from "@/lib/config-file";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";

const selectCls = "h-9 rounded-md border border-border bg-card px-3 text-sm";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><Label htmlFor={id}>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

/** JSON-u əl ilə yazmadan filtr və əlavə sahə əlavə etmək üçün kiçik formalar. */
export function ConfigTools({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState<"" | "filter" | "attr">("");
  const [d, setD] = useState<FilterDraft>(emptyDraft);
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (p: Partial<FilterDraft>) => setD((x) => ({ ...x, ...p }));

  function apply(make: (c: ConfigJson) => Edit, done: string, reset: () => void) {
    const parsed = parseConfigText(text, t);
    if ("error" in parsed) return setMsg({ ok: false, text: t("Əvvəl JSON-dakı səhvi düzəlt, sonra əlavə et.") });
    const r = make(parsed.config);
    if ("error" in r) return setMsg({ ok: false, text: r.error });
    onChange(JSON.stringify(r.config, null, 2));
    setMsg({ ok: true, text: done });
    reset();
  }

  const range = d.kind === "range";
  const canVocab = d.kind === "string" || d.kind === "multi";
  const kindHint = t(FILTER_KINDS.find((k) => k.value === d.kind)?.hint ?? "");

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-2 text-sm font-medium">{t("JSON-u əl ilə yazma:")}</p>
        <Button type="button" size="sm" variant={open === "filter" ? "default" : "outline"} aria-expanded={open === "filter"} onClick={() => { setOpen(open === "filter" ? "" : "filter"); setMsg(null); }}>{t("+ Filtr əlavə et")}</Button>
        <Button type="button" size="sm" variant={open === "attr" ? "default" : "outline"} aria-expanded={open === "attr"} onClick={() => { setOpen(open === "attr" ? "" : "attr"); setMsg(null); }}>{t("+ Elanda yeni sahə göstər")}</Button>
      </div>

      {open === "filter" && (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); apply((c) => addFilter(c, d, t), t("“{name}” filtri JSON-a əlavə olundu. İndi “Yoxla” düyməsinə bas.", { name: d.name.trim() }), () => setD(emptyDraft)); }}>
          <Field id="f-kind" label={t("Filtrin növü")} hint={kindHint}>
            <select id="f-kind" className={selectCls} value={d.kind} onChange={(e) => set({ kind: e.target.value as FilterDraft["kind"], vocabulary: false })}>
              {FILTER_KINDS.map((k) => <option key={k.value} value={k.value}>{t(k.label)}</option>)}
            </select>
          </Field>
          <Field id="f-name" label={t("Filtrin adı (latın hərfi)")} hint={t("məs. color, fuelType, year")}>
            <Input id="f-name" value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={30} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="f-desc" label={t("Bu filtr nədir? (AI bunu oxuyur)")} hint={t("Qısa və aydın yaz, məs. “Motosikletin rəngi”")}>
              <Input id="f-desc" value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={200} />
            </Field>
          </div>
          {range ? (
            <>
              <Field id="f-min" label={t("“Ən az” parametri (API-də)")} hint={t("məs. year_from")}><Input id="f-min" value={d.minParam} onChange={(e) => set({ minParam: e.target.value })} /></Field>
              <Field id="f-max" label={t("“Ən çox” parametri (API-də)")} hint={t("məs. year_to")}><Input id="f-max" value={d.maxParam} onChange={(e) => set({ maxParam: e.target.value })} /></Field>
            </>
          ) : (
            <div className="sm:col-span-2"><Field id="f-param" label={t("API-də parametrin adı")} hint={t("Sənin API-n bu filtri hansı adla qəbul edir? məs. color_id, q")}><Input id="f-param" value={d.param} onChange={(e) => set({ param: e.target.value })} /></Field></div>
          )}
          {canVocab && (
            <div className="flex flex-col gap-3 sm:col-span-2">
              <SwitchRow checked={d.vocabulary} onChange={(v) => set({ vocabulary: v })} on={t("Açıq")} off={t("Bağlı")}
                title={t("API bu filtrdə ad yox, ID gözləyir (məs. “Qırmızı” əvəzinə 5)")}
                description={t("Seçsən, adı ID-yə sistem özü çevirəcək. Siyahını API-ndən oxuyacaq.")} />
              {d.vocabulary && (
                <div className="grid gap-3 rounded-md bg-muted p-3 sm:grid-cols-2">
                  <Field id="v-path" label={t("Siyahını qaytaran API ünvanı")} hint={t("məs. /api/colors")}><Input id="v-path" value={d.vocabPath} onChange={(e) => set({ vocabPath: e.target.value })} /></Field>
                  <Field id="v-items" label={t("Siyahı cavabın harasındadır?")} hint={t("Cavab birbaşa siyahıdırsa, boş burax. Yoxsa məs. data")}><Input id="v-items" value={d.vocabItems} onChange={(e) => set({ vocabItems: e.target.value })} /></Field>
                  <Field id="v-id" label={t("ID sahəsinin adı")} hint={t("məs. id və ya _id")}><Input id="v-id" value={d.vocabId} onChange={(e) => set({ vocabId: e.target.value })} /></Field>
                  <Field id="v-name" label={t("Ad sahəsinin adı")} hint={t("məs. name və ya label")}><Input id="v-name" value={d.vocabName} onChange={(e) => set({ vocabName: e.target.value })} /></Field>
                </div>
              )}
            </div>
          )}
          <div className="sm:col-span-2"><Button size="sm">{t("JSON-a əlavə et")}</Button></div>
        </form>
      )}

      {open === "attr" && (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); apply((c) => addAttribute(c, label, path, t), t("“{name}” sahəsi əlavə olundu.", { name: label.trim() }), () => { setLabel(""); setPath(""); }); }}>
          <Field id="a-label" label={t("Elanda necə görünsün?")} hint={t("məs. Yürüş, Mühərrik həcmi")}><Input id="a-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} /></Field>
          <Field id="a-path" label={t("API cavabında sahənin yolu")} hint={t("məs. mileage, engine.volume, city.name")}><Input id="a-path" value={path} onChange={(e) => setPath(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Button size="sm">{t("JSON-a əlavə et")}</Button></div>
        </form>
      )}

      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{msg.text}</p>}
    </div>
  );
}

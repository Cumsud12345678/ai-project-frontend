"use client";
// Köməkçi → Profil: ad, dil, ton, cavab uzunluğu, nəticə sayı və öz təlimatın. Sağda canlı önizləmə.
import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil } from "lucide-react";
import { saveProfile, type Profile } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
import { AssistantPreview } from "@/components/assistant-preview";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

const tile = "flex flex-col gap-2 rounded-2xl bg-muted/50 p-4";

function AssistantProfile() {
  const { t } = useI18n();
  const { tenant, refresh } = useSession();
  const p = tenant?.config.profile ?? {};
  const init: Profile = { agentName: p.agentName ?? "", language: p.language ?? "az", tone: p.tone ?? "dostcasına", answerLength: p.answerLength ?? "medium", maxResults: p.maxResults ?? 5, extraInstructions: p.extraInstructions ?? "" };
  const [base, setBase] = useState(init);
  const [d, setD] = useState(init);
  const [busy, setBusy] = useState(false);
  const [editName, setEditName] = useState(false);
  const set = (x: Profile) => setD((v) => ({ ...v, ...x }));
  const dirty = JSON.stringify(base) !== JSON.stringify(d);
  const listings = p.mode !== "support";

  const tones = [
    { v: "dostcasına", l: t("Dostcasına") }, { v: "rəsmi", l: t("Rəsmi") }, { v: "peşəkar", l: t("Peşəkar") },
    { v: "enerjili, həvəsli", l: t("Enerjili") }, { v: "sakit, səbirli", l: t("Sakit") },
  ];
  const custom = !tones.some((x) => x.v === d.tone);
  const examples = [t("Qiymətləri həmişə AZN ilə göstər."), t("Endirimli məhsulları vurğula."), t("Mürəkkəb şikayətdə operatora yönləndir."), t("Müştəriyə “siz” deyə müraciət et.")];

  async function save() {
    setBusy(true);
    try {
      const body: Profile = { ...d, agentName: d.agentName?.trim() ?? "", tone: d.tone?.trim() || "dostcasına", maxResults: Math.min(10, Math.max(1, Math.round(Number(d.maxResults) || 5))) };
      await saveProfile(body); await refresh();
      setBase(body); setD(body); setEditName(false);
      toast.success(t("Saxlandı. Növbəti cavab yeni ayarla gələcək."));
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold">{t("Profil")}</h1>
          <p className="text-sm text-muted-foreground">{t("Köməkçinin necə danışdığı: adı, dili, tonu və cavablarının uzunluğu.")}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={tile}>
            <span className="text-xs text-muted-foreground">{t("Ad")}</span>
            {editName ? (
              <Input autoFocus value={d.agentName} maxLength={40} onChange={(e) => set({ agentName: e.target.value })} placeholder={t("məs. Aysel")} aria-label={t("Köməkçinin adı")} />
            ) : (
              <button type="button" onClick={() => setEditName(true)} className="flex cursor-pointer items-center gap-2 text-left font-medium">
                <span className="flex-1">{d.agentName || <span className="text-muted-foreground">{t("Ad qoyulmayıb")}</span>}</span><Pencil size={15} aria-hidden className="text-muted-foreground" />
              </button>
            )}
            <p className="text-xs text-muted-foreground">{t("Köməkçi özünü bu adla təqdim edir. Boş qalsa, şirkətin köməkçisi kimi danışır.")} {t("Saytdakı çatda adın yanında “AI” nişanı görünür: müştəri AI ilə yazışdığını bilir, operator qoşulanda isə operatorun öz adı və şəkli göstərilir.")}</p>
          </div>
          <div className={tile}>
            <Label htmlFor="lang" className="text-xs font-normal text-muted-foreground">{t("Əsas dil")}</Label>
            <select id="lang" value={d.language} onChange={(e) => set({ language: e.target.value })} className="h-10 rounded-md border border-border bg-card px-3 text-sm font-medium">
              <option value="az">{t("Azərbaycan dili")}</option><option value="ru">{t("Rus dili")}</option><option value="en">{t("İngilis dili")}</option><option value="tr">{t("Türk dili")}</option>
            </select>
            <p className="text-xs text-muted-foreground">{t("Ziyarətçi başqa dildə yazsa, köməkçi onun dilində cavab verir.")}</p>
          </div>
        </div>

        <div className={tile}>
          <span className="text-xs text-muted-foreground">{t("Danışıq tonu")}</span>
          <div className="flex flex-wrap gap-2">
            {tones.map((x) => (
              <button key={x.v} type="button" aria-pressed={d.tone === x.v} onClick={() => set({ tone: x.v })}
                className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors", d.tone === x.v ? "border-foreground bg-foreground font-medium text-background" : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-muted/50")}>{d.tone === x.v && <Check size={14} strokeWidth={2.5} aria-hidden />}{x.l}</button>
            ))}
            <button type="button" aria-pressed={custom} onClick={() => { if (!custom) set({ tone: "" }); }}
              className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors", custom ? "border-foreground bg-foreground font-medium text-background" : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-muted/50")}>{custom && <Check size={14} strokeWidth={2.5} aria-hidden />}{t("Öz tonun")}</button>
          </div>
          {custom && <Input value={d.tone} maxLength={60} onChange={(e) => set({ tone: e.target.value })} placeholder={t("məs. zarafatcıl, amma hörmətli")} aria-label={t("Öz tonun")} />}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className={tile}>
            <span className="text-xs text-muted-foreground">{t("Cavab uzunluğu")}</span>
            <Segmented value={d.answerLength ?? "medium"} onChange={(v) => set({ answerLength: v })} label={t("Cavab uzunluğu")} options={[{ value: "short", label: t("Qısa") }, { value: "medium", label: t("Orta") }, { value: "long", label: t("Ətraflı") }]} />
            <p className="text-xs text-muted-foreground">{d.answerLength === "short" ? t("1-3 cümlə: tez oxunur, telefonda rahatdır.") : d.answerLength === "long" ? t("Addımlar və şərtlərlə ətraflı izah.") : t("Suala görə: sadə suala qısa, mürəkkəbə ətraflı.")}</p>
          </div>
          {listings && (
            <div className={tile}>
              <Label htmlFor="max" className="text-xs font-normal text-muted-foreground">{t("Bir cavabda ən çox nəticə")}</Label>
              <Input id="max" type="number" min={1} max={10} value={d.maxResults} onChange={(e) => set({ maxResults: Number(e.target.value) })} className="max-w-28" />
              <p className="text-xs text-muted-foreground">{t("Bir cavabda göstəriləcək elan, məhsul və ya xidmətlərin maksimum sayı.")}</p>
            </div>
          )}
        </div>

        <div className={tile}>
          <Label htmlFor="extra" className="text-xs font-normal text-muted-foreground">{t("Öz təlimatın")}</Label>
          <Textarea id="extra" rows={4} maxLength={1000} value={d.extraInstructions} onChange={(e) => set({ extraInstructions: e.target.value })} placeholder={t("Köməkçiyə öz sözlərinlə qayda yaz…")} />
          <div className="flex flex-wrap gap-1.5">
            {examples.filter((x) => !d.extraInstructions?.includes(x)).map((x) => (
              <button key={x} type="button" onClick={() => set({ extraInstructions: `${d.extraInstructions ? `${d.extraInstructions.trim()}\n` : ""}${x}`.slice(0, 1000) })}
                className="cursor-pointer rounded-full border border-dashed border-border bg-card px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary">+ {x}</button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{(d.extraInstructions ?? "").length}/1000</p>
        </div>

        <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
          <p className="flex-1 text-sm text-muted-foreground">{dirty ? t("Saxlanmamış dəyişiklik var.") : t("Bütün dəyişikliklər saxlanıb.")}</p>
          {dirty && <Button type="button" variant="ghost" onClick={() => { setD(base); setEditName(false); }}>{t("Ləğv et")}</Button>}
          <Button type="button" disabled={!dirty || busy} onClick={save}>{busy ? t("Saxlanır…") : t("Saxla")}</Button>
        </div>
      </div>
      <aside className="xl:sticky xl:top-4 xl:h-[calc(100dvh-8rem)] xl:self-start">
        <AssistantPreview name={base.agentName || tenant?.businessName || t("Köməkçi")} className="h-full" />
      </aside>
    </div>
  );
}

export default function Page() {
  return <RequireTenant><AssistantProfile /></RequireTenant>;
}

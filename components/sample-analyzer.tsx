"use client";
import { useState } from "react";
import { toast } from "sonner";
import { analyzeSample, applyAnalysis, type Analysis } from "@/lib/sample-analyzer";
import { parseConfigText } from "@/lib/config-file";
import type { ConfigJson } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";

/** API-nin real cavabını yapışdır, elan sahələri avtomatik tanınıb JSON-a yazılsın. */
export function SampleAnalyzer({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState("");
  const [a, setA] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);

  function analyze() {
    const r = analyzeSample(sample, t);
    if ("error" in r) { setError(r.error); setA(null); return; }
    setError("");
    setA(r.analysis);
    setChosen(r.analysis.attributes.slice(0, 5).map((x) => x.path));
  }

  function apply() {
    if (!a) return;
    // Boş olanda nümunə konfiqurasiya YOX, yalnız lazım olan boş skelet: sənin API-nin ünvanları doldurulmalıdır
    const skeleton: ConfigJson = { source: { type: "rest", baseUrl: "https://SAYTIN-API-UNVANI", search: { method: "GET", path: "/ELAN-YOLU" } } };
    const base = text.trim() ? parseConfigText(text, t) : { config: skeleton };
    if ("error" in base) { setError(t("Əvvəl konfiqurasiya JSON-dakı səhvi düzəlt, sonra tətbiq et.")); return; }
    onChange(JSON.stringify(applyAnalysis(base.config, a, chosen), null, 2));
    toast.success(text.trim() ? t("Tətbiq olundu. JSON-da “response” bölməsi yeniləndi. İndi “Yoxla” düyməsinə bas.") : t("Tətbiq olundu. İndi JSON-da “baseUrl” və “search.path” üçün öz API ünvanlarını yaz, sonra “Yoxla” düyməsinə bas."), { duration: 9000 });
    setA(null);
    setSample("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-2 text-sm font-medium">{t("Nümunə cavabdan avtomatik doldur")}</p>
        <Button type="button" size="sm" variant={open ? "default" : "outline"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t("Bağla") : t("Aç")}</Button>
      </div>
      {!open && <p className="text-xs text-muted-foreground">{t("Sayt API-nin elan siyahısı cavabını yapışdır, elan sahələrini (başlıq, qiymət, şəkil və s.) özümüz tapaq.")}</p>}
      {open && (
        <div className="flex flex-col gap-3">
          <ol className="list-decimal pl-5 text-xs text-muted-foreground">
            <li>{t("Brauzerdə və ya Postman-da API-nin elan siyahısı ünvanını aç (məs.")} <code className="font-mono">/api/listings</code>).</li>
            <li>{t("Cavabı olduğu kimi kopyala (bir neçə elan olsa daha yaxşıdır) və aşağıya yapışdır.")}</li>
            <li>{t("“Analiz et” düyməsinə bas, tapılanı yoxla, sonra JSON-a tətbiq et.")}</li>
          </ol>
          <div className="flex flex-col gap-1">
            <Label htmlFor="sample">{t("API cavabı (JSON)")}</Label>
            <Textarea id="sample" rows={8} spellCheck={false} className="font-mono text-xs" placeholder='{ "data": { "items": [ { "id": 1, "title": "…", "price": 1500 } ] } }' value={sample} onChange={(e) => setSample(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("Cavabda şəxsi məlumat varsa, çıxar. Yapışdırdığın mətn yalnız brauzerində analiz olunur, serverə göndərilmir.")}</p>
          </div>
          <div><Button type="button" size="sm" onClick={analyze} disabled={!sample.trim()}>{t("Analiz et")}</Button></div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {a && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <p><strong>{a.itemCount}</strong> {t("elan oxundu. Elanlar cavabın")} <code className="font-mono text-xs">{a.itemsPath ?? t("(birbaşa siyahı)")}</code> {t("hissəsindədir.")}</p>
            {a.preview.length > 0 && <p className="text-muted-foreground">{t("Nümunə:")} {a.preview.join("  |  ")}</p>}
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[26rem] text-left text-xs">
              <thead className="border-b border-border text-muted-foreground"><tr><th className="px-3 py-1.5 font-medium">{t("Sahə")}</th><th className="px-3 py-1.5 font-medium">{t("API-dəki yol")}</th><th className="px-3 py-1.5 font-medium">{t("Nümunə dəyər")}</th></tr></thead>
              <tbody>{a.detected.map((d) => <tr key={d.field} className="border-b border-border last:border-0"><td className="px-3 py-1.5">{d.field}</td><td className="px-3 py-1.5 font-mono">{d.path}</td><td className="px-3 py-1.5">{d.example}</td></tr>)}</tbody>
            </table>
          </div>
          {a.attributes.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-sm font-medium">{t("Elanda əlavə məlumat kimi göstərilsin? (AI bunları görəcək)")}</legend>
              {a.attributes.map((x) => (
                <label key={x.path} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={chosen.includes(x.path)} onChange={(e) => setChosen(e.target.checked ? [...chosen, x.path] : chosen.filter((p) => p !== x.path))} />
                  <span>{x.label}</span><span className="text-xs text-muted-foreground">({x.path}: {x.example})</span>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">{t("Hər sahə AI sorğusunu bahalaşdırır, 5-8 kifayətdir.")}</p>
            </fieldset>
          )}
          {a.notes.map((n, i) => <p key={i} className="text-sm text-amber">{t("Diqqət:")} {n}</p>)}
          <div className="flex gap-2"><Button type="button" size="sm" onClick={apply}>{t("JSON-a tətbiq et")}</Button><Button type="button" size="sm" variant="outline" onClick={() => setA(null)}>{t("Ləğv et")}</Button></div>
        </div>
      )}
    </div>
  );
}

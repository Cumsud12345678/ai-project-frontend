"use client";
import { useState } from "react";
import { AiHelper } from "@/components/ai-helper";
import { SampleAnalyzer } from "@/components/sample-analyzer";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/** Konfiqurasiyanı əl ilə yazmamaq üçün iki yol bir yerdə. */
export function ConfigAssist({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  const t = useT();
  const [tab, setTab] = useState<"ai" | "sample">("ai");
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-card p-4" aria-label={t("Avtomatik hazırlama")}>
      <div>
        <h2 className="text-sm font-semibold">{t("JSON-u əl ilə yazma: avtomatik hazırla")}</h2>
        <p className="text-xs text-muted-foreground">{t("İki yoldan birini seç. Nəticədə lazımsız filtr və sahələri silib “Yoxla”ya basmaq kifayətdir.")}</p>
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        <Button type="button" role="tab" aria-selected={tab === "ai"} size="sm" variant={tab === "ai" ? "default" : "outline"} onClick={() => setTab("ai")}>{t("AI ilə hazırla (tövsiyə olunur)")}</Button>
        <Button type="button" role="tab" aria-selected={tab === "sample"} size="sm" variant={tab === "sample" ? "default" : "outline"} onClick={() => setTab("sample")}>{t("Nümunə cavabdan doldur")}</Button>
      </div>
      {tab === "ai" ? <AiHelper onChange={onChange} /> : <SampleAnalyzer text={text} onChange={onChange} />}
    </section>
  );
}

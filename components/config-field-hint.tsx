"use client";
import { useMemo, useState } from "react";
import { Info, Search } from "lucide-react";
import { configDocs, docFor, jsonPathAt } from "@/lib/config-file";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";

/**
 * Redaktorun altında: kursor hansı sahədədirsə onun izahı (IDE-dəki ipucu kimi).
 * Nümunə JSON şərhsiz qalır, izahlar burada göstərilir.
 */
export function ConfigFieldHint({ text, pos }: { text: string; pos: number | null }) {
  const t = useT();
  const docs = useMemo(() => configDocs(t), [t]);
  const hit = pos === null || !text.trim() ? null : docFor(docs, jsonPathAt(text, pos));
  return (
    <div className="flex min-h-11 items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm" aria-live="polite">
      <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
      {hit ? (
        <p className="min-w-0"><code className="mr-1.5 rounded bg-card px-1.5 py-0.5 font-mono text-xs ring-1 ring-border">{hit.path}</code><span className="text-muted-foreground">{hit.text}</span></p>
      ) : <p className="text-muted-foreground">{t("Kursoru istənilən sahənin üzərinə qoy: burada onun nə olduğu yazılacaq.")}</p>}
    </div>
  );
}

/** Bütün sahələrin arayışı (axtarışla) */
export function ConfigReference() {
  const t = useT();
  const [q, setQ] = useState("");
  const docs = useMemo(() => Object.entries(configDocs(t)), [t]);
  const needle = q.trim().toLowerCase();
  const shown = docs.filter(([k, v]) => !needle || k.toLowerCase().includes(needle) || v.toLowerCase().includes(needle));
  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t("Sahələrin arayışı")} <span className="text-muted-foreground">({docs.length})</span></summary>
      <div className="flex flex-col gap-3 border-t border-border p-4">
        <div className="relative max-w-sm">
          <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Sahə axtar, məs. filters")} aria-label={t("Axtar")} className="pl-9" />
        </div>
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          {shown.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[16rem_1fr] sm:gap-4">
              <dt><code className="break-all font-mono text-xs">{k.replace(/\.\*/g, ".<ad>")}</code></dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
          {!shown.length && <p className="px-3 py-3 text-muted-foreground">{t("Heç nə tapılmadı.")}</p>}
        </dl>
      </div>
    </details>
  );
}

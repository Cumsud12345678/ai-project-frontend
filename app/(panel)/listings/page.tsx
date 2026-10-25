"use client";
import { useEffect, useState } from "react";
import { getListings, type Listing } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { ListingTable } from "@/components/listing-table";
import Link from "next/link";
import { RequireTenant, useSession } from "@/components/session";
import { TableSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Field = { name: string; label: string; hint?: string; kind: "number" | "string" | "boolean" | "text"; values?: string[] };
const SKIP = new Set(["sort", "limit", "sortBy", "sortDir", "minPrice", "maxPrice"]);

// Filtr sahələri müştərinin öz konfiqurasiyasından gəlir (hər sayt üçün fərqlidir); qiymət aralığı həmişə var.
function fieldsOf(source: Record<string, unknown> | undefined): Field[] {
  const raw = source?.filters;
  if (!raw || typeof raw !== "object") return [];
  const out: Field[] = [];
  for (const [name, r] of Object.entries(raw as Record<string, unknown>)) {
    if (SKIP.has(name) || !r || typeof r !== "object") continue;
    const rule = r as { type?: string; description?: string; values?: unknown };
    const kind = rule.type ?? (/^(min|max)[A-Z]/.test(name) ? "number" : "string");
    if (!["number", "string", "boolean", "text"].includes(kind)) continue; // aralıq və çoxseçimli filtrlər yalnız AI üçündür
    const desc = typeof rule.description === "string" ? rule.description : "";
    const label = desc && desc.length <= 28 && !desc.includes("(") ? desc : name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    out.push({ name, label, hint: desc || undefined, kind: kind as Field["kind"], values: Array.isArray(rule.values) && rule.values.every((v) => typeof v === "string") ? (rule.values as string[]) : undefined });
  }
  return out.slice(0, 6);
}

function Listings() {
  const t = useT();
  const { tenant } = useSession();
  const fields = fieldsOf(tenant?.config.source);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Listing[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const set = (k: string, v: string) => setVals((cur) => ({ ...cur, [k]: v }));

  const load = () => {
    setError("");
    setLoading(true);
    getListings(vals)
      .then((r) => setRows(r.listings))
      .catch((e: Error) => { setRows(null); setError(e.message); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = Object.values(vals).some((v) => v);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Kataloq")}</h1>
        <p className="text-sm text-muted-foreground">{t("Məsləhətçinin saytından oxuduğu elan, məhsul və ya xidmətlər. Başlıq, qiymət və link səhv çıxırsa, mənbə xəritələməsini düzəlt. Əlavə sütunlar xəritələmədəki əlavə sahələrdən gəlir.")}</p>
      </header>
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1"><Label htmlFor="minPrice">{t("Ən az qiymət")}</Label><Input id="minPrice" type="number" inputMode="numeric" value={vals.minPrice ?? ""} onChange={(e) => set("minPrice", e.target.value)} className="w-32" /></div>
        <div className="flex flex-col gap-1"><Label htmlFor="maxPrice">{t("Ən çox qiymət")}</Label><Input id="maxPrice" type="number" inputMode="numeric" value={vals.maxPrice ?? ""} onChange={(e) => set("maxPrice", e.target.value)} className="w-32" /></div>
        {fields.map((f) => (
          <div key={f.name} className="flex flex-col gap-1" title={f.hint}>
            <Label htmlFor={`f-${f.name}`}>{f.label}</Label>
            {f.kind === "boolean" ? (
              <select id={`f-${f.name}`} value={vals[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} className="h-9 w-32 rounded-md border border-border bg-card px-3 text-sm">
                <option value="">{t("Hamısı")}</option><option value="true">{t("Bəli")}</option><option value="false">{t("Xeyr")}</option>
              </select>
            ) : f.kind === "string" && f.values ? (
              <select id={`f-${f.name}`} value={vals[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} className="h-9 w-40 rounded-md border border-border bg-card px-3 text-sm">
                <option value="">{t("Hamısı")}</option>{f.values.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            ) : (
              <Input id={`f-${f.name}`} type={f.kind === "number" ? "number" : "text"} inputMode={f.kind === "number" ? "numeric" : undefined} value={vals[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} className="w-36" />
            )}
          </div>
        ))}
        <Button disabled={loading}>{loading ? t("Axtarılır…") : t("Axtar")}</Button>
        {filtered && <Button type="button" variant="ghost" disabled={loading} onClick={() => { setVals({}); setLoading(true); setError(""); getListings({}).then((r) => setRows(r.listings)).catch((e: Error) => { setRows(null); setError(e.message); }).finally(() => setLoading(false)); }}>{t("Filtrləri sıfırla")}</Button>}
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && <TableSkeleton />}
      {!loading && rows && (rows.length ? (
        <>
          <ListingTable listings={rows} />
          <p className="text-xs text-muted-foreground">{t("{n} nəticə göstərilir. Say Ayarlardakı “Nəticə sayı” ilə məhdudlaşır.", { n: rows.length })}</p>
        </>
      ) : <p className="text-sm text-muted-foreground">{filtered ? t("Bu filtrlərə uyğun nəticə tapılmadı. Filtrləri genişləndir.") : t("Mənbədən heç nə gəlmədi. Elan mənbəyi bölməsində xəritələməni yoxla.")}</p>)}
    </div>
  );
}

function Gate() {
  const t = useT();
  const { tenant } = useSession();
  if (tenant?.config.profile?.mode === "support" && !tenant.config.source)
    return <p className="text-sm text-muted-foreground">{t("Bu hesab yalnız dəstək botu kimi qurulub, elan mənbəyi yoxdur.")} <Link href="/knowledge" className="underline">{t("Bilik bazasına keç")}</Link></p>;
  return <Listings />;
}

export default function ListingsPage() {
  return <RequireTenant><Gate /></RequireTenant>;
}

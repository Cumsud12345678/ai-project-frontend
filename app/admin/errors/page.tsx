"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bug, CircleCheck, Trash2 } from "lucide-react";
import { adminDeleteErrors, adminErrors, type AdminErrors, type ErrorGroup, type ErrorSource } from "@/lib/api";
import { DangerAction } from "@/components/danger-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SOURCES: ErrorSource[] = ["api", "ai", "mail", "widget", "channel", "client", "job", "process"];
const tone: Record<ErrorSource, string> = {
  api: "bg-destructive/10 text-destructive", ai: "bg-chart-4/10 text-chart-4", mail: "bg-amber/15 text-amber", widget: "bg-chart-1/10 text-chart-1",
  client: "bg-chart-2/10 text-chart-2", channel: "bg-chart-3/15 text-chart-3", job: "bg-muted text-muted-foreground", process: "bg-destructive/15 text-destructive",
};

function Group({ g, onDelete }: { g: ErrorGroup; onDelete: () => void }) {
  const { t, num, date } = useI18n();
  const label: Record<ErrorSource, string> = { api: t("Server"), ai: t("AI servisi"), mail: t("E-poçt"), widget: t("Vidjet"), channel: t("Kanal"), client: t("Brauzer"), job: t("Planlı iş"), process: t("Proses") };
  return (
    <li className="px-4 py-3">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-start gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
          <Badge className={cn("mt-0.5 shrink-0", tone[g.source])}>{label[g.source]}</Badge>
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium">{g.message}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {g.path && <span className="font-mono">{g.path}</span>}{g.path && " · "}{g.status ? `${g.status} · ` : ""}{g.code ? `${g.code} · ` : ""}{t("son")}: {date(g.lastAt)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums" title={t("Təkrar sayı")}>× {num(g.count)}</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-muted/60 p-3 text-xs">
          <dl className="grid gap-1 sm:grid-cols-2">
            <div><dt className="inline text-muted-foreground">{t("İlk baş vermə")}: </dt><dd className="inline">{date(g.firstAt)}</dd></div>
            <div><dt className="inline text-muted-foreground">{t("Son baş vermə")}: </dt><dd className="inline">{date(g.lastAt)}</dd></div>
            {g.sample.method && <div><dt className="inline text-muted-foreground">{t("Metod")}: </dt><dd className="inline font-mono">{g.sample.method}</dd></div>}
            {g.sample.userId && <div><dt className="inline text-muted-foreground">{t("İstifadəçi ID")}: </dt><dd className="inline font-mono">{g.sample.userId}</dd></div>}
          </dl>
          {g.sample.stack ? <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-card p-2 font-mono text-[11px] leading-relaxed">{g.sample.stack}</pre> : <p className="text-muted-foreground">{t("Stack yoxdur.")}</p>}
          <div><Button size="sm" variant="outline" onClick={onDelete}><Trash2 size={14} aria-hidden /> {t("Bu qrupu sil")}</Button></div>
        </div>
      </details>
    </li>
  );
}

/** Sistem xəta jurnalı: eyni xətalar qruplaşır, mənbə (server, AI, e-poçt, vidjet, brauzer) və vaxta görə süzülür. */
export default function AdminErrorsPage() {
  const { t, num } = useI18n();
  const [range, setRange] = useState<"1d" | "7d" | "30d">("7d");
  const [source, setSource] = useState<ErrorSource | "">("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<AdminErrors | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => adminErrors({ range, source: source || undefined, q }).then((r) => { setData(r); setError(""); }).catch((e: Error) => setError(e.message)), [range, source, q]);
  useEffect(() => { const id = setTimeout(() => void load(), q ? 250 : 0); return () => clearTimeout(id); }, [load, q]);
  useEffect(() => { const i = setInterval(() => void load(), 30_000); return () => clearInterval(i); }, [load]);

  const label: Record<ErrorSource, string> = { api: t("Server"), ai: t("AI servisi"), mail: t("E-poçt"), widget: t("Vidjet"), channel: t("Kanal"), client: t("Brauzer"), job: t("Planlı iş"), process: t("Proses") };
  const remove = async (fingerprint?: string) => {
    const r = await adminDeleteErrors(fingerprint);
    toast.success(t("{n} qeyd silindi.", { n: r.deleted }));
    await load();
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Xətalar")}</h1>
          <p className="text-sm text-muted-foreground">{t("Serverdə, AI servisində, e-poçtda, vidjetdə və panelin brauzerində baş verən gözlənilməz xətalar. Qeydlər 30 gündən sonra avtomatik silinir.")}</p>
        </div>
        <Segmented value={range} onChange={setRange} options={[{ value: "1d", label: t("24 saat") }, { value: "7d", label: t("7 gün") }, { value: "30d", label: t("30 gün") }]} />
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Mənbə")}>
          <button type="button" aria-pressed={source === ""} onClick={() => setSource("")} className={cn("cursor-pointer rounded-full border px-3 py-1 text-sm", source === "" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>{t("Hamısı")} {data ? `(${num(Object.values(data.bySource).reduce((a, b) => a + b, 0))})` : ""}</button>
          {SOURCES.filter((s) => data?.bySource[s]).map((s) => (
            <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)} className={cn("cursor-pointer rounded-full border px-3 py-1 text-sm", source === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>{label[s]} ({num(data!.bySource[s]!)})</button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="eq" className="sr-only">{t("Axtar")}</Label>
          <Input id="eq" type="search" placeholder={t("Mesaj, ünvan və ya kod üzrə axtar")} value={q} onChange={(e) => setQ(e.target.value)} className="w-72 max-w-full" />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!data && !error && <Skeleton className="h-40" />}
      {data && data.groups.length === 0 && (
        <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CircleCheck size={32} className="text-chart-2" aria-hidden />
          <p className="font-medium">{q || source ? t("Bu süzgəc üzrə xəta yoxdur.") : t("Bu dövrdə xəta qeydə alınmayıb.")}</p>
        </Card>
      )}
      {data && data.groups.length > 0 && (
        <>
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Bug size={16} aria-hidden /> {t("{g} fərqli xəta, cəmi {n} hadisə", { g: num(data.groups.length), n: num(data.total) })}</p>
          <Card><ul className="divide-y divide-border">{data.groups.map((g) => <Group key={g.fingerprint} g={g} onDelete={() => void remove(g.fingerprint)} />)}</ul></Card>
          <DangerAction label="Bütün xətaları təmizlə" warning={t("Bütün xəta qeydləri silinəcək. Bu əməliyyat audit jurnalına yazılır.")} confirm={{ kind: "text", expected: "sil", hint: t("Təsdiqləmək üçün “sil” yaz") }} onConfirm={() => remove()} />
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Gauge, Hourglass, Zap } from "lucide-react";
import { getUsage, type Usage } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { DashboardSkeleton } from "@/components/skeletons";
import { Ring, TrendChart, compact } from "@/components/charts";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const { tenant } = useSession();
  const { t, num } = useI18n();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");

  // Yeni istifadəçi: əvvəlcə elan mənbəyini qoşmalıdır.
  useEffect(() => { if (!tenant) router.replace("/connection"); }, [tenant, router]);
  useEffect(() => { if (tenant) getUsage().then(setUsage).catch((e: Error) => setError(e.message)); }, [tenant]);
  if (!tenant) return null;
  if (!usage && !error) return <DashboardSkeleton />;

  const used = usage?.requests ?? 0;
  const limit = usage?.limits.monthlyRequests ?? 0;
  const left = limit ? Math.max(0, limit - used) : null;
  const pct = limit ? (used / limit) * 100 : 0;
  const ringColor = pct >= 100 ? "var(--destructive)" : pct >= 80 ? "var(--chart-3)" : "var(--chart-1)";
  const data = (usage?.daily ?? []).map((d) => ({ label: `${d.date.slice(8, 10)}.${d.date.slice(5, 7)}`, title: d.date, value: d.requests }));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Bu ayın istifadəsi")}</h1>
        <p className="text-sm text-muted-foreground">{usage?.month ?? "…"}</p>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Zap} tone={1} label={t("Sorğu")} value={usage ? num(used) : "–"} hint={limit ? `/ ${num(limit)} ${t("sorğu")}` : undefined} />
        <StatTile icon={Hourglass} tone={3} label={t("Qalan sorğu")} value={left === null ? "–" : num(left)} />
        <StatTile icon={Coins} tone={2} label={t("İstifadə olunan token")} value={usage ? num(usage.tokens) : "–"} />
        <StatTile icon={Gauge} tone={4} label={t("Dəqiqədə limit")} value={usage?.limits.ratePerMinute ?? "–"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {limit > 0 && usage && (
          <Card>
            <CardHeader><CardTitle>{t("Aylıq limit")}</CardTitle><CardDescription>{t("{limit} sorğudan {used} istifadə olunub", { limit, used })}</CardDescription></CardHeader>
            <CardContent className="py-6">
              <Ring pct={pct} color={ringColor} label={t("{limit} sorğudan {used} istifadə olunub", { limit, used })} />
            </CardContent>
          </Card>
        )}
        <Card className={limit > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle>{t("Son 14 gün")}</CardTitle>
            <CardDescription>{t("Günlər UTC ilə sayılır. Test söhbəti və çat vidjeti də sorğu kimi sayılır.")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("Günlük statistika hələ yoxdur.")}</p>
            ) : (
              <TrendChart data={data} unit={t("sorğu")} color="var(--chart-1)" fmt={num} tick={(n) => compact(n, t)} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

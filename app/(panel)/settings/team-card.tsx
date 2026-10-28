"use client";
import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addTeamMember, getTeam, removeTeamMember, type TeamMember } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Operator komandası: dəvət olunan e-poçt qeydiyyatdan keçib daxil olanda yalnız canlı söhbət qutusunu görür. */
export function TeamCard() {
  const { t } = useI18n();
  const [data, setData] = useState<{ max: number; members: TeamMember[] } | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { getTeam().then(setData).catch(() => setData({ max: 5, members: [] })); }, []);
  useEffect(load, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v || busy) return;
    setBusy(true);
    try { await addTeamMember(v); setEmail(""); toast.success(t("Dəvət göndərildi.")); load(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(m: TeamMember) {
    try { await removeTeamMember(m.email); load(); }
    catch (err) { toast.error((err as Error).message); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Operator komandası")}</CardTitle>
        <CardDescription>{t("Əlavə etdiyin şəxslər öz e-poçtu ilə daxil olub yalnız canlı söhbətlərə cavab verir; ayarları və məlumatları görmür. Yeni söhbət olanda hamıya e-poçt gedir.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data && !!data.members.length && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.members.map((m) => (
              <li key={m.email} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{m.email}</span>
                <Badge className={m.joined ? "bg-primary/10 text-primary" : "bg-amber/15 text-amber"}>{m.joined ? t("Qoşulub") : t("Dəvət gözləyir")}</Badge>
                <Button size="sm" variant="ghost" onClick={() => remove(m)} aria-label={t("Sil")}><Trash2 size={14} aria-hidden /></Button>
              </li>
            ))}
          </ul>
        )}
        {data && data.members.length < data.max ? (
          <form onSubmit={add} className="flex flex-wrap items-center gap-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("operator@sirket.az")} aria-label={t("Operatorun e-poçtu")} className="min-w-0 flex-1" />
            <Button disabled={busy || !email.trim()}><UserPlus size={16} aria-hidden />{t("Dəvət et")}</Button>
          </form>
        ) : data && <p className="text-sm text-muted-foreground">{t("Operator limiti doldu.")}</p>}
      </CardContent>
    </Card>
  );
}

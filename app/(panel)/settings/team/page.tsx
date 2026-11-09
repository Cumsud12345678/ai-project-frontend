"use client";
import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { addTeamMember, getTeam, removeTeamMember, type TeamMember } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { RequireTenant, useSession } from "@/components/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";

/** Komanda: sahib + dəvət olunan operatorlar. Operator öz e-poçtu ilə daxil olub yalnız söhbət qutusunu görür. */
function Team() {
  const { t, day } = useI18n();
  const { me } = useSession();
  const [data, setData] = useState<{ max: number; members: TeamMember[] } | null>(null);
  const [invite, setInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<TeamMember | null>(null);
  const load = useCallback(() => { getTeam().then(setData).catch(() => setData({ max: 5, members: [] })); }, []);
  useEffect(load, [load]);

  const members = data?.members ?? [];
  const full = !!data && members.length >= data.max;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!emailOk || busy) return;
    setBusy(true);
    try { await addTeamMember(email.trim()); setEmail(""); setInvite(false); toast.success(t("Dəvət göndərildi.")); load(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!del) return;
    setBusy(true);
    try { await removeTeamMember(del.email); setDel(null); toast.success(t("Silindi.")); load(); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Komanda üzvləri")}
        description={t("Əlavə etdiyin şəxslər öz e-poçtu ilə daxil olub yalnız canlı söhbətlərə cavab verir; ayarları və məlumatları görmür. Yeni söhbət olanda hamıya e-poçt gedir.")}
        actions={<Button onClick={() => setInvite(true)} disabled={!data || full}><UserPlus size={16} aria-hidden />{t("Üzv dəvət et")}</Button>} />

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">{t("E-poçt")}</th><th className="px-4 py-3 font-medium">{t("Rol")}</th><th className="px-4 py-3 font-medium">{t("Status")}</th><th className="px-4 py-3 font-medium">{t("Əlavə olunub")}</th><th className="w-12" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="px-4 py-3 font-medium">{me.email}</td>
              <td className="px-4 py-3">{t("Sahib")}</td>
              <td className="px-4 py-3"><Badge tone="success">{t("Aktiv")}</Badge></td>
              <td className="px-4 py-3 text-muted-foreground">—</td><td />
            </tr>
            {members.map((m) => (
              <tr key={m.email}>
                <td className="px-4 py-3 font-medium">{m.email}</td>
                <td className="px-4 py-3">{t("Operator")}</td>
                <td className="px-4 py-3"><Badge className={m.joined ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" : "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20"}>{m.joined ? t("Qoşulub") : t("Dəvət gözləyir")}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{day(m.addedAt)}</td>
                <td className="px-2 py-2 text-right"><RowMenu items={[{ label: t("Komandadan çıxar"), icon: Trash2, danger: true, run: () => setDel(m) }]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !members.length && (
          <div className="flex flex-col items-center gap-2 border-t border-border px-6 py-8 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted"><Users size={18} aria-hidden /></span>
            <p className="text-sm text-muted-foreground">{t("Hələ operator yoxdur. Söhbətlərə birlikdə cavab vermək üçün komanda yoldaşını dəvət et.")}</p>
          </div>
        )}
      </div>
      {data && <p className="text-xs text-muted-foreground">{t("{n} / {max} operator", { n: members.length, max: data.max })}{full ? ` · ${t("Operator limiti doldu.")}` : ""}</p>}

      <Modal open={invite} onClose={() => setInvite(false)} busy={busy} size="sm" title={t("Üzv dəvət et")} description={t("Bu e-poçtla qeydiyyatdan keçən şəxs avtomatik komandana qoşulur.")}
        footer={<><Button variant="outline" onClick={() => setInvite(false)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="invite-form" disabled={!emailOk || busy}>{busy ? t("Göndərilir…") : t("Dəvət et")}</Button></>}>
        <form id="invite-form" onSubmit={add} className="flex flex-col gap-1">
          <Label htmlFor="inv-email">{t("Operatorun e-poçtu")}</Label>
          <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("operator@sirket.az")} />
        </form>
      </Modal>

      <Modal open={del !== null} onClose={() => setDel(null)} busy={busy} size="sm" title={t("Komandadan çıxarılsın?")} description={t("Bu şəxs artıq panelə daxil ola və söhbətlərə cavab verə bilməyəcək.")}
        footer={<><Button variant="outline" onClick={() => setDel(null)} disabled={busy}>{t("Ləğv et")}</Button><Button variant="destructive" onClick={remove} disabled={busy}>{t("Çıxar")}</Button></>}>
        <p className="text-sm font-medium">{del?.email}</p>
      </Modal>
    </div>
  );
}

export default function TeamPage() {
  return <RequireTenant><Team /></RequireTenant>;
}

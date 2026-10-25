"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Mail, Phone, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { deleteLead, deleteUnanswered, getLeads, getUnanswered, setLeadHandled, type LeadRow, type UnansweredRow } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { RequireTenant } from "@/components/session";
import { CardSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";

function Leads({ rows, reload }: { rows: LeadRow[]; reload: () => void }) {
  const { t, short } = useI18n();
  async function act(fn: () => Promise<unknown>, ok?: string) {
    try { await fn(); if (ok) toast.success(ok); reload(); } catch (e) { toast.error((e as Error).message); }
  }
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("Hələ müraciət yoxdur. Çat cavab tapmayanda istifadəçi telefon və ya e-poçtunu burada qoyur.")}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((l) => {
        const isMail = l.contact.includes("@");
        return (
          <li key={l.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {l.name || t("Adsız")}
                {l.handled ? <Badge className="bg-primary/15 text-primary">{t("Həll olunub")}</Badge> : <Badge className="bg-amber/15 text-amber">{t("Yeni")}</Badge>}
              </p>
              <a href={isMail ? `mailto:${l.contact}` : `tel:${l.contact.replace(/[^\d+]/g, "")}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary underline">
                {isMail ? <Mail size={14} aria-hidden /> : <Phone size={14} aria-hidden />}{l.contact}
              </a>
              {l.question && <p className="mt-2 break-words text-sm text-muted-foreground">“{l.question}”</p>}
              {!!l.conversation?.length && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-primary">{t("Söhbətə bax ({n} mesaj)", { n: l.conversation.length })}</summary>
                  <ul className="mt-2 flex flex-col gap-1.5 rounded-md bg-muted/50 p-3">
                    {l.conversation.map((m, i) => (
                      <li key={i} className="break-words"><span className="font-medium">{m.role === "user" ? t("Ziyarətçi") : t("Çat")}:</span> {m.text}</li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{short(l.at)}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => act(() => setLeadHandled(l.id, !l.handled))}>
                {l.handled ? <><Undo2 size={14} aria-hidden />{t("Yenidən aç")}</> : <><Check size={14} aria-hidden />{t("Həll olundu")}</>}
              </Button>
              <Button size="sm" variant="ghost" aria-label={t("Sil")} onClick={() => act(() => deleteLead(l.id), t("Silindi."))}><Trash2 size={14} aria-hidden /></Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Unanswered({ rows, reload }: { rows: UnansweredRow[]; reload: () => void }) {
  const { t, short } = useI18n();
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t("Cavabsız sual yoxdur. Çat bütün suallara cavab tapıb.")}</p>;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("Çatın cavab tapa bilmədiyi suallar. Bunlara aid məlumatı")} <Link href="/knowledge" className="underline">{t("Bilik bazasına")}</Link> {t("əlavə et və çat sonrakı dəfə cavab verəcək.")}</p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1"><p className="break-words text-sm">{r.message}</p><p className="text-xs text-muted-foreground">{short(r.at)}</p></div>
            <Button size="sm" variant="ghost" aria-label={t("Sil")} onClick={async () => { try { await deleteUnanswered(r.id); reload(); } catch (e) { toast.error((e as Error).message); } }}><Trash2 size={14} aria-hidden /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Inbox() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"leads" | "unanswered">("leads");
  const [leads, setLeads] = useState<Awaited<ReturnType<typeof getLeads>> | null>(null);
  const [un, setUn] = useState<Awaited<ReturnType<typeof getUnanswered>> | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    Promise.all([getLeads(), getUnanswered()]).then(([l, u]) => { setLeads(l); setUn(u); setError(""); }).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!leads || !un) return error ? <p role="alert" className="text-sm text-destructive">{error}</p> : <CardSkeleton rows={3} />;
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Müraciətlər")}</h1>
        <p className="text-sm text-muted-foreground">{t("Çat cavab verə bilməyəndə istifadəçilər sənə yazır. Yeni müraciət e-poçtuna da gəlir.")}</p>
      </header>
      <Tabs value={tab} onChange={setTab} label={t("Bölmə")} items={[
        { value: "leads", label: t("Müraciətlər"), badge: leads.open },
        { value: "unanswered", label: t("Cavabsız suallar"), badge: un.total },
      ]} />
      {tab === "leads" ? <Leads rows={leads.items} reload={load} /> : <Unanswered rows={un.items} reload={load} />}
    </div>
  );
}

export default function InboxPage() {
  return <RequireTenant><Inbox /></RequireTenant>;
}

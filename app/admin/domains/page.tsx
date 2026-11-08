"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, CircleCheck, ExternalLink, Globe, RotateCcw, Search, ShieldOff, Undo2 } from "lucide-react";
import { adminBlockDomain, adminDomainOk, adminDomains, adminUnblockDomain, type DomainFilter, type DomainGroup } from "@/lib/api";
import { FilterPills, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Bir domen: başlıqda vəziyyət və düymələr, altında bu domeni işlətmiş bütün hesablar (silinmişlər də) */
function GroupCard({ g, onBlock, onUnblock, onOk }: { g: DomainGroup; onBlock: () => void; onUnblock: () => void; onOk: (ok: boolean) => void }) {
  const { t, day } = useI18n();
  const status = (a: DomainGroup["accounts"][number]) =>
    a.deleted ? [t("Silinib"), "bg-muted text-muted-foreground"] : a.suspended ? [t("Dayandırılıb"), "bg-destructive/10 text-destructive"] : !a.current ? [t("Domenini dəyişib"), "bg-muted text-muted-foreground"] : [t("Aktiv"), "bg-foreground text-background"];
  return (
    <article className={cn("overflow-hidden rounded-2xl border bg-card", g.block ? "border-destructive/40" : g.suspicious ? "border-amber/50" : "border-border")}>
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", g.block ? "bg-destructive/10 text-destructive" : "bg-muted")}>{g.block ? <Ban size={17} aria-hidden /> : <Globe size={17} aria-hidden />}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <a href={`https://${g.root}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:underline">{g.root}<ExternalLink size={13} aria-hidden /></a>
            {g.block && <Badge className="bg-destructive/10 text-destructive">{t("Bloklanıb")}</Badge>}
            {g.suspicious && <Badge className="bg-amber/15 text-amber">{t("Şübhəli")}</Badge>}
            {g.ok && <Badge className="bg-muted text-foreground">{t("Normal sayılıb")}</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("{n} hesab · {e} fərqli e-poçt", { n: g.accounts.length, e: g.emails })}
            {g.block && ` · ${t("Səbəb:")} ${g.block.reason} · ${g.block.by}, ${day(g.block.at)}`}
            {g.ok && !g.block && ` · ${g.ok.by}, ${day(g.ok.at)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {g.block
            ? <Button size="sm" variant="outline" onClick={onUnblock}><ShieldOff size={14} aria-hidden />{t("Bloku götür")}</Button>
            : <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={onBlock}><Ban size={14} aria-hidden />{t("Blokla")}</Button>}
          {!g.block && (
            <RowMenu items={g.ok
              ? [{ label: t("Yenidən yoxlanılsın"), icon: RotateCcw, run: () => onOk(false) }]
              : [{ label: t("Normaldır (agentlik, eyni şirkət)"), icon: CircleCheck, run: () => onOk(true), disabled: g.emails < 2 }]} />
          )}
        </div>
      </header>
      {g.accounts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">{t("E-poçt")}</th><th className="px-4 py-2 font-medium">{t("Sayt")}</th><th className="px-4 py-2 font-medium">{t("Qoşulub")}</th><th className="px-4 py-2 font-medium">{t("Status")}</th></tr></thead>
            <tbody className="divide-y divide-border border-t border-border">
              {g.accounts.map((a) => {
                const [label, cls] = status(a);
                return (
                  <tr key={a.tenantId}>
                    <td className="max-w-[16rem] px-4 py-2.5">{a.deleted ? <span className="block truncate text-muted-foreground">{a.email}</span> : <Link href={`/admin/users?q=${encodeURIComponent(a.email)}`} className="block truncate font-medium hover:underline">{a.email}</Link>}</td>
                    <td className="max-w-[14rem] px-4 py-2.5"><span className="block truncate">{a.businessName || "—"}</span><span className="block truncate font-mono text-xs text-muted-foreground">{a.host}</span></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{day(a.firstAt)}</td>
                    <td className="px-4 py-2.5"><Badge className={cls}>{label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="px-4 py-3 text-sm text-muted-foreground">{t("Bu domenlə hələ heç bir hesab qoşulmayıb, amma qeydiyyat bağlıdır.")}</p>}
    </article>
  );
}

export default function AdminDomainsPage() {
  const { t } = useI18n();
  const [f, setF] = useState<DomainFilter>("dup");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState<{ groups: DomainGroup[]; counts: Record<DomainFilter, number> } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState<{ domain: string; active: number; fixed: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [suspend, setSuspend] = useState(true);
  const [unblock, setUnblock] = useState<DomainGroup | null>(null);
  const [restore, setRestore] = useState(true);

  useEffect(() => { const id = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  const load = useCallback(() => adminDomains({ f, q: debounced }).then((r) => { setData(r); setError(""); }).catch((e: Error) => setError(e.message)), [f, debounced]);
  useEffect(() => { void load(); }, [load]);

  const openBlock = (g?: DomainGroup) => { setReason(""); setSuspend(true); setBlock(g ? { domain: g.root, active: g.accounts.filter((a) => a.current && !a.suspended).length, fixed: true } : { domain: "", active: 0, fixed: false }); };
  async function doBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!block || reason.trim().length < 3 || !block.domain.trim()) return;
    setBusy(true);
    try {
      const r = await adminBlockDomain({ domain: block.domain.trim(), reason: reason.trim(), suspend: suspend && block.active > 0 });
      toast.success(r.block.suspended.length ? t("{d} bloklandı, {n} hesab dayandırıldı.", { d: r.block.domain, n: r.block.suspended.length }) : t("{d} bloklandı.", { d: r.block.domain }));
      setBlock(null); await load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  async function doUnblock() {
    if (!unblock) return;
    setBusy(true);
    try {
      const r = await adminUnblockDomain(unblock.root, restore);
      toast.success(r.restored ? t("Blok götürüldü, {n} hesab bərpa olundu.", { n: r.restored }) : t("Blok götürüldü."));
      setUnblock(null); await load();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  async function markOk(g: DomainGroup, ok: boolean) {
    try { await adminDomainOk(g.root, ok); toast.success(ok ? t("{d} normal sayıldı. Yeni hesab gəlsə yenidən göstəriləcək.", { d: g.root }) : t("{d} yenidən şübhəlilər siyahısındadır.", { d: g.root })); await load(); }
    catch (err) { toast.error((err as Error).message); }
  }

  const c = data?.counts;
  const empty: Record<DomainFilter, string> = {
    dup: t("Şübhəli domen yoxdur: hər sayt bir hesabla qoşulub."), blocked: t("Bloklanmış domen yoxdur."), ok: t("Normal sayılan domen yoxdur."), all: t("Hələ heç bir sayt qoşulmayıb."),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("Domenlər")} description={t("Eyni sayt fərqli e-poçtlarla qoşulanda burada görünür: məs. pulsuz balansı təkrar almaq üçün yeni hesab açılıb. Silinmiş hesablar da qeyddə qalır. Domeni bloklasan, ona heç bir hesabla qoşulmaq olmur.")}
        actions={<Button onClick={() => openBlock()}><Ban size={16} aria-hidden />{t("Domeni blokla")}</Button>} />

      <div className="flex flex-wrap items-center gap-3">
        <FilterPills value={f} onChange={setF} label={t("Süzgəc")} items={[
          { value: "dup", label: t("Şübhəli"), count: c?.dup },
          { value: "blocked", label: t("Bloklanan"), count: c?.blocked },
          { value: "ok", label: t("Normal sayılan"), count: c?.ok },
          { value: "all", label: t("Hamısı"), count: c?.all },
        ]} />
        <div className="relative ml-auto w-full max-w-xs">
          <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Domen, e-poçt və ya sayt adı")} aria-label={t("Axtar")} className="pl-9" />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!data && !error && <Skeleton className="h-48" />}
      {data && data.groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><Globe size={22} aria-hidden /></span>
          <p className="text-sm text-muted-foreground">{debounced ? t("“{q}” üzrə nəticə yoxdur.", { q: debounced }) : empty[f]}</p>
        </div>
      )}
      {data && data.groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.groups.map((g) => <GroupCard key={g.root} g={g} onBlock={() => openBlock(g)} onUnblock={() => { setRestore(true); setUnblock(g); }} onOk={(ok) => void markOk(g, ok)} />)}
          <p className="text-xs text-muted-foreground">{t("Müqayisə əsas domen üzrədir: www.shop.az, m.shop.az və shop.az eyni sayt sayılır.")}</p>
        </div>
      )}

      <Modal open={!!block} onClose={() => setBlock(null)} busy={busy} title={t("Domeni blokla")} description={t("Bu domenlə (və onun alt domenləri ilə) yeni hesab qoşmaq və domeni ona dəyişmək mümkün olmayacaq. Bloku istənilən vaxt götürə bilərsən.")}
        footer={<><Button variant="outline" onClick={() => setBlock(null)} disabled={busy}>{t("Ləğv et")}</Button><Button type="submit" form="block-form" variant="destructive" disabled={busy || reason.trim().length < 3 || !block?.domain.trim()}>{t("Blokla")}</Button></>}>
        {block && (
          <form id="block-form" onSubmit={doBlock} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="bd-domain">{t("Domen")}</Label>
              <Input id="bd-domain" value={block.domain} readOnly={block.fixed} onChange={(e) => setBlock({ ...block, domain: e.target.value })} placeholder="sayt.az" className={block.fixed ? "bg-muted font-medium" : ""} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="bd-reason">{t("Səbəb (yalnız adminlər görür)")}</Label>
              <Input id="bd-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t("məs. pulsuz balans üçün təkrar qeydiyyat")} />
            </div>
            {block.active > 0 && (
              <label className="flex items-start gap-2.5 rounded-xl border border-border p-3 text-sm">
                <input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} className="mt-0.5 size-4" />
                <span><span className="font-medium">{t("Bu domendəki {n} aktiv hesabı da dayandır", { n: block.active })}</span><span className="block text-xs text-muted-foreground">{t("Vidjet, kanallar və API dayanır, sahiblərinə e-poçt gedir. Blok götürüləndə avtomatik bərpa olunurlar.")}</span></span>
              </label>
            )}
          </form>
        )}
      </Modal>

      <Modal open={!!unblock} onClose={() => setUnblock(null)} busy={busy} size="sm" title={t("Blok götürülsün?")} description={unblock ? t("{d} ilə yenidən qeydiyyatdan keçmək mümkün olacaq.", { d: unblock.root }) : undefined}
        footer={<><Button variant="outline" onClick={() => setUnblock(null)} disabled={busy}>{t("Ləğv et")}</Button><Button disabled={busy} onClick={doUnblock}><Undo2 size={15} aria-hidden />{t("Bloku götür")}</Button></>}>
        {unblock?.block && unblock.block.suspended.length > 0 && (
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={restore} onChange={(e) => setRestore(e.target.checked)} className="mt-0.5 size-4" />
            <span>{t("Blok zamanı dayandırılan {n} hesabı bərpa et", { n: unblock.block.suspended.length })}</span>
          </label>
        )}
      </Modal>
    </div>
  );
}

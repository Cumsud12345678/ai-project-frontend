"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, CircleCheck, LogOut, ShieldCheck } from "lucide-react";
import { adminBillingSettings, adminDeleteUser, adminResetTwoFactor, adminRevokeSessions, adminSetBranding, adminRotateKey, adminSetRole, adminSuspend, adminTenantBilling, adminTopup, adminUnsuspend, adminUsage, adminUsers, type AdminUser, type AdminUsersPage, type Billing, type Usage, type UserFilter } from "@/lib/api";
import { DangerAction } from "@/components/danger-action";
import { RotateKey } from "@/components/rotate-key";
import { UserListSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";

function UsageLine({ tenantId }: { tenantId: string }) {
  const { t, num } = useI18n();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try { setUsage(await adminUsage(tenantId)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (busy) return <Skeleton className="h-5 w-64" />;
  if (!usage) return <div><Button size="sm" variant="outline" onClick={load}>{t("Bu ayın istifadəsini göstər")}</Button></div>;
  return (
    <p className="text-sm tabular-nums">
      {usage.month}: <strong>{usage.requests}</strong> / {usage.limits.monthlyRequests ?? "–"} {t("sorğu")}, {num(usage.tokens)} {t("token")}
    </p>
  );
}


function BillingAdmin({ tenantId, onChange }: { tenantId: string; onChange: () => void }) {
  const { t } = useI18n();
  const [b, setB] = useState<Billing | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [markup, setMarkup] = useState("");
  const [credit, setCredit] = useState("");
  const [daily, setDaily] = useState("");
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const load = async () => {
    try {
      const r = await adminTenantBilling(tenantId);
      setB(r); setMarkup(r.admin?.markup != null ? String(r.admin.markup) : ""); setCredit(String(r.admin?.creditLimitAzn ?? 0));
      setDaily(r.admin?.dailyLimitAzn != null ? String(r.admin.dailyLimitAzn) : "");
    } catch (e) { toast.error((e as Error).message); }
  };
  const num = (s: string) => Number(s.replace(",", "."));
  // 100 AZN və böyük məbləğ: səhv rəqəm pula başa gəlir, ikinci təsdiq istənir (server də yoxlayır)
  const apply = async (confirmLarge: boolean) => {
    const v = num(amount);
    if (Math.abs(v) >= 100 && !confirmLarge) { setConfirming(true); return; }
    try { await adminTopup(tenantId, v, note, confirmLarge); toast.success(t("Balans yeniləndi.")); setAmount(""); setNote(""); setConfirming(false); await load(); onChange(); } catch (e) { toast.error((e as Error).message); }
  };
  if (!open) return <div><Button size="sm" variant="outline" onClick={() => { setOpen(true); void load(); }}>{t("Balansı idarə et")}</Button></div>;
  if (!b) return <Skeleton className="h-5 w-64" />;
  const a = b.admin;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3 text-sm">
      <p className="tabular-nums">{t("Balans")}: <strong>{b.balance.totalAzn.toFixed(2)} AZN</strong> ({t("pulsuz")} {b.balance.freeAzn.toFixed(2)} + {t("yüklənmiş")} {b.balance.paidAzn.toFixed(2)}) · {t("30 gün: real xərc")} {a?.costAzn30.toFixed(2)} AZN → {t("müştəriyə")} {b.spend.last30Azn.toFixed(2)} AZN · {b.spend.last30Requests} {t("sorğu")}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div><Label htmlFor={`a-${tenantId}`}>{t("Məbləğ (AZN, mənfi = çıx)")}</Label><Input id={`a-${tenantId}`} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" inputMode="decimal" /></div>
        <div><Label htmlFor={`n-${tenantId}`}>{t("Qeyd")}</Label><Input id={`n-${tenantId}`} value={note} onChange={(e) => setNote(e.target.value)} className="w-48" /></div>
        <Button size="sm" disabled={!amount.trim() || confirming} onClick={() => apply(false)}>{t("Tətbiq et")}</Button>
      </div>
      {confirming && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
          <span className="flex-1">{num(amount) < 0 ? t("Balansdan {n} AZN çıxılacaq. Əminsən?", { n: Math.abs(num(amount)).toFixed(2) }) : t("Balansa {n} AZN əlavə olunacaq. Əminsən?", { n: num(amount).toFixed(2) })}</span>
          <Button size="sm" variant="destructive" onClick={() => apply(true)}>{t("Bəli, tətbiq et")}</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>{t("İmtina")}</Button>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div><Label htmlFor={`m-${tenantId}`}>{t("Vuruq (boş = ümumi {m})", { m: a?.defaultMarkup ?? 1.5 })}</Label><Input id={`m-${tenantId}`} value={markup} onChange={(e) => setMarkup(e.target.value)} className="w-32" inputMode="decimal" /></div>
        <div><Label htmlFor={`c-${tenantId}`}>{t("Kredit limiti (AZN)")}</Label><Input id={`c-${tenantId}`} value={credit} onChange={(e) => setCredit(e.target.value)} className="w-32" inputMode="decimal" /></div>
        <div>
          <Label htmlFor={`d-${tenantId}`}>{a?.defaultDailyLimitAzn ? t("Gündəlik limit (boş = ümumi {m} AZN, 0 = yoxdur)", { m: a.defaultDailyLimitAzn }) : t("Gündəlik limit (AZN, boş və ya 0 = yoxdur)")}</Label>
          <Input id={`d-${tenantId}`} value={daily} onChange={(e) => setDaily(e.target.value)} className="w-32" inputMode="decimal" />
        </div>
        <Button size="sm" variant="outline" onClick={async () => { try { await adminBillingSettings(tenantId, { markup: markup.trim() ? num(markup) : null, creditLimitAzn: num(credit) || 0, dailyLimitAzn: daily.trim() ? num(daily) : null }); toast.success(t("Ayarlar yadda saxlandı.")); await load(); } catch (e) { toast.error((e as Error).message); } }}>{t("Yadda saxla")}</Button>
      </div>
      {a?.todayAzn !== undefined && <p className="text-xs text-muted-foreground tabular-nums">{t("Bu gün xərclənib: {n} AZN", { n: a.todayAzn.toFixed(2) })}</p>}
    </div>
  );
}

function BrandingAdmin({ tenantId, removed, onChange }: { tenantId: string; removed: boolean; onChange: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>{t("Vidjetdə brend yazısı")}: <strong>{removed ? t("silinib") : t("görünür")}</strong></span>
      <Button size="sm" variant="outline" onClick={async () => { try { await adminSetBranding(tenantId, !removed); toast.success(t("Ayarlar yadda saxlandı.")); onChange(); } catch (e) { toast.error((e as Error).message); } }}>{removed ? t("Yazını qaytar") : t("Yazını sil")}</Button>
    </div>
  );
}

/** Müştərini dayandırmaq (səbəblə, sahibə email gedir) və ya bərpa etmək. Hesab və məlumat silinmir. */
function SuspendAdmin({ tenant, onChange }: { tenant: NonNullable<AdminUser["tenant"]>; onChange: () => void }) {
  const { t, date: when } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setOpen(false); setReason(""); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  if (tenant.suspended) return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-destructive"><Ban size={15} aria-hidden />{t("Dayandırılıb")} · {when(tenant.suspended.at)}</p>
      <p><span className="text-muted-foreground">{t("Səbəb:")}</span> {tenant.suspended.reason}</p>
      <p className="text-xs text-muted-foreground">{t("Kim:")} {tenant.suspended.by}</p>
      <div><Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => adminUnsuspend(tenant.tenantId), t("{name} bərpa olundu.", { name: tenant.businessName }))}><CircleCheck size={14} aria-hidden />{t("Bərpa et")}</Button></div>
    </div>
  );
  if (!open) return <div><Button size="sm" variant="outline" onClick={() => setOpen(true)}><Ban size={14} aria-hidden />{t("Dayandır")}</Button></div>;
  return (
    <form className="flex flex-col gap-2 rounded-lg border border-border p-3" onSubmit={(e) => { e.preventDefault(); void run(() => adminSuspend(tenant.tenantId, reason.trim()), t("{name} dayandırıldı.", { name: tenant.businessName })); }}>
      <p className="text-sm">{t("Vidjet saytda görünməyəcək, Telegram və WhatsApp cavab verməyəcək, API sorğuları dayanacaq. Hesab, məlumat və balans silinmir.")}</p>
      <Label htmlFor={`susp-${tenant.tenantId}`}>{t("Səbəb (sahibə email ilə göndəriləcək)")}</Label>
      <Input id={`susp-${tenant.tenantId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t("məs. ödəniş gecikir, spam şikayəti")} autoFocus />
      <div className="flex gap-2">
        <Button size="sm" variant="destructive" disabled={busy || reason.trim().length < 3}>{t("Dayandır")}</Button>
        <Button size="sm" type="button" variant="outline" onClick={() => setOpen(false)}>{t("İmtina")}</Button>
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></div>;
}

export default function AdminPage() {
  const { me } = useSession();
  const { t, date: when } = useI18n();
  const [data, setData] = useState<AdminUsersPage | null>(null);
  const [error, setError] = useState("");
  // Maliyyə/Ödənişlər səhifəsindən gələn keçid: ?q=<müştəri ID>
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { try { const q0 = new URLSearchParams(window.location.search).get("q"); if (q0) { setQ(q0); setDebounced(q0); } } catch { /* ünvan oxunmadı */ } }, []);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(1);
  useEffect(() => { const id = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => { setPage(1); }, [debounced, filter]);
  const reload = useCallback(() => adminUsers({ q: debounced, filter, page, limit: 25 }).then((r) => { setData(r); setError(""); }).catch((e: Error) => setError(e.message)), [debounced, filter, page]);
  useEffect(() => { void reload(); }, [reload]);
  const users = data?.users ?? null;
  const shown = users;
  const setUsers = (fn: (list: AdminUser[] | null) => AdminUser[] | null) => setData((d) => (d ? { ...d, users: fn(d.users) ?? [] } : d));

  async function remove(u: AdminUser) {
    await adminDeleteUser(u.id);
    setUsers((list) => list?.filter((x) => x.id !== u.id) ?? null);
    toast.success(u.tenant ? t("{email} silindi ({name} müştərisi ilə birlikdə).", { email: u.email, name: u.tenant.businessName }) : t("{email} silindi.", { email: u.email }));
  }

  async function setRole(u: AdminUser, role: "admin" | "user") {
    try {
      const r = await adminSetRole(u.id, role);
      setUsers((list) => list?.map((x) => (x.id === u.id ? { ...x, isAdmin: r.isAdmin } : x)) ?? null);
      toast.success(role === "admin" ? t("{email} artıq admindir.", { email: u.email }) : t("{email} artıq admin deyil.", { email: u.email }));
    } catch (e) { toast.error((e as Error).message); }
  }

  const rotate = (u: AdminUser) => (
    <RotateKey label="Açarı yenilə" rotate={async () => { const r = await adminRotateKey(u.tenant!.tenantId); toast.success(t("{name} üçün yeni açar yaradıldı.", { name: u.tenant!.businessName })); return r; }} warning={t("{name} üçün köhnə açar dərhal etibarsız olacaq. Yeni açarı müştəriyə ötürməlisən.", { name: u.tenant!.businessName })} />
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("İstifadəçilər")}</h1>
        <p className="text-sm text-muted-foreground">{t("Hesabları, elan mənbələrini və istifadəni idarə et.")}</p>
      </header>

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("Hesab")} value={data.counts.users} />
          <Stat label={t("Aktiv elan mənbəyi")} value={data.counts.tenants} />
          <Stat label={t("Email təsdiqli")} value={data.counts.verified} />
          <Stat label={t("Təsdiqlənməyən")} value={data.counts.unverified} />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="q">{t("Axtar")}</Label>
          <Input id="q" type="search" placeholder={t("Email, sayt adı, domen və ya müştəri ID")} value={q} onChange={(e) => setQ(e.target.value)} className="w-80 max-w-full" />
        </div>
        <Segmented value={filter} onChange={setFilter} label={t("Süzgəc")} options={[{ value: "all", label: t("Hamısı") }, { value: "tenants", label: t("Saytı olanlar") }, { value: "unverified", label: t("Təsdiqlənməyən") }, { value: "lowbal", label: t("Balansı bitən") }, { value: "suspended", label: t("Dayandırılan") }, { value: "admins", label: t("Adminlər") }]} />
        <a href="/api/portal/admin/users.csv" download className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-muted">{t("CSV yüklə")}</a>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!users && !error && <UserListSkeleton />}
      {users?.length === 0 && !debounced && filter === "all" && <p className="text-sm text-muted-foreground">{t("Hələ heç kim qeydiyyatdan keçməyib.")}</p>}
      {users?.length === 0 && (debounced || filter !== "all") && <p className="text-sm text-muted-foreground">{debounced ? t("“{q}” üzrə nəticə yoxdur.", { q: debounced }) : t("Bu süzgəcə uyğun hesab yoxdur.")}</p>}
      <ul className="flex flex-col gap-3">
        {shown?.map((u) => (
          <li key={u.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{u.email}</p>
                <p className="text-xs text-muted-foreground">{t("Qeydiyyat:")} {when(u.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                {u.isAdmin && <Badge>{u.isOwner ? t("Əsas admin") : t("Admin")}</Badge>}
                {u.twoFactor && <Badge className="gap-1 bg-chart-2/10 text-chart-2"><ShieldCheck size={12} aria-hidden />2FA</Badge>}
                {u.tenant?.suspended && <Badge className="bg-destructive/10 text-destructive">{t("Dayandırılıb")}</Badge>}
                {!u.verified && <Badge className="bg-amber/15 text-amber">{t("Email təsdiqlənməyib")}</Badge>}
              </div>
            </div>
            {u.tenant ? (
              <>
                <dl className="grid gap-1 text-sm sm:grid-cols-2">
                  <div><dt className="inline text-muted-foreground">{t("Sayt:")} </dt><dd className="inline">{u.tenant.businessName} · {u.tenant.domain}</dd></div>
                  <div><dt className="inline text-muted-foreground">{t("Rejim:")} </dt><dd className="inline">{({ listings: t("Yalnız elanlar"), support: t("Yalnız dəstək"), both: t("Elanlar + dəstək") })[u.tenant.mode ?? "listings"]}</dd></div>
                  <div><dt className="inline text-muted-foreground">{t("Aktivləşib:")} </dt><dd className="inline">{when(u.tenant.createdAt)}</dd></div>
                  {u.tenant.balance && <div><dt className="inline text-muted-foreground">{t("Balans")}: </dt><dd className="inline tabular-nums">{u.tenant.balance.totalAzn.toFixed(2)} AZN</dd></div>}
                  <div><dt className="inline text-muted-foreground">{t("Müştəri ID:")} </dt><dd className="inline font-mono text-xs">{u.tenant.tenantId}</dd></div>
                  {u.tenant.keyRotatedAt && <div><dt className="inline text-muted-foreground">{t("Açar yenilənib:")} </dt><dd className="inline">{when(u.tenant.keyRotatedAt)}</dd></div>}
                </dl>
                <UsageLine tenantId={u.tenant.tenantId} />
                <BillingAdmin tenantId={u.tenant.tenantId} onChange={reload} />
                <BrandingAdmin tenantId={u.tenant.tenantId} removed={Boolean(u.tenant.brandRemoved)} onChange={reload} />
                <SuspendAdmin tenant={u.tenant} onChange={reload} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("Elan mənbəyi hələ qoşulmayıb.")}</p>
            )}
            <div className="flex flex-wrap items-start gap-2 border-t border-border pt-3">
              {u.tenant && rotate(u)}
            {u.verified && !u.isOwner && u.email !== me.email && (
              <div>
                <Button size="sm" variant="outline" onClick={() => setRole(u, u.isAdmin ? "user" : "admin")}>
                  {u.isAdmin ? t("Adminlikdən çıxar") : t("Admin et")}
                </Button>
              </div>
            )}
            {u.email !== me.email && (
              <div>
                <Button size="sm" variant="outline" onClick={async () => { try { await adminRevokeSessions(u.id); toast.success(t("{email} bütün cihazlardan çıxarıldı.", { email: u.email })); } catch (e) { toast.error((e as Error).message); } }}>
                  <LogOut size={14} aria-hidden />{t("Bütün cihazlardan çıxar")}
                </Button>
              </div>
            )}
            {u.twoFactor && u.email !== me.email && (!u.isOwner || me.role === "admin") && (
              <DangerAction label="2FA-nı sıfırla" confirm={{ kind: "text", expected: u.email, hint: t("Təsdiqləmək üçün emaili yaz: {email}", { email: u.email }) }}
                warning={t("{email} iki addımlı girişi yenidən quraşdırmalı olacaq. Bunu yalnız istifadəçinin kimliyinə əmin olanda et (telefon itib, ehtiyat kodlar yoxdur).", { email: u.email })}
                onConfirm={async () => { await adminResetTwoFactor(u.id); toast.success(t("{email} üçün 2FA sıfırlandı.", { email: u.email })); await reload(); }} />
            )}
            {!u.isAdmin && u.email !== me.email && (
              <DangerAction label="İstifadəçini sil" confirm={{ kind: "text", expected: u.email, hint: t("Silməyi təsdiqləmək üçün emaili yaz: {email}", { email: u.email }) }}
                warning={u.tenant ? t("{email} hesabı və {name} müştərisi həmişəlik silinəcək: API açarı və çat vidjeti dərhal işləməyi dayandıracaq.", { email: u.email, name: u.tenant.businessName }) : t("{email} hesabı həmişəlik silinəcək.", { email: u.email })}
                onConfirm={() => remove(u)} />
            )}
            </div>
          </li>
        ))}
      </ul>
      {data && data.pages > 1 && (
        <nav aria-label={t("Səhifələr")} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground tabular-nums">{t("{from}–{to} / {total}", { from: (data.page - 1) * data.limit + 1, to: Math.min(data.total, data.page * data.limit), total: data.total })}</span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => { setPage((n) => n - 1); window.scrollTo({ top: 0 }); }}>← {t("Əvvəlki")}</Button>
            <Button size="sm" variant="outline" disabled={data.page >= data.pages} onClick={() => { setPage((n) => n + 1); window.scrollTo({ top: 0 }); }}>{t("Növbəti")} →</Button>
          </span>
        </nav>
      )}
    </div>
  );
}

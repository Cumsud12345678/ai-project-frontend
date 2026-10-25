"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { adminBillingRequests, adminBillingSettings, adminDeleteUser, adminResolveRequest, adminRotateKey, adminSetRole, adminTenantBilling, adminTopup, adminUsage, adminUsers, type AdminTopupRequest, type AdminUser, type Billing, type Usage } from "@/lib/api";
import { DangerAction } from "@/components/danger-action";
import { RotateKey } from "@/components/rotate-key";
import { UserListSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
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
  const [open, setOpen] = useState(false);
  const load = async () => {
    try {
      const r = await adminTenantBilling(tenantId);
      setB(r); setMarkup(r.admin?.markup != null ? String(r.admin.markup) : ""); setCredit(String(r.admin?.creditLimitAzn ?? 0));
    } catch (e) { toast.error((e as Error).message); }
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
        <Button size="sm" disabled={!amount.trim()} onClick={async () => { try { await adminTopup(tenantId, Number(amount.replace(",", ".")), note); toast.success(t("Balans yeniləndi.")); setAmount(""); setNote(""); await load(); onChange(); } catch (e) { toast.error((e as Error).message); } }}>{t("Tətbiq et")}</Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div><Label htmlFor={`m-${tenantId}`}>{t("Vuruq (boş = ümumi {m})", { m: a?.defaultMarkup ?? 1.5 })}</Label><Input id={`m-${tenantId}`} value={markup} onChange={(e) => setMarkup(e.target.value)} className="w-32" inputMode="decimal" /></div>
        <div><Label htmlFor={`c-${tenantId}`}>{t("Kredit limiti (AZN)")}</Label><Input id={`c-${tenantId}`} value={credit} onChange={(e) => setCredit(e.target.value)} className="w-32" inputMode="decimal" /></div>
        <Button size="sm" variant="outline" onClick={async () => { try { await adminBillingSettings(tenantId, { markup: markup.trim() ? Number(markup.replace(",", ".")) : null, creditLimitAzn: Number(credit.replace(",", ".")) || 0 }); toast.success(t("Ayarlar yadda saxlandı.")); await load(); } catch (e) { toast.error((e as Error).message); } }}>{t("Yadda saxla")}</Button>
      </div>
    </div>
  );
}

function TopupRequests({ onResolved }: { onResolved: () => void }) {
  const { t, short } = useI18n();
  const [rows, setRows] = useState<AdminTopupRequest[] | null>(null);
  const load = () => adminBillingRequests("pending").then((r) => setRows(r.requests)).catch(() => setRows([]));
  useEffect(() => { void load(); }, []);
  if (!rows?.length) return null;
  const act = async (id: string, action: "approve" | "reject") => {
    try { await adminResolveRequest(id, action); toast.success(action === "approve" ? t("Təsdiqləndi, balans yükləndi.") : t("Rədd edildi.")); await load(); onResolved(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <section className="rounded-lg border border-amber/50 bg-amber/10 p-4">
      <h2 className="font-medium">{t("Gözləyən yükləmə sorğuları")}</h2>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
            <span><strong className="tabular-nums">{r.amountAzn.toFixed(2)} AZN</strong> · {r.businessName} ({r.email}) · {short(r.at)}</span>
            <span className="flex gap-2"><Button size="sm" onClick={() => act(r.id, "approve")}>{t("Ödəniş alındı, təsdiqlə")}</Button><Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>{t("Rədd et")}</Button></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></div>;
}

export default function AdminPage() {
  const { me } = useSession();
  const { t, date: when } = useI18n();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const reload = () => adminUsers().then((r) => setUsers(r.users)).catch((e: Error) => setError(e.message));
  useEffect(() => { void reload(); }, []);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!users || !needle) return users;
    return users.filter((u) => [u.email, u.tenant?.businessName, u.tenant?.domain, u.tenant?.tenantId].some((v) => v?.toLowerCase().includes(needle)));
  }, [users, q]);

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

      {users && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("Hesab")} value={users.length} />
          <Stat label={t("Aktiv elan mənbəyi")} value={users.filter((u) => u.tenant).length} />
          <Stat label={t("Email təsdiqli")} value={users.filter((u) => u.verified).length} />
          <Stat label={t("Təsdiqlənməyən")} value={users.filter((u) => !u.verified).length} />
        </div>
      )}

      <TopupRequests onResolved={reload} />

      <div className="flex flex-col gap-1">
        <Label htmlFor="q">{t("Axtar")}</Label>
        <Input id="q" type="search" placeholder={t("Email, sayt adı, domen və ya müştəri ID")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" disabled={!users} />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!users && !error && <UserListSkeleton />}
      {users?.length === 0 && <p className="text-sm text-muted-foreground">{t("Hələ heç kim qeydiyyatdan keçməyib.")}</p>}
      {users && users.length > 0 && shown?.length === 0 && <p className="text-sm text-muted-foreground">{t("“{q}” üzrə nəticə yoxdur.", { q })}</p>}
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
            {!u.isAdmin && u.email !== me.email && (
              <DangerAction label="İstifadəçini sil" confirm={{ kind: "text", expected: u.email, hint: t("Silməyi təsdiqləmək üçün emaili yaz: {email}", { email: u.email }) }}
                warning={u.tenant ? t("{email} hesabı və {name} müştərisi həmişəlik silinəcək: API açarı və çat vidjeti dərhal işləməyi dayandıracaq.", { email: u.email, name: u.tenant.businessName }) : t("{email} hesabı həmişəlik silinəcək.", { email: u.email })}
                onConfirm={() => remove(u)} />
            )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

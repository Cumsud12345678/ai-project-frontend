"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, CircleCheck, Copy, Download, ExternalLink, Eye, LogOut, Search, ShieldCheck, ShieldOff, Trash2, UserCog, Users, Wallet } from "lucide-react";
import { adminAssignPlan, adminBillingSettings, adminDeleteUser, adminResetTwoFactor, adminRevokeSessions, adminSetBranding, adminRotateKey, adminSetRole, adminSuspend, adminTenantBilling, adminTopup, adminUnsuspend, adminUsage, adminUsers, type AdminUser, type AdminUsersPage, type Billing, type Usage, type UserFilter } from "@/lib/api";
import { DangerAction } from "@/components/danger-action";
import { FilterPills, PageHeader } from "@/components/page-header";
import { RotateKey } from "@/components/rotate-key";
import { InfoRow } from "@/components/settings-ui";
import { UserListSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { RowMenu } from "@/components/ui/row-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/components/session";
import { cn } from "@/lib/utils";

type Tenant = NonNullable<AdminUser["tenant"]>;
type Tab = "main" | "billing" | "access";
const FILTERS: UserFilter[] = ["all", "tenants", "unverified", "lowbal", "suspended", "admins"];
const toNum = (s: string) => Number(s.replace(",", "."));

/** Bölmə: başlıq + məzmun (modalın içində) */
function Block({ title, note, children, danger }: { title: string; note?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border p-4", danger ? "border-destructive/30" : "border-border")}>
      <div><h3 className={cn("text-sm font-semibold", danger && "text-destructive")}>{title}</h3>{note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}</div>
      {children}
    </section>
  );
}

function UsageLine({ tenantId }: { tenantId: string }) {
  const { t, num } = useI18n();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { adminUsage(tenantId).then(setUsage).catch((e: Error) => setError(e.message)); }, [tenantId]);
  if (error) return <span className="text-destructive">{error}</span>;
  if (!usage) return <Skeleton className="h-4 w-40" />;
  return <span className="tabular-nums">{num(usage.requests ?? 0)} / {usage.limits?.monthlyRequests ?? "∞"} {t("sorğu")} · {num(usage.tokens ?? 0)} {t("token")}</span>;
}

function BillingTab({ tenantId, onChange }: { tenantId: string; onChange: () => void }) {
  const { t } = useI18n();
  const [b, setB] = useState<Billing | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [markup, setMarkup] = useState("");
  const [credit, setCredit] = useState("");
  const [daily, setDaily] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await adminTenantBilling(tenantId);
      setB(r); setMarkup(r.admin?.markup != null ? String(r.admin.markup) : ""); setCredit(String(r.admin?.creditLimitAzn ?? 0));
      setDaily(r.admin?.dailyLimitAzn != null ? String(r.admin.dailyLimitAzn) : "");
    } catch (e) { toast.error((e as Error).message); }
  }, [tenantId]);
  useEffect(() => { void load(); }, [load]);
  const v = toNum(amount);
  const amountOk = amount.trim() !== "" && Number.isFinite(v) && v !== 0;
  // 100 AZN və böyük məbləğ: səhv rəqəm pula başa gəlir, ikinci təsdiq istənir (server də yoxlayır)
  const apply = async (confirmLarge: boolean) => {
    if (!amountOk) return;
    if (Math.abs(v) >= 100 && !confirmLarge) { setConfirming(true); return; }
    setBusy(true);
    try { await adminTopup(tenantId, v, note, confirmLarge); toast.success(t("Balans yeniləndi.")); setAmount(""); setNote(""); setConfirming(false); await load(); onChange(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const saveLimits = async () => {
    const m = markup.trim() ? toNum(markup) : null, c = toNum(credit) || 0, d = daily.trim() ? toNum(daily) : null;
    if ([m, c, d].some((x) => x !== null && (!Number.isFinite(x) || x < 0))) { toast.error(t("Rəqəmlər düzgün deyil.")); return; }
    setBusy(true);
    try { await adminBillingSettings(tenantId, { markup: m, creditLimitAzn: c, dailyLimitAzn: d }); toast.success(t("Ayarlar yadda saxlandı.")); await load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  if (!b) return <Skeleton className="h-48" />;
  const a = b.admin;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{t("Balans")}</p><p className="text-xl font-semibold tabular-nums">{b.balance.totalAzn.toFixed(2)} ₼</p><p className="text-xs text-muted-foreground tabular-nums">{t("pulsuz")} {b.balance.freeAzn.toFixed(2)} · {t("yüklənmiş")} {b.balance.paidAzn.toFixed(2)}</p></div>
        {/* Real AI xərci: provayderə ödənən, vuruqsuz. Vuruq yalnız köhnə balans modelində balansdan çıxılan məbləğə tətbiq olunur. */}
        <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{t("Bu ay: real AI xərci")}</p><p className="text-xl font-semibold tabular-nums">{(a?.monthCostAzn ?? 0).toFixed(3)} ₼</p><p className="text-xs text-muted-foreground tabular-nums">{t("bu gün")} {(a?.todayCostAzn ?? 0).toFixed(3)} ₼</p></div>
        <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">{t("30 gün: real AI xərci")}</p><p className="text-xl font-semibold tabular-nums">{(a?.costAzn30 ?? 0).toFixed(3)} ₼</p><p className="text-xs text-muted-foreground tabular-nums">{b.spend.last30Requests} {t("sorğu")}{b.spend.last30Azn > 0 && <> · {t("balansdan çıxılıb")} {b.spend.last30Azn.toFixed(2)} ₼</>}</p></div>
      </div>

      <PlanBlock tenantId={tenantId} b={b} onChange={load} />

      <Block title={t("Balansı dəyiş")} note={t("Mənfi məbləğ balansdan çıxır. 100 AZN və çox olanda əlavə təsdiq istənir.")}>
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1"><Label htmlFor={`a-${tenantId}`}>{t("Məbləğ (AZN)")}</Label><Input id={`a-${tenantId}`} value={amount} onChange={(e) => { setAmount(e.target.value); setConfirming(false); }} inputMode="decimal" placeholder="10" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={`n-${tenantId}`}>{t("Qeyd")}</Label><Input id={`n-${tenantId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("məs. bank köçürməsi, kompensasiya")} /></div>
          <Button disabled={!amountOk || confirming || busy} onClick={() => apply(false)}>{t("Tətbiq et")}</Button>
        </div>
        {confirming && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-sm">
            <span className="flex-1">{v < 0 ? t("Balansdan {n} AZN çıxılacaq. Əminsən?", { n: Math.abs(v).toFixed(2) }) : t("Balansa {n} AZN əlavə olunacaq. Əminsən?", { n: v.toFixed(2) })}</span>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>{t("Ləğv et")}</Button>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => apply(true)}>{t("Bəli, tətbiq et")}</Button>
          </div>
        )}
      </Block>

      <Block title={t("Qiymət və limitlər")}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1"><Label htmlFor={`m-${tenantId}`}>{t("Balans vuruğu (boş = ümumi {m})", { m: a?.defaultMarkup ?? 1.5 })}</Label><Input id={`m-${tenantId}`} value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={`c-${tenantId}`}>{t("Kredit limiti (AZN)")}</Label><Input id={`c-${tenantId}`} value={credit} onChange={(e) => setCredit(e.target.value)} inputMode="decimal" /></div>
          <div className="flex flex-col gap-1"><Label htmlFor={`d-${tenantId}`}>{t("Gündəlik limit (AZN)")}</Label><Input id={`d-${tenantId}`} value={daily} onChange={(e) => setDaily(e.target.value)} inputMode="decimal" placeholder={a?.defaultDailyLimitAzn ? String(a.defaultDailyLimitAzn) : "0"} /></div>
        </div>
        <p className="text-xs text-muted-foreground">{a?.defaultDailyLimitAzn ? t("Gündəlik limit (boş = ümumi {m} AZN, 0 = yoxdur)", { m: a.defaultDailyLimitAzn }) : t("Gündəlik limit (AZN, boş və ya 0 = yoxdur)")} {t("Plan müştərisində real AI xərcinə görə sayılır. Vuruq yalnız köhnə balans modelinə aiddir, plana təsir etmir.")}</p>
        <div className="flex justify-end"><Button variant="outline" disabled={busy} onClick={saveLimits}>{t("Saxla")}</Button></div>
      </Block>

      {!!b.ledger?.length && (
        <Block title={t("Son hərəkətlər")}>
          <ul className="divide-y divide-border text-sm">
            {b.ledger.slice(0, 8).map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2">
                <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{l.at.slice(0, 10)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.note || l.type}</span>
                <span className={cn("font-medium tabular-nums", l.amountAzn < 0 && "text-muted-foreground")}>{l.amountAzn > 0 ? "+" : ""}{l.amountAzn.toFixed(2)} ₼</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}

/** Abunə planı: cari vəziyyət, admin planı verir (pulsuz/endirimli, gün sayı ilə) və ya götürür */
function PlanBlock({ tenantId, b, onChange }: { tenantId: string; b: Billing; onChange: () => Promise<void> | void }) {
  const { t, day } = useI18n();
  const plans = b.catalog?.plans ?? [];
  const sub = b.subscription ?? null;
  const [plan, setPlan] = useState(sub?.plan ?? plans[0]?.id ?? "");
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const d = Number(days);
  const assign = async (p: string | null) => {
    setBusy(true);
    try { await adminAssignPlan(tenantId, p, d, note); toast.success(p ? t("Plan verildi.") : t("Plan götürüldü.")); setNote(""); await onChange(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Block title={t("Plan")} note={t("Ödənişsiz plan vermək (sınaq uzatma, kompensasiya). Ödənişli sifarişlər “Ödənişlər”dən təsdiqlənir.")}>
      {sub ? (
        <p className="text-sm">
          <span className="font-medium">{sub.planName}</span> · {sub.status === "active" ? t("aktiv") : sub.status === "grace" ? t("güzəşt müddəti") : t("bitib")} · {t("{d} tarixinədək", { d: day(sub.end) })} · <span className="tabular-nums">{sub.used}/{sub.included}</span> {t("cavab")}{(b.packLeft ?? 0) > 0 ? ` · +${b.packLeft} ${t("paket")}` : ""}{sub.nextName ? ` · ${t("növbəti: {p}", { p: sub.nextName })}` : ""}
        </p>
      ) : <p className="text-sm text-muted-foreground">{t("Plan yoxdur.")}</p>}
      <div className="grid gap-3 sm:grid-cols-[10rem_7rem_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1"><Label htmlFor={`pl-${tenantId}`}>{t("Plan")}</Label>
          <select id={`pl-${tenantId}`} value={plan} onChange={(e) => setPlan(e.target.value)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1"><Label htmlFor={`pd-${tenantId}`}>{t("Gün")}</Label><Input id={`pd-${tenantId}`} value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" /></div>
        <div className="flex flex-col gap-1"><Label htmlFor={`pn-${tenantId}`}>{t("Qeyd")}</Label><Input id={`pn-${tenantId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("məs. sınaq uzadıldı")} /></div>
        <Button disabled={busy || !plan || !(d >= 1 && d <= 3650)} onClick={() => assign(plan)}>{t("Planı ver")}</Button>
      </div>
      {sub && <div className="flex justify-end"><Button variant="outline" size="sm" disabled={busy} onClick={() => assign(null)}>{t("Planı götür")}</Button></div>}
    </Block>
  );
}

/** Müştərini dayandırmaq (səbəblə, sahibə email gedir) və ya bərpa etmək. Hesab və məlumat silinmir. */
function SuspendBlock({ tenant, onChange }: { tenant: Tenant; onChange: () => void }) {
  const { t, date: when } = useI18n();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setReason(""); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  if (tenant.suspended) return (
    <Block title={t("Dayandırılıb")} danger note={`${when(tenant.suspended.at)} · ${t("Kim:")} ${tenant.suspended.by}`}>
      <p className="text-sm"><span className="text-muted-foreground">{t("Səbəb:")}</span> {tenant.suspended.reason}</p>
      <div><Button variant="outline" disabled={busy} onClick={() => run(() => adminUnsuspend(tenant.tenantId), t("{name} bərpa olundu.", { name: tenant.businessName }))}><CircleCheck size={15} aria-hidden />{t("Bərpa et")}</Button></div>
    </Block>
  );
  return (
    <Block title={t("Saytı dayandır")} note={t("Vidjet saytda görünməyəcək, Telegram və WhatsApp cavab verməyəcək, API sorğuları dayanacaq. Hesab, məlumat və balans silinmir.")}>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); void run(() => adminSuspend(tenant.tenantId, reason.trim()), t("{name} dayandırıldı.", { name: tenant.businessName })); }}>
        <div className="flex flex-1 flex-col gap-1">
          <Label htmlFor={`susp-${tenant.tenantId}`}>{t("Səbəb (sahibə email ilə göndəriləcək)")}</Label>
          <Input id={`susp-${tenant.tenantId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={t("məs. ödəniş gecikir, spam şikayəti")} />
        </div>
        <Button variant="destructive" disabled={busy || reason.trim().length < 3}><Ban size={15} aria-hidden />{t("Dayandır")}</Button>
      </form>
    </Block>
  );
}

function UserModal({ u, tab, setTab, onClose, reload, onDeleted }: { u: AdminUser; tab: Tab; setTab: (t: Tab) => void; onClose: () => void; reload: () => void; onDeleted: (u: AdminUser) => void }) {
  const { me } = useSession();
  const { t, date: when } = useI18n();
  const tn = u.tenant;
  const self = u.email === me.email;
  const copy = (v: string) => { void navigator.clipboard.writeText(v).then(() => toast.success(t("Kopyalandı."))).catch(() => {}); };
  const mode = tn ? ({ listings: t("Yalnız elanlar"), support: t("Yalnız dəstək"), both: t("Elanlar + dəstək") })[tn.mode ?? "listings"] : "";
  return (
    <Modal open onClose={onClose} size="xl" focusFirst={false} title={<span className="flex flex-wrap items-center gap-2">{u.email}<StatusBadges u={u} /></span>} description={tn ? `${tn.businessName} · ${tn.domain}` : t("Elan mənbəyi hələ qoşulmayıb.")}>
      <div className="flex flex-col gap-4">
        <FilterPills value={tab} onChange={setTab} label={t("İstifadəçi")} items={[
          { value: "main", label: t("Ümumi") },
          ...(tn ? [{ value: "billing" as Tab, label: t("Balans") }] : []),
          { value: "access", label: t("Giriş və təhlükəsizlik") },
        ]} />

        {tab === "main" && (
          <>
            <Block title={t("Hesab")}>
              <div className="divide-y divide-border">
                <InfoRow label={t("E-poçt")}><button type="button" onClick={() => copy(u.email)} className="inline-flex cursor-pointer items-center gap-1.5 hover:underline">{u.email}<Copy size={13} aria-hidden /></button></InfoRow>
                <InfoRow label={t("Qeydiyyat")}>{when(u.createdAt)}</InfoRow>
                <InfoRow label={t("E-poçt təsdiqi")}>{u.verified ? t("Təsdiqlənib") : t("Təsdiqlənməyib")}</InfoRow>
              </div>
            </Block>
            {tn && (
              <>
                <Block title={t("Sayt")}>
                  <div className="divide-y divide-border">
                    <InfoRow label={t("Ad")}>{tn.businessName}</InfoRow>
                    <InfoRow label={t("Domen")}><a href={`https://${tn.domain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">{tn.domain}<ExternalLink size={13} aria-hidden /></a></InfoRow>
                    <InfoRow label={t("Rejim")}>{mode}</InfoRow>
                    <InfoRow label={t("Aktivləşib")}>{when(tn.createdAt)}</InfoRow>
                    <InfoRow label={t("Bu ay")}><UsageLine tenantId={tn.tenantId} /></InfoRow>
                    <InfoRow label={t("Müştəri ID")}><button type="button" onClick={() => copy(tn.tenantId)} className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs hover:underline">{tn.tenantId}<Copy size={13} aria-hidden /></button></InfoRow>
                  </div>
                </Block>
                <Block title={t("Vidjetdə brend yazısı")} note={t("Pullu xidmət kimi brend yazısını silmək olar.")}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>{tn.brandRemoved ? t("silinib") : t("görünür")}</span>
                    <Switch checked={!tn.brandRemoved} label={t("Vidjetdə brend yazısı")} onChange={async (v) => { try { await adminSetBranding(tn.tenantId, !v); toast.success(t("Ayarlar yadda saxlandı.")); reload(); } catch (e) { toast.error((e as Error).message); } }} />
                  </div>
                </Block>
                <SuspendBlock tenant={tn} onChange={reload} />
              </>
            )}
          </>
        )}

        {tab === "billing" && tn && <BillingTab tenantId={tn.tenantId} onChange={reload} />}

        {tab === "access" && (
          <>
            {!self && u.verified && !u.isOwner && (
              <Block title={t("Admin hüququ")} note={t("Admin bütün müştəriləri, balansları və ayarları görür və dəyişir.")}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span>{u.isAdmin ? t("Admin") : t("Adi istifadəçi")}</span>
                  <Switch checked={u.isAdmin} label={t("Admin hüququ")} onChange={async (v) => {
                    try { await adminSetRole(u.id, v ? "admin" : "user"); toast.success(v ? t("{email} artıq admindir.", { email: u.email }) : t("{email} artıq admin deyil.", { email: u.email })); reload(); }
                    catch (e) { toast.error((e as Error).message); }
                  }} />
                </div>
              </Block>
            )}
            {!self && (
              <Block title={t("Sessiyalar")} note={t("Hesab oğurlanıbsa və ya şübhəli giriş varsa: bütün cihazlardan çıxar, yenidən parolla girməli olacaq.")}>
                <div><Button variant="outline" onClick={async () => { try { await adminRevokeSessions(u.id); toast.success(t("{email} bütün cihazlardan çıxarıldı.", { email: u.email })); } catch (e) { toast.error((e as Error).message); } }}><LogOut size={15} aria-hidden />{t("Bütün cihazlardan çıxar")}</Button></div>
              </Block>
            )}
            {tn && (
              <Block title={t("API açarı")} note={tn.keyRotatedAt ? `${t("Açar yenilənib:")} ${when(tn.keyRotatedAt)}` : undefined}>
                <RotateKey label="Açarı yenilə" rotate={async () => { const r = await adminRotateKey(tn.tenantId); toast.success(t("{name} üçün yeni açar yaradıldı.", { name: tn.businessName })); return r; }} warning={t("{name} üçün köhnə açar dərhal etibarsız olacaq. Yeni açarı müştəriyə ötürməlisən.", { name: tn.businessName })} />
              </Block>
            )}
            {u.twoFactor && !self && (!u.isOwner || me.role === "admin") && (
              <Block title={t("İki addımlı giriş")} note={t("{email} iki addımlı girişi yenidən quraşdırmalı olacaq. Bunu yalnız istifadəçinin kimliyinə əmin olanda et (telefon itib, ehtiyat kodlar yoxdur).", { email: u.email })}>
                <DangerAction label="2FA-nı sıfırla" confirm={{ kind: "text", expected: u.email, hint: t("Təsdiqləmək üçün emaili yaz: {email}", { email: u.email }) }}
                  warning={t("{email} üçün 2FA sıfırlanacaq.", { email: u.email })}
                  onConfirm={async () => { await adminResetTwoFactor(u.id); toast.success(t("{email} üçün 2FA sıfırlandı.", { email: u.email })); reload(); }} />
              </Block>
            )}
            {!u.isAdmin && !self && (
              <Block title={t("İstifadəçini sil")} danger note={tn ? t("{email} hesabı və {name} müştərisi həmişəlik silinəcək: API açarı və çat vidjeti dərhal işləməyi dayandıracaq.", { email: u.email, name: tn.businessName }) : t("{email} hesabı həmişəlik silinəcək.", { email: u.email })}>
                <DangerAction label="İstifadəçini sil" confirm={{ kind: "text", expected: u.email, hint: t("Silməyi təsdiqləmək üçün emaili yaz: {email}", { email: u.email }) }}
                  warning={t("Bu əməliyyat geri qaytarılmır.")}
                  onConfirm={async () => { await adminDeleteUser(u.id); onDeleted(u); }} />
              </Block>
            )}
            {self && <p className="text-sm text-muted-foreground">{t("Bu sənin öz hesabındır: öz girişini Ayarlar → Giriş və təhlükəsizlik bölməsində idarə et.")}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}

function StatusBadges({ u }: { u: AdminUser }) {
  const { t } = useI18n();
  return (
    <>
      {u.isAdmin && <Badge className="bg-foreground text-background">{u.isOwner ? t("Əsas admin") : t("Admin")}</Badge>}
      {u.twoFactor && <Badge className="gap-1 bg-muted text-foreground"><ShieldCheck size={12} aria-hidden />2FA</Badge>}
      {u.tenant?.suspended && <Badge className="bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">{t("Dayandırılıb")}</Badge>}
      {!u.verified && <Badge className="bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20">{t("Təsdiqlənməyib")}</Badge>}
    </>
  );
}

export default function AdminUsersPage() {
  const { me } = useSession();
  const { t, day } = useI18n();
  const [data, setData] = useState<AdminUsersPage | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<{ id: string; tab: Tab } | null>(null);
  // Başqa səhifələrdən keçid: ?q=<müştəri ID və ya e-poçt>, ?f=<süzgəc>
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q0 = sp.get("q"), f0 = sp.get("f") as UserFilter | null;
      if (q0) { setQ(q0); setDebounced(q0); }
      if (f0 && FILTERS.includes(f0)) setFilter(f0);
    } catch { /* ünvan oxunmadı */ }
  }, []);
  useEffect(() => { const id = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => { setPage(1); }, [debounced, filter]);
  const reload = useCallback(() => adminUsers({ q: debounced, filter, page, limit: 25 }).then((r) => { setData(r); setError(""); }).catch((e: Error) => setError(e.message)), [debounced, filter, page]);
  useEffect(() => { void reload(); }, [reload]);
  const users = data?.users ?? null;
  const cur = open ? users?.find((u) => u.id === open.id) ?? null : null;

  async function quickRevoke(u: AdminUser) {
    try { await adminRevokeSessions(u.id); toast.success(t("{email} bütün cihazlardan çıxarıldı.", { email: u.email })); } catch (e) { toast.error((e as Error).message); }
  }

  const c = data?.counts;
  const labels: Record<UserFilter, string> = { all: t("Hamısı"), tenants: t("Saytı olanlar"), unverified: t("Təsdiqlənməyən"), lowbal: t("Balansı bitən"), suspended: t("Dayandırılan"), admins: t("Adminlər") };
  const counts: Partial<Record<UserFilter, number>> = c ? { all: c.users, tenants: c.tenants, unverified: c.unverified } : {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("İstifadəçilər")} description={t("Hesabları, elan mənbələrini və istifadəni idarə et.")}
        actions={<a href="/api/portal/admin/users.csv" download className={buttonVariants({ variant: "outline" })}><Download size={16} aria-hidden />{t("CSV yüklə")}</a>} />

      <div className="flex flex-wrap items-center gap-3">
        <FilterPills value={filter} onChange={setFilter} label={t("Süzgəc")} items={FILTERS.map((f) => ({ value: f, label: labels[f], count: counts[f] }))} />
        <div className="relative ml-auto w-full max-w-xs">
          <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Email, sayt adı, domen və ya müştəri ID")} aria-label={t("Axtar")} className="pl-9" />
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!users && !error && <UserListSkeleton />}
      {users?.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted"><Users size={22} aria-hidden /></span>
          <p className="text-sm text-muted-foreground">{debounced ? t("“{q}” üzrə nəticə yoxdur.", { q: debounced }) : filter !== "all" ? t("Bu süzgəcə uyğun hesab yoxdur.") : t("Hələ heç kim qeydiyyatdan keçməyib.")}</p>
        </div>
      )}
      {!!users?.length && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">{t("İstifadəçi")}</th><th className="px-4 py-3 font-medium">{t("Sayt")}</th><th className="px-4 py-3 text-right font-medium">{t("Balans")}</th><th className="px-4 py-3 font-medium">{t("Qeydiyyat")}</th><th className="w-12" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const bal = u.tenant?.balance?.totalAzn;
                return (
                  <tr key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen({ id: u.id, tab: "main" })}>
                    <td className="px-4 py-3"><span className="block font-medium">{u.email}</span><span className="mt-1 flex flex-wrap gap-1"><StatusBadges u={u} /></span></td>
                    <td className="max-w-[16rem] px-4 py-3">{u.tenant ? <><span className="block truncate font-medium">{u.tenant.businessName}</span><span className="block truncate text-xs text-muted-foreground">{u.tenant.domain}</span></> : <span className="text-muted-foreground">—</span>}</td>
                    <td className={cn("whitespace-nowrap px-4 py-3 text-right tabular-nums", bal !== undefined && bal <= 0 && "text-destructive")}>{bal !== undefined ? `${bal.toFixed(2)} ₼` : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{day(u.createdAt)}</td>
                    <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu items={[
                        { label: t("Ətraflı"), icon: Eye, run: () => setOpen({ id: u.id, tab: "main" }) },
                        ...(u.tenant ? [{ label: t("Balansı idarə et"), icon: Wallet, run: () => setOpen({ id: u.id, tab: "billing" }) }] : []),
                        ...(u.tenant ? [{ label: u.tenant.suspended ? t("Bərpa et") : t("Dayandır"), icon: Ban, run: () => setOpen({ id: u.id, tab: "main" }) }] : []),
                        ...(u.email !== me.email ? [{ label: t("Bütün cihazlardan çıxar"), icon: LogOut, run: () => void quickRevoke(u) }] : []),
                        { label: t("Giriş və təhlükəsizlik"), icon: u.isAdmin ? ShieldOff : UserCog, run: () => setOpen({ id: u.id, tab: "access" }) },
                        ...(!u.isAdmin && u.email !== me.email ? [{ label: t("İstifadəçini sil"), icon: Trash2, danger: true, run: () => setOpen({ id: u.id, tab: "access" }) }] : []),
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > 0 && (
        <nav aria-label={t("Səhifələr")} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground tabular-nums">{t("{from}–{to} / {total}", { from: (data.page - 1) * data.limit + 1, to: Math.min(data.total, data.page * data.limit), total: data.total })}</span>
          {data.pages > 1 && (
            <span className="flex gap-2">
              <Button size="sm" variant="outline" disabled={data.page <= 1} onClick={() => setPage((n) => n - 1)}>← {t("Əvvəlki")}</Button>
              <Button size="sm" variant="outline" disabled={data.page >= data.pages} onClick={() => setPage((n) => n + 1)}>{t("Növbəti")} →</Button>
            </span>
          )}
        </nav>
      )}

      {cur && open && <UserModal u={cur} tab={open.tab} setTab={(tab) => setOpen({ ...open, tab })} onClose={() => setOpen(null)} reload={() => void reload()}
        onDeleted={(u) => { setOpen(null); void reload(); toast.success(u.tenant ? t("{email} silindi ({name} müştərisi ilə birlikdə).", { email: u.email, name: u.tenant.businessName }) : t("{email} silindi.", { email: u.email })); }} />}
    </div>
  );
}

import { isLocale, translate } from "./i18n";

export type Mode = "listings" | "support" | "both";
export type AutoRefresh = "off" | "daily" | "weekly";
/** Şirkətin rəsmi əlaqə məlumatı: köməkçi telefon, ünvan və iş saatı soruşulanda yalnız bunu deyir */
export type CompanyInfo = { phone?: string; whatsapp?: string; email?: string; address?: string; city?: string; hours?: string; website?: string; instagram?: string; facebook?: string; about?: string };
export type Profile = { company?: CompanyInfo; language?: string; tone?: string; answerLength?: "short" | "medium" | "long"; agentName?: string; maxResults?: number; extraInstructions?: string; logQueries?: boolean; generalKnowledge?: boolean; imageSearch?: boolean; mode?: Mode; fallbackMessage?: string; kbAutoRefresh?: AutoRefresh };
export type ConfigJson = { businessName?: string; domain?: string; profile?: Profile; source?: Record<string, unknown>; apiSecret?: string; /** CSV/JSON/XML faylının mətni (yalnız fayl ilə qoşulmada) */ feedText?: string };

export type WorkHours = { tz: string; days: ({ from: string; to: string } | null)[] };
export type CampaignButton = { label: string; kind: "chat" | "send" | "close" };
/** Kampaniya (proaktiv mesaj) */
export type ProactiveRule = { id: string; text: string; delaySec: number; match: string; name?: string; title?: string; active?: boolean;
  audience?: "all" | "new" | "returning"; device?: "all" | "mobile" | "desktop"; freq?: "visit" | "once"; online?: boolean; buttons?: CampaignButton[]; startAt?: string | null; endAt?: string | null };
export type CampaignStat = { shown: number; clicked: number; chats: number };
export const getCampaignStats = () => call<{ stats: Record<string, CampaignStat> }>("/tenant/campaigns/stats");
export const resetCampaignStats = (id: string) => call<{ ok: true }>(`/tenant/campaigns/${id}/stats`, { method: "DELETE" });
export type WidgetSettings = {
  key: string;
  enabled: boolean;
  origins: string[];
  title: string;
  greeting: string;
  color: string;
  theme?: "light" | "dark" | "auto";
  /** Çat düyməsinin effektləri: rəngli dalğa (pulse) və yüngül atılma (bounce) */
  effects?: { pulse: boolean; bounce: boolean };
  logoUrl?: string | null;
  /** Çatın içindəki profil şəkli (başlıq və bot mesajları). null: standart robot ikonu. */
  avatarUrl?: string | null;
  label: string;
  limits?: {
    perVisitorDay: number;
    siteHour: number;
  };
  live?: {
    enabled: boolean;
    csat?: boolean;
    hours?: WorkHours | null;
  };
  proactive?: {
    enabled: boolean;
    rules: ProactiveRule[];
  };
  lastSeenAt?: string | null;
};

export type WidgetResponse = { widget: WidgetSettings; scriptUrl: string; domain: string; brandRemoved?: boolean; brandName?: string };

export type TwoFactorStatus = { enabled: boolean; required: boolean; setupNeeded: boolean; backupLeft: number };
export type Me = { email: string; role: "user" | "admin"; twoFactor?: TwoFactorStatus; partner?: { code: string; active: boolean } | null };
export type TenantInfo = {
  tenantId: string; businessName: string; domain: string; config: ConfigJson;
  createdAt: string; updatedAt: string; keyRotatedAt: string | null;
  /** Admin hesabı dayandırıbsa: vidjet və kanallar işləmir */
  suspended?: { at: string; reason: string } | null;
  /** Sehirbaz: seçilmiş məqsədlər və real məlumatla sınaq edilibmi (köhnə backend-də yoxdur) */
  setup?: { goals: ("answer" | "catalog")[]; tested: boolean };
};
export type TenantResponse = { tenant: TenantInfo | null; advisorUrl: string; role?: "owner" | "operator" };

export type Listing = {
  id: string; title: string; price?: number | null; currency?: string | null; url?: string | null; image?: string | null;
  make?: string | null; model?: string | null; year?: number | null; volume?: number | null; power?: number | null; mileage?: number | null;
  bodyType?: string | null; city?: string | null; fuelType?: string | null; transmission?: string | null;
  attributes?: Record<string, string> | null;
};
export type Usage = { month: string; requests: number; tokens: number; limits: { monthlyRequests?: number; ratePerMinute?: number }; daily?: { date: string; requests: number }[] };
export type Source = { title: string; url?: string };
export type ChatMessage = { role: "user" | "model"; text: string; listings?: Listing[]; sources?: Source[]; unanswered?: boolean };
export type TestResult = { ok: boolean; sampleCount: number; sampleListings: Listing[]; supportedFilters: string[]; filters?: { name: string; kind: string; description: string }[]; debug?: { dropped?: string[]; rawCount?: number; request?: string | null; note?: string | null } };
export type SampleRequest = { url: string; method?: "GET" | "POST"; body?: string; auth?: { type: string; name?: string }; apiSecret?: string };

export type AdminUser = {
  id: string; email: string; verified: boolean; isAdmin: boolean; isOwner?: boolean; createdAt: string; twoFactor?: boolean;
  tenant: { mode?: Mode; balance?: { totalAzn: number; paidAzn: number; spentAzn: number } | null; tenantId: string; businessName: string; domain: string; createdAt: string; keyRotatedAt: string | null; brandRemoved?: boolean; suspended?: { at: string; by: string; reason: string } | null } | null;
};

/** Serverin statik xəta mesajları lüğətdə varsa, panelin dilinə çevrilir; yoxdursa olduğu kimi qalır. */
const msg = (m: string) => {
  const l = typeof document !== "undefined" ? document.documentElement.lang : "az";
  return translate(isLocale(l) ? l : "az", m);
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public debug?: { dropped?: string[] }) { super(msg(message)); }
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/portal${path}`, {
      method: init.method ?? "GET",
      headers: { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, "Serverə qoşulmaq olmur. İnternetini və ya serverin işlədiyini yoxla.", "NETWORK");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? "Xəta baş verdi", data.code, data.debug);
  return data as T;
}
const post = <T,>(path: string, body?: unknown) => call<T>(path, { method: "POST", body });

// Kanallar (Telegram)
export type TelegramStatus = { connected: boolean; enabled: boolean; botUsername: string | null; connectedAt: string | null; httpsReady: boolean; keyReady: boolean };
export const getTelegram = () => call<TelegramStatus>("/tenant/channels/telegram");
export const connectTelegram = (token: string) => pinged(call<TelegramStatus>("/tenant/channels/telegram", { method: "PUT", body: { token } }));
export const setTelegramEnabled = (enabled: boolean) => pinged(call<TelegramStatus>("/tenant/channels/telegram", { method: "PATCH", body: { enabled } }));
export const disconnectTelegram = () => pinged(call<{ ok: true }>("/tenant/channels/telegram", { method: "DELETE" }));

// Kanallar (WhatsApp, QR ilə)
export type WhatsAppState = "off" | "connecting" | "qr" | "open" | "error" | "replaced";
export type WhatsAppStatus = { connected: boolean; enabled: boolean; phone: string | null; connectedAt: string | null; state: WhatsAppState; qr: string | null; error: string | null; pauseOnOwnReply: boolean; /** köməkçinin cavab yazmadığı nömrələr/adlar */ ignore?: string[]; keyReady: boolean };
export const getWhatsApp = () => call<WhatsAppStatus>("/tenant/channels/whatsapp");
export const connectWhatsApp = () => call<WhatsAppStatus>("/tenant/channels/whatsapp/connect", { method: "POST", body: { ack: true } });
export const patchWhatsApp = (patch: { enabled?: boolean; pauseOnOwnReply?: boolean; ignore?: string[] }) => pinged(call<WhatsAppStatus>("/tenant/channels/whatsapp", { method: "PATCH", body: patch }));
export const disconnectWhatsApp = () => pinged(call<{ ok: true }>("/tenant/channels/whatsapp", { method: "DELETE" }));

// Hesab
/** ref: partnyor kodu; refSource=link: linkdən gəlib (səhv kod xəta vermir), code: istifadəçi özü yazıb */
export const register = (email: string, password: string, ref?: { code: string; source: "link" | "code" }) =>
  post<{ ok: true }>("/auth/register", { email, password, ...(ref?.code && { ref: ref.code, refSource: ref.source }) });
export const checkRefCode = (code: string) => call<{ valid: boolean; code: string; bonusReplies: number }>(`/auth/ref/${encodeURIComponent(code)}`);

// Partnyor proqramı
export type PartnerTotals = { earned: number; adjust: number; paidOut: number; balance: number };
export type PartnerCustomer = { id: string; email: string; joinedAt: string; source: "link" | "code" | "admin"; until: string; active: boolean; site: { businessName: string; domain: string; tenantId?: string } | null; paidAzn: number; earnedAzn: number; bonus: boolean };
export type PartnerEntry = { id: string; kind: "commission" | "adjust" | "payout"; amountAzn: number; at: string; baseAzn?: number | null; rate?: number | null; note?: string; by?: string };
export type MyPartner = {
  partner: { code: string; rate: number; active: boolean; since: string }; link: string;
  settings: { months: number; bonusReplies: number }; totals: PartnerTotals; customers: PartnerCustomer[]; entries: PartnerEntry[];
};
export const getMyPartner = () => call<MyPartner>("/partner");
/** bonusReplies: kodla gələn müştəriyə ilk plan ödənişindən sonra bir dəfə verilən əlavə cavab sayı */
export type PartnerSettings = { defaultRate: number; bonusReplies: number; months: number };
export type AdminPartner = { id: string; email: string; code: string; rate: number; active: boolean; since: string; note: string; customers: number; totals: PartnerTotals };
export const adminPartners = () => call<{ settings: PartnerSettings; partners: AdminPartner[] }>("/admin/partners");
export const adminPartner = (id: string) => call<{ partner: AdminPartner; customers: PartnerCustomer[]; entries: PartnerEntry[] }>(`/admin/partners/${id}`);
export const adminCreatePartner = (body: { email: string; code?: string; rate?: number; note?: string }) => post<{ ok: true; id: string; code: string }>("/admin/partners", body);
export const adminUpdatePartner = (id: string, patch: { code?: string; rate?: number; active?: boolean; note?: string }) => call<{ ok: true }>(`/admin/partners/${id}`, { method: "PATCH", body: patch });
export const adminPartnerEntry = (id: string, body: { kind: "adjust" | "payout"; amountAzn: number; note: string }) => post<{ ok: true; totals: PartnerTotals }>(`/admin/partners/${id}/entries`, body);
export const adminPartnerReferral = (body: { email: string; code: string; countPast?: boolean }) => post<{ ok: true }>("/admin/partners/referrals", body);
export const adminPartnerSettings = (s: Partial<PartnerSettings>) => call<PartnerSettings>("/admin/partners/settings", { method: "PUT", body: s });
export const adminPartnerSync = () => post<{ ok: true }>("/admin/partners/sync");
export const verify = (email: string, code: string) => post<Me>("/auth/verify", { email, code });
export const resend = (email: string) => post<{ ok: true }>("/auth/resend", { email });
/** İki addımlı giriş aktivdirsə sessiya açılmır: { twoFactor: true, ticket } qayıdır, kod loginTwoFactor ilə göndərilir. */
export const login = (email: string, password: string) => post<Me | { twoFactor: true; ticket: string }>("/auth/login", { email, password });
export const loginTwoFactor = (email: string, ticket: string, code: string) => post<Me>("/auth/2fa/login", { email, ticket, code });
export const twoFactorSetup = (password: string) => post<{ secret: string; uri: string; qr: string }>("/auth/2fa/setup", { password });
export const twoFactorEnable = (code: string) => post<{ ok: true; backupCodes: string[]; me: Me }>("/auth/2fa/enable", { code });
export const twoFactorDisable = (password: string, code: string) => post<{ ok: true }>("/auth/2fa/disable", { password, code });
export const twoFactorBackupCodes = (code: string) => post<{ backupCodes: string[] }>("/auth/2fa/backup-codes", { code });
export const revokeOtherSessions = () => post<{ ok: true }>("/auth/sessions/revoke-others");
export const logout = () => post<{ ok: true }>("/auth/logout");
export const forgot = (email: string) => post<{ ok: true }>("/auth/forgot", { email });
export const resetPassword = (email: string, code: string, password: string) => post<{ ok: true }>("/auth/reset", { email, code, password });
export const getMe = () => call<Me>("/auth/me");
export const deleteMyAccount = (password: string) => post<{ ok: true }>("/auth/delete-account", { password });

// Müştəri paneli
export const getTenant = () => call<TenantResponse>("/tenant");
export const testConfig = (config: ConfigJson, testFilters?: Record<string, string | number | boolean>) => post<TestResult>("/tenant/config/test", { config, ...(testFilters && { testFilters }) });
/** Qoşulma sehirbazı: API ünvanının xam cavabını server gətirir (brauzerdə CORS olmur) */
export const fetchSample = (req: SampleRequest) => post<{ ok: boolean; json: unknown; ms: number }>("/tenant/config/sample", req);
export const activate = (config: ConfigJson) => post<{ apiKey: string; tenant: TenantInfo; sampleListings: Listing[] }>("/tenant", { config });
export const updateConfig = (config: ConfigJson) => call<{ tenant: TenantInfo; sampleListings: Listing[]; modeChanged?: "listings" | "support" | "both" }>("/tenant/config", { method: "PUT", body: { config } });
// Fayl/link ilə qoşulma (CSV, JSON, XML)
export type FeedColumn = { path: string; samples: string[]; filled: number };
export type FeedPreview = { ok: true; format: "csv" | "json" | "xml"; itemsPath: string; delimiter: string | null; count: number; truncated: boolean; columns: FeedColumn[]; suggestion: { fields: Record<string, unknown>; defaults: Record<string, unknown> }; sample: Listing[]; rawSample: unknown[] };
export const feedPreview = (b: { feedText?: string; url?: string; format?: string; itemsPath?: string }) => post<FeedPreview>("/tenant/feed/preview", b);
export type FeedStatus = { enabled: boolean; feed: { url?: string; format: string; count: number; updatedAt: string; refreshHours: number; lastError?: string; lastErrorAt?: string } | null };
export const getFeedStatus = () => call<FeedStatus>("/tenant/feed");
export const feedRefresh = (feedText?: string) => post<{ ok: true; count: number; truncated?: boolean }>("/tenant/feed/refresh", feedText ? { feedText } : {});
export const saveProfile = (profile: Profile) => call<{ profile: Profile }>("/tenant/profile", { method: "PATCH", body: profile });
export const rotateMyKey = () => post<{ apiKey: string }>("/tenant/key/rotate");
export const getWidget = () => call<WidgetResponse>("/tenant/widget");
/** logo = çat düyməsi, avatar = çatın içindəki profil şəkli (ayrı-ayrı saxlanır). */
export type WidgetImageKind = "logo" | "avatar";
export const uploadWidgetImage = (kind: WidgetImageKind, data: string) => call<WidgetResponse>(`/tenant/widget/${kind}`, { method: "PUT", body: { data } });
export const deleteWidgetImage = (kind: WidgetImageKind) => call<WidgetResponse>(`/tenant/widget/${kind}`, { method: "DELETE" });
export const uploadWidgetLogo = (data: string) => uploadWidgetImage("logo", data);
export const deleteWidgetLogo = () => deleteWidgetImage("logo");
export const saveWidget = (patch: Partial<Omit<WidgetSettings, "key">>) => pinged(call<WidgetResponse>("/tenant/widget", { method: "PUT", body: patch }));
export const rotateWidgetKey = () => post<WidgetResponse>("/tenant/widget/rotate");
export const getUsage = () => call<Usage>("/tenant/usage");
export const getListings = (q: Record<string, string>) =>
  call<{ count: number; listings: Listing[] }>(`/tenant/listings?${new URLSearchParams(Object.entries(q).filter(([, v]) => v))}`);
export const chat = (message: string, history: ChatMessage[]) =>
  pinged(post<{ answer: string; listings: Listing[]; sources?: Source[]; unanswered?: boolean; usage?: { tokens: number }; billing?: { billedAzn?: number; balanceAzn?: number } }>("/tenant/chat", { message, history: history.map(({ role, text }) => ({ role, text })) }));

// Admin
export type UserFilter = "all" | "tenants" | "unverified" | "admins" | "lowbal" | "suspended";
export type AdminUsersPage = { users: AdminUser[]; total: number; page: number; limit: number; pages: number; counts: { users: number; tenants: number; verified: number; unverified: number } };
/** Axtarış, süzgəc və səhifələmə serverdə */
export const adminUsers = (q: { q?: string; filter?: UserFilter; page?: number; limit?: number } = {}) =>
  call<AdminUsersPage>(`/admin/users?${new URLSearchParams(Object.entries({ q: q.q ?? "", filter: q.filter ?? "all", page: String(q.page ?? 1), limit: String(q.limit ?? 25) }).filter(([, v]) => v))}`);
export type UsagePoint = { requests: number; tokens: number };
export type UsageSummary = {
  today: UsagePoint & { date: string }; thisMonth: UsagePoint & { month: string }; lastMonth: UsagePoint & { month: string };
  daily: (UsagePoint & { date: string })[]; monthly: (UsagePoint & { month: string })[];
  tenants: (UsagePoint & { tenantId: string; businessName: string; domain: string })[];
};
export const adminUsageSummary = () => call<UsageSummary>("/admin/usage");
export const adminUsage = (tenantId: string) => call<Usage>(`/admin/tenants/${tenantId}/usage`);
export const adminRotateKey = (tenantId: string) => post<{ apiKey: string }>(`/admin/tenants/${tenantId}/rotate-key`);
export const adminSetRole = (id: string, role: "admin" | "user") => call<{ ok: true; isAdmin: boolean }>(`/admin/users/${id}/role`, { method: "PATCH", body: { role } });
export const adminDeleteUser = (id: string) => call<{ ok: true }>(`/admin/users/${id}`, { method: "DELETE" });
export const adminRevokeSessions = (id: string) => post<{ ok: true }>(`/admin/users/${id}/revoke-sessions`);
export const adminResetTwoFactor = (id: string) => post<{ ok: true }>(`/admin/users/${id}/reset-2fa`);
export const adminSuspend = (tenantId: string, reason: string) => post<{ ok: true }>(`/admin/tenants/${tenantId}/suspend`, { reason });
export const adminUnsuspend = (tenantId: string) => post<{ ok: true }>(`/admin/tenants/${tenantId}/unsuspend`);

export type FinanceMonth = {
  month: string; cashIn: { paidAzn: number; manualAzn: number; adjustAzn: number; totalAzn: number };
  billedAzn: number; freeAzn: number; /** müddəti bitib yanan yüklənmiş balans (gəlirə daxildir) */ expiredAzn?: number; revenueAzn: number; costAzn: number; profitAzn: number; marginPct: number | null; requests: number;
};
export type FinanceModel = { model: string; provider: "anthropic" | "google" | "other"; costAzn: number; calls: number; tokens: number; months: Record<string, number> };
export type FinanceTenant = { tenantId: string; businessName: string; domain: string; email: string; suspended: boolean; requests: number; billedAzn: number; freeAzn: number; revenueAzn: number; costAzn: number; profitAzn: number; markup: number; customMarkup: boolean; balanceAzn: number };
export type AdminFinance = {
  months: FinanceMonth[]; models: FinanceModel[]; tenants: FinanceTenant[];
  totals: { cashInAzn: number; cashInMonthAzn: number; outstandingPaidAzn: number; creditUsedAzn: number; defaultMarkup: number; usdAzn: number };
};
export const adminFinance = (months = 6) => call<AdminFinance>(`/admin/finance?months=${months}`);

export type AdminOverview = {
  users: { total: number; verified: number; admins: number; last7d: number; last30d: number };
  tenants: { total: number; modes: Record<string, number>; widgetActive7d: number; emptyBalance: number; suspended?: number };
  domains?: { suspicious: number; blocked: number };
  usage: { today: UsagePoint & { date: string }; thisMonth: UsagePoint & { month: string }; lastMonth: UsagePoint & { month: string } } | null;
  pendingTopups: number;
  /** Yeni (baxılmamış) qurulum sorğuları */
  setupNew?: number;
  /** Balansa daxil olan real pul (cəmi). AI servisi cavab verməyəndə null. */
  revenueAzn: number | null; revenueMonthAzn?: number | null; outstandingPaidAzn?: number | null; monthProfitAzn?: number | null;
  aiControl?: { paused: boolean; reason?: string; by?: string; at?: string } | null;
  errors: { last24h: number; last7d: number };
  signups: { date: string; users: number }[];
  topTenants: { tenantId: string; businessName: string; requests: number; tokens: number }[];
};
export const adminOverview = () => call<AdminOverview>("/admin/overview");
export type AdminHealth = {
  database: { ok: boolean; ms: number; error?: string }; ai: { ok: boolean; ms: number; error?: string };
  mail: { configured: boolean; from: string }; server: { uptimeSec: number; node: string; memoryMb: number; production: boolean };
  /** Backend admini hansı IP ilə görür (TRUST_PROXY yoxlaması). Köhnə backend-də yoxdur. */
  network?: { ip: string; privateIp: boolean; trustProxy: number; hops: number };
};
export const adminHealth = () => call<AdminHealth>("/admin/health");
export type ErrorSource = "api" | "ai" | "mail" | "widget" | "process" | "client" | "job" | "channel";
export type ErrorGroup = { fingerprint: string; source: ErrorSource; message: string; code?: string; status?: number; path?: string; count: number; firstAt: string; lastAt: string; sample: { id: string; stack?: string; method?: string; userId?: string; tenantId?: string } };
export type AdminErrors = { days: number; total: number; last24h: number; bySource: Record<string, number>; groups: ErrorGroup[] };
export const adminErrors = (q: { range: string; source?: string; q?: string }) => {
  const p = new URLSearchParams({ range: q.range });
  if (q.source) p.set("source", q.source);
  if (q.q?.trim()) p.set("q", q.q.trim());
  return call<AdminErrors>(`/admin/errors?${p}`);
};
export const adminDeleteErrors = (fingerprint?: string) => call<{ ok: true; deleted: number }>(`/admin/errors${fingerprint ? `?fingerprint=${encodeURIComponent(fingerprint)}` : ""}`, { method: "DELETE" });
export type AuditItem = { id: string; at: string; actor: string; action: string; target?: string; detail?: string };
export const adminAudit = (q: { action?: string; actor?: string; q?: string; before?: string } = {}) =>
  call<{ items: AuditItem[]; nextBefore: string | null }>(`/admin/audit?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][])}`);

// Ödənişlər
export type PaymentFilters = { status?: string; kind?: string; tenant?: string; from?: string; to?: string; before?: string };
type TenantMatch = { tenantId: string; businessName: string; domain: string };
export type PaymentRequestRow = TopupRequest & { businessName: string; domain: string; email: string; resolvedAt?: string; resolvedBy?: string };
export type LedgerRow = { id: string; tenantId: string; at: string; kind: "payment" | "manual" | "adjust" | "expire"; type: string; amountAzn: number; note: string; by: string; businessName: string; domain: string; email: string };
const pq = (f: PaymentFilters) => new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
export const adminPaymentRequests = (f: PaymentFilters) => call<{ requests: PaymentRequestRow[]; nextBefore: string | null; tenant: TenantMatch | null; matches: TenantMatch[] }>(`/admin/payments/requests?${pq(f)}`);
export const adminLedger = (f: PaymentFilters) => call<{ entries: LedgerRow[]; nextBefore: string | null; tenant: TenantMatch | null; matches: TenantMatch[] }>(`/admin/payments/ledger?${pq(f)}`);
export const adminLedgerCsvUrl = (f: PaymentFilters) => `/api/portal/admin/payments/ledger.csv?${pq({ ...f, before: "" })}`;

// Kanallar
export type ChannelRow = {
  tenantId: string; businessName: string; domain: string; email: string; errors24h: number; problems: ("wa_down" | "wa_connecting" | "errors" | "suspended")[];
  telegram: { enabled: boolean; bot: string; connectedAt: string; lastAt: string | null; idle: boolean } | null;
  whatsapp: { enabled: boolean; phone: string | null; connectedAt: string; state: WhatsAppState; error: string | null; lastAt: string | null; idle: boolean } | null;
};
export const adminChannels = () => call<{ rows: ChannelRow[]; summary: { telegram: number; whatsapp: number; waOpen: number; problems: number; waCapacity: { used: number; max: number } } }>("/admin/channels");

// Xəbərdarlıqlar və AI açarı
export type AlertKind = "errors" | "health" | "topup" | "channel" | "limit" | "domain" | "provider" | "setup";
export type AlertSettings = { email: boolean; telegram: boolean; kinds: Record<AlertKind, boolean>; errorThreshold: number };
export type AlertsView = {
  settings: AlertSettings; kinds: AlertKind[];
  telegram: { available: boolean; bot: string | null; me: { name: string; at: string } | null };
  recipients: { email: string; telegram: boolean }[]; mailConfigured: boolean;
  health: { ai: { down: boolean; since: string | null }; db: { down: boolean; since: string | null } };
  log: { at: string; kind: string; title: string; telegram: number; email: number }[];
};
export const adminAlerts = () => call<AlertsView>("/admin/alerts");
export const adminSaveAlerts = (patch: Partial<Omit<AlertSettings, "kinds">> & { kinds?: Partial<Record<AlertKind, boolean>> }) => call<AlertsView>("/admin/alerts", { method: "PUT", body: patch });
export const adminAlertsTelegram = () => post<{ url: string; expiresInS: number }>("/admin/alerts/telegram");
export const adminAlertsTelegramOff = () => call<AlertsView>("/admin/alerts/telegram", { method: "DELETE" });
export const adminAlertsTest = () => post<{ telegram: number; email: number }>("/admin/alerts/test");
export type AiControl = { paused: boolean; reason?: string; by?: string; at?: string };
export const adminAiControl = () => call<AiControl>("/admin/ai-control");
export const adminSetAiControl = (paused: boolean, reason = "") => call<AiControl>("/admin/ai-control", { method: "PUT", body: { paused, reason } });
export type Announcement = { text: string; level: "info" | "warn" | "critical"; active: boolean; updatedAt: string; by: string; expiresAt?: string | null };
export type AnnouncementHistory = { id: string; text: string; level: Announcement["level"]; by: string; at: string };
export type AnnouncementView = { announcement: Announcement | null; expired: boolean; history: AnnouncementHistory[] };
export const adminAnnouncement = () => call<AnnouncementView>("/admin/announcement");
/** expiresInH: avtomatik gizlənmə (saat), null = müddətsiz, verilməsə əvvəlki qalır */
export const adminSetAnnouncement = (a: { text: string; level: Announcement["level"]; active: boolean; expiresInH?: number | null }) => call<AnnouncementView>("/admin/announcement", { method: "PUT", body: a });
export const adminDeleteAnnouncement = () => call<AnnouncementView>("/admin/announcement", { method: "DELETE" });
export const adminDeleteAnnouncementHistory = (id: string) => call<AnnouncementView>(`/admin/announcement/history/${encodeURIComponent(id)}`, { method: "DELETE" });

// ---- Domenlər: eyni sayt fərqli hesablarda (pulsuz balans sui-istifadəsi), domen bloku ----
export type DomainAccount = { tenantId: string; userId: string; email: string; host: string; businessName: string; current: boolean; deleted: boolean; suspended: boolean; firstAt: string };
export type DomainBlock = { domain: string; reason: string; by: string; at: string; suspended: string[] };
export type DomainGroup = { root: string; accounts: DomainAccount[]; emails: number; block: DomainBlock | null; ok: { domain: string; accounts: number; by: string; at: string } | null; suspicious: boolean; lastAt: string };
export type DomainFilter = "dup" | "blocked" | "ok" | "all";
export const adminDomains = (q: { f: DomainFilter; q?: string }) => call<{ groups: DomainGroup[]; counts: Record<DomainFilter, number> }>(`/admin/domains?f=${q.f}${q.q ? `&q=${encodeURIComponent(q.q)}` : ""}`);
export const adminBlockDomain = (b: { domain: string; reason: string; suspend: boolean }) => call<{ ok: true; block: DomainBlock }>("/admin/domains/block", { method: "POST", body: b });
export const adminUnblockDomain = (domain: string, restore = true) => call<{ ok: true; restored: number }>("/admin/domains/unblock", { method: "POST", body: { domain, restore } });
export const adminDomainOk = (domain: string, ok = true) => call<{ ok: true }>("/admin/domains/ok", { method: "POST", body: { domain, ok } });
export const getAnnouncement = () => call<{ announcement: { text: string; level: Announcement["level"] } | null }>("/announcement");
/** Brauzer xətasını jurnala göndərir. Heç vaxt xəta atmır və cavab gözlənilmir. */
export const reportClientError = (e: { message: string; stack?: string; page?: string }) => {
  try { void fetch("/api/portal/client-errors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(e), keepalive: true }).catch(() => {}); } catch { /* jurnal sistemi səhifəni yıxmasın */ }
};

// Sayt istifadəçilərinin sualları
export type QueryRow = { id: string; at: string; sid?: string; message: string; results: number; tokens: number; cached: boolean; error: boolean; costAzn?: number | null };
export type QueryList = { enabled: boolean; retentionDays: number; hasMore: boolean; nextCursor: string | null; queries: QueryRow[] };
export type QueryStats = { enabled: boolean; days: number; total: number; noResults: number; errors: number; cached: number; conversations?: number; top: { message: string; count: number }[]; topNoResults: { message: string; count: number }[]; truncated?: boolean };
export const getQueries = (q: { days?: number; noResults?: boolean; q?: string; limit?: number; before?: string | null }) => {
  const p = new URLSearchParams();
  if (q.before) p.set("before", q.before);
  if (q.days) p.set("days", String(q.days));
  if (q.noResults) p.set("noResults", "1");
  if (q.q?.trim()) p.set("q", q.q.trim());
  if (q.limit) p.set("limit", String(q.limit));
  return call<QueryList>(`/tenant/queries${p.size ? `?${p}` : ""}`);
};
export const getQueryStats = (days: number) => call<QueryStats>(`/tenant/queries/stats?days=${days}`);
// Söhbət tarixçəsi, konversiya, ixrac, aylıq hesabat
export type ConversationRow = { sid: string; startedAt: string; lastAt: string; messages: number; first: string; unanswered: number; costAzn: number };
export type ConversationList = { enabled: boolean; hasMore: boolean; nextCursor: string | null; conversations: ConversationRow[] };
export type ConvListing = { id?: string; title: string; price?: number; currency?: string; url?: string; image?: string; year?: number; mileage?: number };
export type ConversationMsg = { id: string; at: string; message: string; answer: string | null; results: number; error: boolean; costAzn: number | null; listings?: ConvListing[]; confirm?: { title: string; summary: string }; clicks?: { id: string; title: string; at: string }[] };
export const getConversations = (q: { days?: number; limit?: number; before?: string | null }) => {
  const p = new URLSearchParams();
  if (q.before) p.set("before", q.before);
  if (q.days) p.set("days", String(q.days));
  if (q.limit) p.set("limit", String(q.limit));
  return call<ConversationList>(`/tenant/conversations${p.size ? `?${p}` : ""}`);
};
export const getConversation = (sid: string) => call<{ sid: string; messages: ConversationMsg[] }>(`/tenant/conversations/${encodeURIComponent(sid)}`);
export type Funnel = { days: number; conversations: number | null; questions: number; answered: number; unanswered: number; live: number; leads: number; leadsHandled: number; handoffs: number; handoffRate: number | null; handledRate: number | null; costAzn: number | null; withoutHandoff: number | null; actionsDone: number | null; feedbackUp: number; feedbackDown: number; csatAvg: number | null; csatCount: number; cardClicks: number };
// Hesabatlar: dövr və əvvəlki dövr, gündəlik bölgü, komanda
export type Csat = { good: number; neutral: number; bad: number; avg: number | null };
export type PeriodMetrics = { aiChats: number | null; questions: number | null; unanswered: number | null; resolution: number | null;
  liveNew: number; liveClosed: number; missed: number; firstResponseSec: number | null; durationSec: number | null; csat: Csat;
  leadsNew: number; leadsSolved: number; resolveSec: number | null; handoffs: number; up: number; down: number; clicks: number; actionsDone: number | null };
export type TeamRow = { name: string; chats: number; replies: number; firstResponseSec: number | null; durationSec: number | null; csat: Csat };
export type DailyRow = { day: string; questions: number | null; unanswered: number | null; live: number; leads: number; csatBad: number };
export type ReportData = { days: number; from: string; to: string; prevFrom: string; prevTo: string; generatedAt: string; logOn: boolean; cur: PeriodMetrics; prev: PeriodMetrics | null; daily: DailyRow[]; team: TeamRow[]; top: { message: string; count: number }[]; topNoResults: { message: string; count: number }[] };
export const getReportData = (days: number) => call<ReportData>(`/tenant/reports?days=${days}`);
export const getFunnel = (days: number) => call<Funnel>(`/tenant/funnel?days=${days}`);
export type TrendDay = { day: string; total: number; unanswered: number };
export type InsightsTrend = { days: number; enabled: boolean; daily: TrendDay[]; feedback: { up: number; down: number; satisfaction: number | null } };
export const getInsightsTrend = (days: number) => call<InsightsTrend>(`/tenant/insights/trend?days=${days}`);
export type InsightsResult = { asked?: number; tooFew?: boolean; minQuestions?: number; cached?: boolean; analyzedAt?: string; topics: { name: string; count: number; unanswered: number; examples: string[] }[]; gaps: { title: string; why: string; count: number; examples: string[] }[] };
export const analyzeInsights = (days: number, fresh = false) => post<InsightsResult>("/tenant/insights/analyze", { days, ...(fresh && { fresh: true }) });
export const getReport = () => call<{ monthly: boolean }>("/tenant/report");
export const setReport = (monthly: boolean) => call<{ monthly: boolean }>("/tenant/report", { method: "PUT", body: { monthly } });
export type ExportKind = "queries" | "conversations" | "leads" | "unanswered" | "live";
/** CSV faylı yükləyir (brauzer saxlama pəncərəsi açılır). Qaytarır: 5000 sətirdə kəsildimi. */
export async function downloadExport(kind: ExportKind, days: number): Promise<boolean> {
  let res: Response;
  try { res = await fetch(`/api/portal/tenant/export/${kind}?days=${days}`); }
  catch { throw new ApiError(0, "Serverə qoşulmaq olmur. İnternetini və ya serverin işlədiyini yoxla.", "NETWORK"); }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new ApiError(res.status, d.error ?? "Xəta baş verdi", d.code); }
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `${kind}.csv`;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return res.headers.get("x-truncated") === "1";
}
export const clearQueries = () => call<{ ok: true }>("/tenant/queries", { method: "DELETE" });

// Müştəriyə məxsus məlumat: istənilən növ (sifariş, ödəniş, şikayət, sorğu, abunə...)
export type FieldSpec = string | { path?: string; template?: string; type?: "text" | "number" | "date" | "url"; divide?: number; max?: number };
export type PrivateSource = {
  key: string; title: string; description: string; path: string; userParam?: string; itemsPath: string;
  idField?: string; ownerField?: string; fields: Record<string, FieldSpec>; lines?: { path: string; title: string; qty?: string };
};
export type PrivateData = {
  configured: boolean; ready?: boolean; baseUrl?: string;
  auth?: { type: "header" | "bearer" | "query"; name?: string; hasSecret: boolean };
  sources: PrivateSource[];
  identity: { configured: boolean; createdAt?: string | null };
};
export type PrivateInput = { baseUrl: string; apiSecret?: string; auth?: { type: string; name?: string }; sources: PrivateSource[] };
export const getPrivateData = () => call<PrivateData>("/tenant/private-data");
export const savePrivateData = (b: PrivateInput) => call<PrivateData>("/tenant/private-data", { method: "PUT", body: b });
export const deletePrivateData = () => call<{ ok: true }>("/tenant/private-data", { method: "DELETE" });
export const newIdentitySecret = () => post<{ identitySecret: string }>("/tenant/private-data/identity-secret");
export const testPrivateData = (kind: string, userId: string) => post<{ ok: boolean; kind: string; records?: Record<string, unknown>[]; error?: string }>("/tenant/private-data/test", { kind, userId });

// Bilik bazası (dəstək botu)
export type KbSource = {
  id: string; type: "file" | "url" | "site" | "text" | "qa" | "proc"; name: string; url: string | null; status: "processing" | "ready" | "failed"; error: string | null;
  chunks: number; chars: number; pages: number; size: number | null; createdAt: string; lastIndexedAt: string | null; lastRefreshAt?: string | null; refreshError?: string | null; questions?: string[]; answer?: string; triggers?: string[]; steps?: string;
};
export type KbInfo = {
  mode: Mode; autoRefresh?: AutoRefresh; fallbackMessage: string; defaultFallback: string; sources: KbSource[];
  limits: { sources: number; chunks: number; fileBytes: number; qa?: number; qaQuestions?: number; qaQuestionChars?: number; qaAnswerChars?: number; proc?: number; procTriggers?: number; procTriggerChars?: number; procNameChars?: number; procStepsChars?: number }; totals: { sources: number; chunks: number; qa?: number; proc?: number };
};
export const getKb = () => call<KbInfo>("/tenant/kb");

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export const kbUploadFile = async (file: File) =>
  post<{ source: KbSource }>("/tenant/kb/files", { name: file.name, mime: file.type, data: await toBase64(file) });
export const kbAddUrl = (url: string, crawl: boolean) => pinged(post<{ source: KbSource }>("/tenant/kb/urls", { url, crawl }));
export const kbAddText = (title: string, text: string) => pinged(post<{ source: KbSource }>("/tenant/kb/texts", { title, text }));
export const kbAddQa = (questions: string[], answer: string) => post<{ source: KbSource }>("/tenant/kb/qa", { questions, answer });
export const kbAddProc = (name: string, triggers: string[], steps: string) => post<{ source: KbSource }>("/tenant/kb/proc", { name, triggers, steps });
export const kbUpdateProc = (id: string, name: string, triggers: string[], steps: string) => call<{ source: KbSource }>(`/tenant/kb/proc/${id}`, { method: "PUT", body: { name, triggers, steps } });
export const kbUpdateQa = (id: string, questions: string[], answer: string) => call<{ source: KbSource }>(`/tenant/kb/qa/${id}`, { method: "PUT", body: { questions, answer } });
export const kbRefresh = (id: string) => post<{ source: KbSource }>(`/tenant/kb/sources/${id}/refresh`);
export const kbDelete = (id: string) => call<{ ok: true }>(`/tenant/kb/sources/${id}`, { method: "DELETE" });

export type UnansweredRow = { id: string; at: string; message: string; reason?: string };
export type LeadStatus = "new" | "open" | "pending" | "solved";
export type LeadRow = { id: string; at: string; name: string; contact: string; question: string; conversation?: { role: "user" | "model"; text: string }[]; handled: boolean;
  status?: LeadStatus; priority?: "low" | "normal" | "high"; assignee?: { id?: string; name: string } | null; notes?: { by: string; at: string; text: string }[]; history?: { by: string; at: string; e: string }[]; updatedAt?: string;
  /** AI-ın söhbətdə topladığı sifariş (API-siz sifariş forması) */
  order?: { title: string; fields: { label: string; value: string }[]; channel?: string; sid?: string } };

/** "Qurulumu bizə həvalə et": komanda botu müştərinin məlumatı ilə qurur */
export type SetupChannel = "site" | "telegram" | "whatsapp";
export type SetupRequestStatus = "new" | "in_progress" | "done";
export type SetupForm = { businessName: string; website: string; phone: string; description: string; salesScript: string; faq: string; channels: SetupChannel[] };
export type SetupRequest = SetupForm & { status: SetupRequestStatus; createdAt: string; updatedAt: string; doneAt?: string; adminNote?: string };
export type AdminSetupRequest = SetupRequest & { userId: string; email: string; tenantId?: string; doneBy?: string };
export const getSetupRequest = () => call<{ request: SetupRequest | null }>("/setup-request");
export const sendSetupRequest = (f: SetupForm) => call<{ request: SetupRequest }>("/setup-request", { method: "POST", body: f });
export const cancelSetupRequest = () => call<{ ok: true }>("/setup-request", { method: "DELETE" });
export const adminSetupRequests = (status?: SetupRequestStatus) => call<{ items: AdminSetupRequest[]; counts: Record<SetupRequestStatus, number> }>(`/admin/setup-requests${status ? `?status=${status}` : ""}`);
export const adminUpdateSetupRequest = (userId: string, p: { status?: SetupRequestStatus; adminNote?: string }) => call<{ request: AdminSetupRequest }>(`/admin/setup-requests/${encodeURIComponent(userId)}`, { method: "PATCH", body: p });
export const adminBuildSetupRequest = (userId: string) => call<{ request: AdminSetupRequest; created: boolean; kb: number; warnings: string[] }>(`/admin/setup-requests/${encodeURIComponent(userId)}/build`, { method: "POST" });

/** Telegram/WhatsApp-da susan müştəriyə bir dəfə xatırlatma */
export type FollowupSettings = { enabled: boolean; delayMin: number; text?: string };
export const getFollowup = () => call<{ followup: FollowupSettings; delays: number[] }>("/tenant/followup");
export const saveFollowup = (f: FollowupSettings) => call<{ followup: FollowupSettings; delays: number[] }>("/tenant/followup", { method: "PUT", body: f });

/** API-siz sifariş forması: AI söhbətdə bu sahələri soruşur, təsdiqdən sonra sifariş müraciətlər qutusuna düşür */
export type OrderFieldType = "text" | "phone" | "email" | "number" | "select" | "address";
export type OrderField = { key: string; label: string; type: OrderFieldType; required: boolean; description?: string; options?: string[] };
export type OrderForm = { enabled: boolean; title?: string; instructions?: string; successMessage?: string; fields: OrderField[]; updatedAt?: string };
export const getOrderForm = () => call<{ form: OrderForm | null }>("/tenant/order-form");
export const saveOrderForm = (form: OrderForm) => call<{ form: OrderForm }>("/tenant/order-form", { method: "PUT", body: form });
export const deleteOrderForm = () => call<{ ok: true }>("/tenant/order-form", { method: "DELETE" });
export const getUnanswered = () => call<{ total: number; items: UnansweredRow[] }>("/tenant/kb/unanswered");
export const deleteUnanswered = (id: string) => call<{ ok: true }>(`/tenant/kb/unanswered/${id}`, { method: "DELETE" });
export const getLeads = () => call<{ total: number; open: number; items: LeadRow[] }>("/tenant/kb/leads");
export const setLeadHandled = (id: string, handled: boolean) => call<{ lead: LeadRow }>(`/tenant/kb/leads/${id}`, { method: "PATCH", body: { handled } });
export const updateLead = (id: string, patch: { status?: LeadStatus; priority?: "low" | "normal" | "high"; assignee?: { id?: string; name: string } | null; note?: string }) => call<{ lead: LeadRow }>(`/tenant/kb/leads/${id}`, { method: "PATCH", body: patch });
export const deleteLead = (id: string) => call<{ ok: true }>(`/tenant/kb/leads/${id}`, { method: "DELETE" });

// İlk səhifə: quraşdırma, diqqət tələb edənlər, keyfiyyət
export type Overview = {
  mode: Mode;
  setup: {
    dataReady: boolean; dataCount: number; widgetInstalled: boolean; widgetEnabled: boolean; firstQuestion: boolean; queriesLogged: boolean;
    /** Yeni backend: sehirbazın addımları ilə eyni hazırlıq siqnalları (köhnə backend-də olmaya bilər) */
    catalogReady?: boolean; kbReady?: boolean; tested?: boolean; launched?: boolean; hasSite?: boolean; channels?: { telegram: boolean; whatsapp: boolean };
    goals?: string[]; goalsSet?: boolean;
  };
  attention: { kind: "widgetOff" | "live" | "leads" | "unanswered" | "sourceErrors" | "noResults"; count: number }[];
  quality: { total: number; noResults: number; errors: number; answerRate: number | null; handoffs: number | null };
  top: { message: string; count: number }[];
  limits?: { perVisitorDay: number; siteHour: number };
  live?: { enabled: boolean; open: number; waiting: number };
  feedback?: { up: number; down: number };
  billing?: { state: BillingState; balanceAzn: number; freeAzn: number; paidAzn: number; monthAzn: number; enforced: boolean;
    plan?: { name: string; status: Subscription["status"]; used: number; included: number; packLeft: number; end: string } | null;
    trial?: { left: number; total: number; until: string | null } | null } | null;
};
export const getOverview = () => call<Overview>("/tenant/overview");
/** Sehirbazın "Məqsəd" addımı (serverdə saxlanır) */
export const saveSetupGoals = (goals: ("answer" | "catalog")[]) => pinged(call<{ goals: ("answer" | "catalog")[] }>("/tenant/setup", { method: "PUT", body: { goals } }));
/** Uğurlu sorğudan sonra hazırlıq göstəricisini yeniləyir (cavabı dəyişmir) */
function pinged<T>(p: Promise<T>): Promise<T> { return p.then((r) => { pingOverview(); return r; }); }
/** Hazırlıq dəyişə biləcək bir iş görüləndə (məlumat əlavə, sınaq, kanal) yuxarı zolaqdakı göstərici dərhal yenilənsin */
export const pingOverview = () => { try { window.dispatchEvent(new Event("ca:overview")); } catch { /* server tərəfi */ } };

// Canlı operator söhbəti və cavablara rəy
export type LiveMsg = { from: "visitor" | "operator" | "system"; text: string; at: string; by?: string; /** göndərilən fayl: ziyarətçinin şəkli və ya operatorun şəkli/PDF-i */ file?: { id: string; mime: string; name?: string } };
export type LiveAssignee = { id?: string; userId?: string; name: string } | null;
export type LiveNote = { text: string; by: string; at: string };
export type LiveItem = { id: string; channel?: "telegram" | "whatsapp" | null; assignee?: LiveAssignee; name: string; contact: string; status: "open" | "closed"; createdAt: string; updatedAt: string; count: number; waiting: boolean; tags?: string[]; csat?: number | null; notes?: number; last: LiveMsg | null };
export type LiveChat = { id: string; channel?: "telegram" | "whatsapp" | null; assignee?: LiveAssignee; name: string; contact: string; status: "open" | "closed"; context: { role: "user" | "model"; text: string }[]; messages: LiveMsg[]; createdAt: string; notes?: LiveNote[]; tags?: string[]; csat?: { rating: number; comment?: string; at: string } | null; page?: { path: string; title?: string } | null; previous?: LivePrevious[]; visitor?: VisitorInfo | null; blocked?: boolean; summary?: SavedSummary & { stale?: boolean } };
/** Söhbətin AI xülasəsi: niyyət, əhval, etirazlar, növbəti addım, almağa yaxınlıq */
export type ChatSummary = { summary: string; intent: string; mood: "positive" | "neutral" | "negative"; objections: string[]; nextStep: string; temperature: "hot" | "warm" | "cold" };
export type SavedSummary = ChatSummary & { at: string; count: number };
export const liveSummary = (id: string, force = false) => post<{ summary: SavedSummary; cached: boolean }>(`/tenant/live/${id}/summary`, { force });
export const conversationSummary = (sid: string, force = false) => post<{ summary: SavedSummary; cached: boolean }>(`/tenant/conversations/${encodeURIComponent(sid)}/summary`, { force });
/** Brauzerin bildirdiyi ziyarətçi məlumatı */
export type VisitorInfo = { tz?: string; lang?: string; mobile?: boolean; first?: number; visits?: number; ref?: string };
export type LivePrevious = { id: string; createdAt: string; status: "open" | "closed"; count: number; tags: string[]; csat: number | null; first: string };
export const claimLive = (id: string) => post<{ ok: true }>(`/tenant/live/${id}/claim`);
export const releaseLive = (id: string) => post<{ ok: true }>(`/tenant/live/${id}/release`);
export type LiveContact = { channel: "telegram" | "whatsapp"; chatId: string; name: string; last: string; updatedAt: string };
export const getLiveContacts = () => call<{ items: LiveContact[] }>("/tenant/live/contacts");
/** Yeni müraciətin ötürüldüyü yerlər (yalnız sahib). Bitrix24 və webhook linkləri serverdə şifrəlidir, panelə yalnız domen gəlir. */
export type LeadForwardView = { telegram: { title: string } | null; telegramAvailable: boolean; bitrix: { host: string } | null; webhook: { host: string } | null; keyReady: boolean };
export const getLeadForward = () => call<LeadForwardView>("/tenant/lead-forward");
export const linkLeadTelegram = () => post<{ url: string; expiresInS: number }>("/tenant/lead-forward/telegram");
export const unlinkLeadTelegram = () => call<LeadForwardView>("/tenant/lead-forward/telegram", { method: "DELETE" });
export const saveLeadTarget = (kind: "bitrix" | "webhook", url: string) => call<LeadForwardView>(`/tenant/lead-forward/${kind}`, { method: "PUT", body: { url } });
export const deleteLeadTarget = (kind: "bitrix" | "webhook") => call<LeadForwardView>(`/tenant/lead-forward/${kind}`, { method: "DELETE" });
// Avtomatlaşdırmalar: hadisə → şərt → addımlar
export type AutoTrigger = "lead" | "bad_rating" | "chat_closed" | "daily";
export type AutoAction = { type: "telegram" | "email" | "webhook" | "bitrix" } | { type: "ticket"; priority: "normal" | "high" } | { type: "tag"; tag: string };
export type Automation = { id?: string; name: string; trigger: AutoTrigger; enabled: boolean; actions: AutoAction[];
  when?: { channel?: "any" | "site" | "telegram" | "whatsapp"; withContact?: boolean; source?: "any" | "csat" | "feedback"; hour?: number };
  createdAt?: string; lastRun?: { at: string; ok: boolean; error?: string } | null; runs?: number };
export type AutomationsView = { items: Automation[]; implicit: boolean; connections: LeadForwardView; max: number; tz: string };
export const getAutomations = () => call<AutomationsView>("/tenant/automations");
export const saveAutomations = (items: Automation[]) => call<AutomationsView>("/tenant/automations", { method: "PUT", body: { items } });
export const testAutomation = (item: Automation) => post<{ steps: { type: AutoAction["type"]; ok: boolean; note?: string }[] }>("/tenant/automations/test", { item });
export const testLeadForward = () => post<{ results: Partial<Record<"telegram" | "bitrix" | "webhook", string>> }>("/tenant/lead-forward/test");
/** "İndi saytda kim var": vidjet açıq olan ziyarətçilər (yalnız yaddaşda, 45 saniyə xəbər gəlməsə düşür) */
export type SiteVisitor = { pid: string; path: string; title: string; ref: string; lang: string; mobile: boolean; chat: "none" | "ai" | "live"; since: number; seen: number; pages: number; invited: boolean; /** AI söhbətinin ID-si (ziyarətçi AI ilə yazışırsa) */ sid?: string; /** saytı başqa vərəqdə açıq saxlayıb */ hidden?: boolean; tz?: string; first?: number; visits?: number };
// Bloklama (spam, təhqir)
export type BlockItem = { key: string; label: string; at: string; by: string };
export const getBlocks = () => call<{ items: BlockItem[] }>("/tenant/blocks");
export const blockLive = (chatId: string) => post<{ ok: true }>(`/tenant/live/${encodeURIComponent(chatId)}/block`);
export const blockVisitor = (pid: string) => post<{ ok: true }>(`/tenant/visitors/${pid}/block`);
export const unblock = (key: string) => call<{ ok: true }>(`/tenant/blocks/${encodeURIComponent(key)}`, { method: "DELETE" });
// Müştərilər: söhbətlər və müraciətlər bir kartda
export type Customer = { id: string; name: string; contacts: string[]; channels: ("site" | "telegram" | "whatsapp" | "form")[]; firstAt: string; lastAt: string; tags: string[]; blocked: boolean; csat: number | null;
  chats: { id: string; status: "open" | "closed"; channel: "site" | "telegram" | "whatsapp"; createdAt: string; count: number; first: string; tags: string[]; csat: number | null; assignee: string | null }[];
  leads: { id: string; at: string; status: string; question: string }[]; visitor: VisitorInfo | null };
export const getCustomers = (q = "") => call<{ items: Customer[] }>(`/tenant/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const getVisitors = () => call<{ enabled: boolean; items: SiteVisitor[] }>("/tenant/visitors");
export const inviteVisitor = (pid: string, text: string) => post<{ id: string }>(`/tenant/visitors/${pid}/invite`, { text });
/** Canlı söhbətdə ziyarətçinin göndərdiyi şəkil (panel proksisi ilə, sessiya cookie-si gedir) */
export const liveFileUrl = (chatId: string, fileId: string) => `/api/portal/tenant/live/${encodeURIComponent(chatId)}/files/${encodeURIComponent(fileId)}`;
/** Telegram/WhatsApp-da AI ilə gedən söhbətlər (son 14 gün; operatora ötürülübsə liveId) */
export type ChannelChat = {
  channel: "telegram" | "whatsapp"; chatId: string; sid: string; name: string; ref: string;
  /** WhatsApp nömrəsi (LID-li söhbətlərdə məlum olmaya bilər) */ phone?: string;
  /** köhnədən yeniyə bütün söhbət ID-ləri (fasilədən sonra yeni sid açılır) */ sids?: string[]; last: string; lastAnswer: string;
  messages: number; updatedAt: string; liveId: string | null; history: { role: "user" | "model"; text: string }[];
};
export const getChannelChats = (channel?: "telegram" | "whatsapp") =>
  call<{ items: ChannelChat[]; counts: { telegram: number; whatsapp: number }; enabled: { telegram: boolean; whatsapp: boolean } }>(`/tenant/channel-chats${channel ? `?channel=${channel}` : ""}`);
export const startLiveChat = (b: { channel: "telegram" | "whatsapp"; chatId: string; text: string }) => post<{ id: string; existing?: boolean }>("/tenant/live/start", b);
// Operator komandası (yalnız sahib)
export type TeamMember = { email: string; joined: boolean; addedAt: string };
export const getTeam = () => call<{ max: number; members: TeamMember[] }>("/tenant/team");
export const addTeamMember = (email: string) => post<{ ok: true }>("/tenant/team", { email });
export const removeTeamMember = (email: string) => call<{ ok: true }>(`/tenant/team/${encodeURIComponent(email)}`, { method: "DELETE" });
export const getLiveCount = () => call<{ enabled: boolean; openNow?: boolean; hasHours?: boolean; open: number; waiting: number }>("/tenant/live/count");
export const getLiveTicket = () => post<{ ticket: string; url: string }>("/tenant/live/ws-ticket");
/** Operatorun Telegram bildirişləri (platformanın bildiriş botu ilə, hər istifadəçi özü bağlayır) */
export type NotifyView = { available: boolean; botUsername: string | null; telegram: { name: string; at: string } | null };
export const getNotify = () => call<NotifyView>("/tenant/notify");
export const linkTelegramNotify = () => post<{ url: string; expiresInS: number }>("/tenant/notify/telegram");
export const unlinkTelegramNotify = () => call<NotifyView>("/tenant/notify/telegram", { method: "DELETE" });
export const getLiveList = (status: "open" | "closed") => call<{ items: LiveItem[]; csat?: { count: number; avg: number | null } }>(`/tenant/live?status=${status}`);
export const getLiveChat = (id: string) => call<{ chat: LiveChat }>(`/tenant/live/${id}`);
export const sendLive = (id: string, text: string) => post<{ total: number }>(`/tenant/live/${id}/messages`, { text });
/** Operatorun faylı: şəkil (2 MB) və ya PDF (4 MB), base64; text istəyə bağlı izahdır */
export const sendLiveFile = (id: string, f: { data: string; name: string; text?: string }) => post<{ total: number }>(`/tenant/live/${id}/files`, f);
export const closeLive = (id: string) => post<{ ok: true }>(`/tenant/live/${id}/close`);
export const deleteLive = (id: string) => call<{ ok: true }>(`/tenant/live/${id}`, { method: "DELETE" });
export type FeedbackSummary = { days: number; up: number; down: number; bad: { at: string; question: string; answer: string }[] };
export const getFeedback = (days = 30) => call<FeedbackSummary>(`/tenant/feedback?days=${days}`);

// Balans
export type BillingState = "ok" | "low" | "empty";
export type TopupRequest = { id: string; tenantId: string; amountAzn: number; status: "pending" | "approved" | "rejected"; provider: string; at: string;
  /** topup — köhnə balans yükləməsi; plan/pack — abunə sifarişi */
  kind?: "topup" | "plan" | "pack"; plan?: string; cycle?: PlanCycle; orderType?: "new" | "renew" | "upgrade"; pack?: string; replies?: number };

// Abunə planları
export const PLAN_FEATURES = ["channels", "live", "automations", "campaigns", "actions", "customerData", "noBranding"] as const;
export type PlanFeature = (typeof PLAN_FEATURES)[number];
export type PlanCycle = "month" | "year";
export type Plan = { id: string; name: string; priceAzn: number; replies: number; seats: number; features: Record<PlanFeature, boolean> };
export type PlanPack = { id: string; replies: number; priceAzn: number };
export type PlanCatalog = { plans: Plan[]; packs: PlanPack[]; yearlyMonths?: number; graceDays: number; packDays?: number };
export type Subscription = { plan: string; planName: string; cycle: PlanCycle; status: "active" | "grace" | "expired"; start: string; end: string; graceUntil: string;
  used: number; included: number; windowStart: string; windowEnd: string; next: string | null; nextName: string | null };
export type Entitlements = { source: "plan" | "trial" | "none"; plan: string | null; features: Record<PlanFeature, boolean>; seats: number };
export type OrderQuote = { kind: "plan" | "pack"; type?: "new" | "renew" | "upgrade"; plan?: string; cycle?: PlanCycle; pack?: string; replies?: number; amountAzn: number };
export type OrderInput = { kind: "plan" | "pack"; plan?: string; cycle?: PlanCycle; pack?: string };
export type Billing = {
  balance: { freeAzn: number; paidAzn: number; totalAzn: number };
  /** Yüklənmiş balansın partiyaları: hər yükləmənin qalığı və bitmə tarixi (bitməyə ən yaxın birinci). expiresAt null = müddətsiz */
  lots?: { amountAzn: number; leftAzn: number; at: string; expiresAt: string | null }[];
  /** Yükləmənin istifadə müddəti (gün), 0 = müddətsiz */
  expiryDays?: number;
  state: BillingState;
  allowance: { freeAzn: number; period: "monthly" | "once" };
  minTopupAzn: number; maxTopupAzn: number; lowAzn: number; enforced: boolean;
  spend: { monthAzn: number; monthRequests: number; last30Azn: number; last30Requests: number; avgPerRequestAzn: number | null; defaultAvgAzn: number; projectedMonthAzn: number | null;
    /** Təxmin üçün bir mesajın qiyməti: own = öz son 30 günü, platform = bütün müştərilərin real ortası, default = hələ heç bir tarixçə yoxdur */
    estimateAzn?: number; estimateSource?: "own" | "platform" | "default"; estimateRequests?: number };
  pendingRequests: TopupRequest[];
  catalog?: PlanCatalog;
  subscription?: Subscription | null;
  packs?: { left: number; expiresAt: string | null; at: string }[];
  packLeft?: number;
  entitlements?: Entitlements;
  /** Pulsuz sınaq: qalan və ümumi cavab, bitmə tarixi */
  trial?: { left: number; total: number; until: string | null; used: number } | null;
  days?: { date: string; spentAzn: number; requests: number }[];
  ledger?: { id: string; at: string; type: string; amountAzn: number; note: string }[];
  admin?: { markup: number | null; defaultMarkup: number; creditLimitAzn: number; costAzn30: number; lifetimeSpentAzn: number; dailyLimitAzn?: number | null; defaultDailyLimitAzn?: number; todayAzn?: number };
};
export const getBilling = () => call<Billing>("/tenant/billing");
export const quoteOrder = (o: OrderInput) => post<{ quote: OrderQuote }>("/tenant/billing/order?dryRun=1", o);
export const placeOrder = (o: OrderInput) => post<{ request: TopupRequest; provider: string; instructions?: string; checkoutUrl?: string }>("/tenant/billing/order", o);
export const setNextPlan = (plan: string | null) => post<{ subscription: Subscription | null }>("/tenant/billing/plan/next", { plan });
export const getEntitlements = () => call<Entitlements & { unlock: Record<PlanFeature, string | null> }>("/tenant/entitlements");
export const getPublicPlans = () => call<{ plans: Plan[]; packs: PlanPack[] }>("/plans");
export const adminGetPlans = () => call<PlanCatalog>("/admin/billing/plans");
export const adminSavePlans = (c: PlanCatalog) => call<PlanCatalog>("/admin/billing/plans", { method: "PUT", body: c });
export const adminAssignPlan = (tenantId: string, plan: string | null, days: number, note: string) => post<{ subscription: Subscription | null }>(`/admin/tenants/${tenantId}/billing/plan`, { plan, days, note });
export const requestTopup = (amountAzn: number) => post<{ request: TopupRequest; provider: string; instructions?: string; checkoutUrl?: string }>("/tenant/billing/topup-request", { amountAzn });

export type AdminTopupRequest = TopupRequest & { businessName: string; domain: string; email: string };
export const adminBillingRequests = (status = "pending") => call<{ requests: AdminTopupRequest[] }>(`/admin/billing/requests?status=${status}`);
export const adminResolveRequest = (id: string, action: "approve" | "reject") => post<{ request: TopupRequest }>(`/admin/billing/requests/${id}/${action}`);
export const adminTenantBilling = (tenantId: string) => call<Billing>(`/admin/tenants/${tenantId}/billing`);
/** 100 AZN və daha böyük məbləğ üçün confirmLarge=true lazımdır (əks halda CONFIRM_REQUIRED) */
export const adminTopup = (tenantId: string, amountAzn: number, note: string, confirmLarge = false) => post<{ balance?: { totalAzn: number } }>(`/admin/tenants/${tenantId}/billing/topup`, { amountAzn, note, ...(confirmLarge && { confirmLarge: true }) });
export const adminSetBranding = (tenantId: string, removed: boolean) => call<{ ok: true; brandRemoved: boolean }>(`/admin/tenants/${tenantId}/branding`, { method: "PATCH", body: { removed } });
export const adminBillingSettings = (tenantId: string, patch: { markup?: number | null; creditLimitAzn?: number; dailyLimitAzn?: number | null }) => call<unknown>(`/admin/tenants/${tenantId}/billing/settings`, { method: "PATCH", body: patch });

// Əməliyyatlar (yazma): AI istifadəçinin təsdiqi ilə sənin API-ndə əməliyyat icra edir
export type ActionParam = { name: string; type: "string" | "number" | "integer" | "boolean" | "enum"; description: string; required?: boolean; enum?: string[]; maxLength?: number; min?: number; max?: number };
export type ActionItem = {
  key: string; title: string; description: string; method: "POST" | "PUT" | "PATCH" | "DELETE"; path: string; params: ActionParam[];
  confirmText?: string; successMessage?: string; requireIdentity?: boolean; enabled?: boolean;
};
export type ActionsData = {
  configured: boolean; baseUrl?: string; auth?: { type: "header" | "bearer"; name?: string; hasSecret: boolean };
  items: ActionItem[]; signing: { configured: boolean; createdAt?: string | null }; identityReady?: boolean;
};
export type ActionsInput = { baseUrl: string; apiSecret?: string; auth?: { type: string; name?: string }; items: ActionItem[] };
export type ActionLogEntry = { id?: string; at: string; key: string; title: string; status: "done" | "failed" | "unknown" | "cancelled" | "expired" | "denied" | "test"; httpStatus?: number; subject?: string | null; channel?: string | null; params?: Record<string, string>; ms?: number };
export type ActionTestResult = { preview?: { method: string; url: string; headers: Record<string, string>; body: unknown }; sent?: boolean; status?: string; httpStatus?: number | null; message?: string; ms?: number };
export const getActions = () => call<ActionsData>("/tenant/actions");
export const saveActions = (b: ActionsInput) => call<ActionsData & { signingSecret?: string }>("/tenant/actions", { method: "PUT", body: b });
export const deleteActions = () => call<{ ok: true }>("/tenant/actions", { method: "DELETE" });
export const newSigningSecret = () => post<{ signingSecret: string }>("/tenant/actions/signing-secret");
export const testAction = (b: { key: string; params: Record<string, string>; send: boolean; userId?: string }) => post<ActionTestResult>("/tenant/actions/test", b);
export const getActionLog = () => call<{ entries: ActionLogEntry[] }>("/tenant/actions/log");
export const clearActionLog = () => call<{ ok: true }>("/tenant/actions/log", { method: "DELETE" });

export const addLiveNote = (id: string, text: string) => post<{ notes: LiveNote[] }>(`/tenant/live/${id}/notes`, { text });
export const setLiveTags = (id: string, tags: string[]) => call<{ tags: string[] }>(`/tenant/live/${id}/tags`, { method: "PUT", body: { tags } });
export type CannedReply = { id: string; title: string; text: string };
export const getCanned = () => call<{ items: CannedReply[] }>("/tenant/canned");
export const saveCanned = (items: { id?: string; title: string; text: string }[]) => call<{ items: CannedReply[] }>("/tenant/canned", { method: "PUT", body: { items } });
export const draftLive = (id: string) => post<{ draft: string }>(`/tenant/live/${id}/draft`);

/** Əməliyyat başına son 30 günün icra statistikası (status → say) */
export type ActionStats = { days: number; done: number; byKey: Record<string, Record<string, number>> };
export const getActionStats = () => call<ActionStats>("/tenant/actions/stats");

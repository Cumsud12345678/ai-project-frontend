import { isLocale, translate } from "./i18n";

export type Mode = "listings" | "support" | "both";
export type AutoRefresh = "off" | "daily" | "weekly";
export type Profile = { language?: string; tone?: string; maxResults?: number; extraInstructions?: string; logQueries?: boolean; generalKnowledge?: boolean; imageSearch?: boolean; mode?: Mode; fallbackMessage?: string; kbAutoRefresh?: AutoRefresh };
export type ConfigJson = { businessName?: string; domain?: string; profile?: Profile; source?: Record<string, unknown>; apiSecret?: string; /** CSV/JSON/XML faylının mətni (yalnız fayl ilə qoşulmada) */ feedText?: string };

export type WidgetSettings = { key: string; enabled: boolean; origins: string[]; title: string; greeting: string; color: string; theme?: "light" | "dark" | "auto"; logoUrl?: string | null; label: string; limits?: { perVisitorDay: number; siteHour: number }; live?: { enabled: boolean }; lastSeenAt?: string | null };
export type WidgetResponse = { widget: WidgetSettings; scriptUrl: string; domain: string };

export type Me = { email: string; role: "user" | "admin" };
export type TenantInfo = {
  tenantId: string; businessName: string; domain: string; config: ConfigJson;
  createdAt: string; updatedAt: string; keyRotatedAt: string | null;
};
export type TenantResponse = { tenant: TenantInfo | null; advisorUrl: string };

export type Listing = {
  id: string; title: string; price?: number | null; currency?: string | null; url?: string | null; image?: string | null;
  make?: string | null; model?: string | null; year?: number | null; volume?: number | null; power?: number | null; mileage?: number | null;
  bodyType?: string | null; city?: string | null; fuelType?: string | null; transmission?: string | null;
  attributes?: Record<string, string> | null;
};
export type Usage = { month: string; requests: number; tokens: number; limits: { monthlyRequests?: number; ratePerMinute?: number }; daily?: { date: string; requests: number }[] };
export type Source = { title: string; url?: string };
export type ChatMessage = { role: "user" | "model"; text: string; listings?: Listing[]; sources?: Source[]; unanswered?: boolean };
export type TestResult = { ok: boolean; sampleCount: number; sampleListings: Listing[]; supportedFilters: string[]; debug?: { dropped?: string[]; rawCount?: number } };

export type AdminUser = {
  id: string; email: string; verified: boolean; isAdmin: boolean; isOwner?: boolean; createdAt: string;
  tenant: { mode?: Mode; balance?: { totalAzn: number; paidAzn: number; spentAzn: number } | null; tenantId: string; businessName: string; domain: string; createdAt: string; keyRotatedAt: string | null } | null;
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
export const connectTelegram = (token: string) => call<TelegramStatus>("/tenant/channels/telegram", { method: "PUT", body: { token } });
export const setTelegramEnabled = (enabled: boolean) => call<TelegramStatus>("/tenant/channels/telegram", { method: "PATCH", body: { enabled } });
export const disconnectTelegram = () => call<{ ok: true }>("/tenant/channels/telegram", { method: "DELETE" });

// Kanallar (WhatsApp, QR ilə)
export type WhatsAppState = "off" | "connecting" | "qr" | "open" | "error" | "replaced";
export type WhatsAppStatus = { connected: boolean; enabled: boolean; phone: string | null; connectedAt: string | null; state: WhatsAppState; qr: string | null; error: string | null; pauseOnOwnReply: boolean; keyReady: boolean };
export const getWhatsApp = () => call<WhatsAppStatus>("/tenant/channels/whatsapp");
export const connectWhatsApp = () => call<WhatsAppStatus>("/tenant/channels/whatsapp/connect", { method: "POST", body: { ack: true } });
export const patchWhatsApp = (patch: { enabled?: boolean; pauseOnOwnReply?: boolean }) => call<WhatsAppStatus>("/tenant/channels/whatsapp", { method: "PATCH", body: patch });
export const disconnectWhatsApp = () => call<{ ok: true }>("/tenant/channels/whatsapp", { method: "DELETE" });

// Hesab
export const register = (email: string, password: string) => post<{ ok: true }>("/auth/register", { email, password });
export const verify = (email: string, code: string) => post<Me>("/auth/verify", { email, code });
export const resend = (email: string) => post<{ ok: true }>("/auth/resend", { email });
export const login = (email: string, password: string) => post<Me>("/auth/login", { email, password });
export const logout = () => post<{ ok: true }>("/auth/logout");
export const forgot = (email: string) => post<{ ok: true }>("/auth/forgot", { email });
export const resetPassword = (email: string, code: string, password: string) => post<{ ok: true }>("/auth/reset", { email, code, password });
export const getMe = () => call<Me>("/auth/me");
export const deleteMyAccount = (password: string) => post<{ ok: true }>("/auth/delete-account", { password });

// Müştəri paneli
export const getTenant = () => call<TenantResponse>("/tenant");
export const testConfig = (config: ConfigJson) => post<TestResult>("/tenant/config/test", { config });
export const activate = (config: ConfigJson) => post<{ apiKey: string; tenant: TenantInfo; sampleListings: Listing[] }>("/tenant", { config });
export const updateConfig = (config: ConfigJson) => call<{ tenant: TenantInfo; sampleListings: Listing[] }>("/tenant/config", { method: "PUT", body: { config } });
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
export const uploadWidgetLogo = (data: string) => call<WidgetResponse>("/tenant/widget/logo", { method: "PUT", body: { data } });
export const deleteWidgetLogo = () => call<WidgetResponse>("/tenant/widget/logo", { method: "DELETE" });
export const saveWidget = (patch: Partial<Omit<WidgetSettings, "key">>) => call<WidgetResponse>("/tenant/widget", { method: "PUT", body: patch });
export const rotateWidgetKey = () => post<WidgetResponse>("/tenant/widget/rotate");
export const getUsage = () => call<Usage>("/tenant/usage");
export const getListings = (q: Record<string, string>) =>
  call<{ count: number; listings: Listing[] }>(`/tenant/listings?${new URLSearchParams(Object.entries(q).filter(([, v]) => v))}`);
export const chat = (message: string, history: ChatMessage[]) =>
  post<{ answer: string; listings: Listing[]; sources?: Source[]; unanswered?: boolean; usage?: { tokens: number }; billing?: { billedAzn?: number; balanceAzn?: number } }>("/tenant/chat", { message, history: history.map(({ role, text }) => ({ role, text })) });

// Admin
export const adminUsers = () => call<{ users: AdminUser[] }>("/admin/users");
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

export type AdminOverview = {
  users: { total: number; verified: number; admins: number; last7d: number; last30d: number };
  tenants: { total: number; modes: Record<string, number>; widgetActive7d: number; emptyBalance: number };
  usage: { today: UsagePoint & { date: string }; thisMonth: UsagePoint & { month: string }; lastMonth: UsagePoint & { month: string } } | null;
  pendingTopups: number; revenueAzn: number;
  errors: { last24h: number; last7d: number };
  signups: { date: string; users: number }[];
  topTenants: { tenantId: string; businessName: string; requests: number; tokens: number }[];
};
export const adminOverview = () => call<AdminOverview>("/admin/overview");
export type AdminHealth = {
  database: { ok: boolean; ms: number; error?: string }; ai: { ok: boolean; ms: number; error?: string };
  mail: { configured: boolean; from: string }; server: { uptimeSec: number; node: string; memoryMb: number; production: boolean };
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
export const adminAudit = () => call<{ items: AuditItem[] }>("/admin/audit");
export type Announcement = { text: string; level: "info" | "warn" | "critical"; active: boolean; updatedAt: string; by: string };
export const adminAnnouncement = () => call<{ announcement: Announcement | null }>("/admin/announcement");
export const adminSetAnnouncement = (a: { text: string; level: Announcement["level"]; active: boolean }) => call<{ announcement: Announcement }>("/admin/announcement", { method: "PUT", body: a });
export const adminDeleteAnnouncement = () => call<{ ok: true }>("/admin/announcement", { method: "DELETE" });
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
export type ConversationMsg = { id: string; at: string; message: string; answer: string | null; results: number; error: boolean; costAzn: number | null };
export const getConversations = (q: { days?: number; limit?: number; before?: string | null }) => {
  const p = new URLSearchParams();
  if (q.before) p.set("before", q.before);
  if (q.days) p.set("days", String(q.days));
  if (q.limit) p.set("limit", String(q.limit));
  return call<ConversationList>(`/tenant/conversations${p.size ? `?${p}` : ""}`);
};
export const getConversation = (sid: string) => call<{ sid: string; messages: ConversationMsg[] }>(`/tenant/conversations/${encodeURIComponent(sid)}`);
export type Funnel = { days: number; conversations: number | null; questions: number; answered: number; unanswered: number; live: number; leads: number; leadsHandled: number; handoffs: number; handoffRate: number | null; handledRate: number | null; costAzn: number | null };
export const getFunnel = (days: number) => call<Funnel>(`/tenant/funnel?days=${days}`);
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
  id: string; type: "file" | "url" | "site" | "text" | "qa"; name: string; url: string | null; status: "processing" | "ready" | "failed"; error: string | null;
  chunks: number; chars: number; pages: number; size: number | null; createdAt: string; lastIndexedAt: string | null; lastRefreshAt?: string | null; refreshError?: string | null; questions?: string[]; answer?: string;
};
export type KbInfo = {
  mode: Mode; autoRefresh?: AutoRefresh; fallbackMessage: string; defaultFallback: string; sources: KbSource[];
  limits: { sources: number; chunks: number; fileBytes: number; qa?: number; qaQuestions?: number; qaQuestionChars?: number; qaAnswerChars?: number }; totals: { sources: number; chunks: number; qa?: number };
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
export const kbAddUrl = (url: string, crawl: boolean) => post<{ source: KbSource }>("/tenant/kb/urls", { url, crawl });
export const kbAddText = (title: string, text: string) => post<{ source: KbSource }>("/tenant/kb/texts", { title, text });
export const kbAddQa = (questions: string[], answer: string) => post<{ source: KbSource }>("/tenant/kb/qa", { questions, answer });
export const kbUpdateQa = (id: string, questions: string[], answer: string) => call<{ source: KbSource }>(`/tenant/kb/qa/${id}`, { method: "PUT", body: { questions, answer } });
export const kbRefresh = (id: string) => post<{ source: KbSource }>(`/tenant/kb/sources/${id}/refresh`);
export const kbDelete = (id: string) => call<{ ok: true }>(`/tenant/kb/sources/${id}`, { method: "DELETE" });

export type UnansweredRow = { id: string; at: string; message: string; reason?: string };
export type LeadRow = { id: string; at: string; name: string; contact: string; question: string; conversation?: { role: "user" | "model"; text: string }[]; handled: boolean };
export const getUnanswered = () => call<{ total: number; items: UnansweredRow[] }>("/tenant/kb/unanswered");
export const deleteUnanswered = (id: string) => call<{ ok: true }>(`/tenant/kb/unanswered/${id}`, { method: "DELETE" });
export const getLeads = () => call<{ total: number; open: number; items: LeadRow[] }>("/tenant/kb/leads");
export const setLeadHandled = (id: string, handled: boolean) => call<{ lead: LeadRow }>(`/tenant/kb/leads/${id}`, { method: "PATCH", body: { handled } });
export const deleteLead = (id: string) => call<{ ok: true }>(`/tenant/kb/leads/${id}`, { method: "DELETE" });

// İlk səhifə: quraşdırma, diqqət tələb edənlər, keyfiyyət
export type Overview = {
  mode: Mode;
  setup: { dataReady: boolean; dataCount: number; widgetInstalled: boolean; widgetEnabled: boolean; firstQuestion: boolean; queriesLogged: boolean };
  attention: { kind: "widgetOff" | "live" | "leads" | "unanswered" | "sourceErrors" | "noResults"; count: number }[];
  quality: { total: number; noResults: number; errors: number; answerRate: number | null; handoffs: number | null };
  top: { message: string; count: number }[];
  limits?: { perVisitorDay: number; siteHour: number };
  live?: { enabled: boolean; open: number; waiting: number };
  feedback?: { up: number; down: number };
  billing?: { state: BillingState; balanceAzn: number; freeAzn: number; paidAzn: number; monthAzn: number; enforced: boolean } | null;
};
export const getOverview = () => call<Overview>("/tenant/overview");

// Canlı operator söhbəti və cavablara rəy
export type LiveMsg = { from: "visitor" | "operator" | "system"; text: string; at: string };
export type LiveItem = { id: string; channel?: "telegram" | "whatsapp" | null; name: string; contact: string; status: "open" | "closed"; createdAt: string; updatedAt: string; count: number; waiting: boolean; last: LiveMsg | null };
export type LiveChat = { id: string; channel?: "telegram" | "whatsapp" | null; name: string; contact: string; status: "open" | "closed"; context: { role: "user" | "model"; text: string }[]; messages: LiveMsg[]; createdAt: string };
export const getLiveCount = () => call<{ enabled: boolean; open: number; waiting: number }>("/tenant/live/count");
export const getLiveTicket = () => post<{ ticket: string; url: string }>("/tenant/live/ws-ticket");
export const getLiveList = (status: "open" | "closed") => call<{ items: LiveItem[] }>(`/tenant/live?status=${status}`);
export const getLiveChat = (id: string) => call<{ chat: LiveChat }>(`/tenant/live/${id}`);
export const sendLive = (id: string, text: string) => post<{ total: number }>(`/tenant/live/${id}/messages`, { text });
export const closeLive = (id: string) => post<{ ok: true }>(`/tenant/live/${id}/close`);
export type FeedbackSummary = { days: number; up: number; down: number; bad: { at: string; question: string; answer: string }[] };
export const getFeedback = (days = 30) => call<FeedbackSummary>(`/tenant/feedback?days=${days}`);

// Balans
export type BillingState = "ok" | "low" | "empty";
export type TopupRequest = { id: string; tenantId: string; amountAzn: number; status: "pending" | "approved" | "rejected"; provider: string; at: string };
export type Billing = {
  balance: { freeAzn: number; paidAzn: number; totalAzn: number };
  state: BillingState;
  allowance: { freeAzn: number; period: "monthly" | "once" };
  minTopupAzn: number; maxTopupAzn: number; lowAzn: number; enforced: boolean;
  spend: { monthAzn: number; monthRequests: number; last30Azn: number; last30Requests: number; avgPerRequestAzn: number | null; defaultAvgAzn: number; projectedMonthAzn: number | null };
  pendingRequests: TopupRequest[];
  days?: { date: string; spentAzn: number; requests: number }[];
  ledger?: { id: string; at: string; type: string; amountAzn: number; note: string }[];
  admin?: { markup: number | null; defaultMarkup: number; creditLimitAzn: number; costAzn30: number; lifetimeSpentAzn: number };
};
export const getBilling = () => call<Billing>("/tenant/billing");
export const requestTopup = (amountAzn: number) => post<{ request: TopupRequest; provider: string; instructions?: string; checkoutUrl?: string }>("/tenant/billing/topup-request", { amountAzn });

export type AdminTopupRequest = TopupRequest & { businessName: string; domain: string; email: string };
export const adminBillingRequests = (status = "pending") => call<{ requests: AdminTopupRequest[] }>(`/admin/billing/requests?status=${status}`);
export const adminResolveRequest = (id: string, action: "approve" | "reject") => post<{ request: TopupRequest }>(`/admin/billing/requests/${id}/${action}`);
export const adminTenantBilling = (tenantId: string) => call<Billing>(`/admin/tenants/${tenantId}/billing`);
export const adminTopup = (tenantId: string, amountAzn: number, note: string) => post<{ balance?: { totalAzn: number } }>(`/admin/tenants/${tenantId}/billing/topup`, { amountAzn, note });
export const adminBillingSettings = (tenantId: string, patch: { markup?: number | null; creditLimitAzn?: number }) => call<unknown>(`/admin/tenants/${tenantId}/billing/settings`, { method: "PATCH", body: patch });

import { isLocale, translate } from "./i18n";

export type Mode = "listings" | "support" | "both";
export type Profile = { language?: string; tone?: string; maxResults?: number; extraInstructions?: string; logQueries?: boolean; generalKnowledge?: boolean; mode?: Mode; fallbackMessage?: string };
export type ConfigJson = { businessName?: string; domain?: string; profile?: Profile; source?: Record<string, unknown>; apiSecret?: string };

export type WidgetSettings = { key: string; enabled: boolean; origins: string[]; title: string; greeting: string; color: string; label: string; limits?: { perVisitorDay: number; siteHour: number }; live?: { enabled: boolean }; lastSeenAt?: string | null };
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
export const saveProfile = (profile: Profile) => call<{ profile: Profile }>("/tenant/profile", { method: "PATCH", body: profile });
export const rotateMyKey = () => post<{ apiKey: string }>("/tenant/key/rotate");
export const getWidget = () => call<WidgetResponse>("/tenant/widget");
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

// Sayt istifadəçilərinin sualları
export type QueryRow = { id: string; at: string; message: string; results: number; tokens: number; cached: boolean; error: boolean; costAzn?: number | null };
export type QueryList = { enabled: boolean; retentionDays: number; hasMore: boolean; nextCursor: string | null; queries: QueryRow[] };
export type QueryStats = { enabled: boolean; days: number; total: number; noResults: number; errors: number; cached: number; top: { message: string; count: number }[]; topNoResults: { message: string; count: number }[]; truncated?: boolean };
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
export const clearQueries = () => call<{ ok: true }>("/tenant/queries", { method: "DELETE" });

// Bilik bazası (dəstək botu)
export type KbSource = {
  id: string; type: "file" | "url" | "site" | "text"; name: string; url: string | null; status: "processing" | "ready" | "failed"; error: string | null;
  chunks: number; chars: number; pages: number; size: number | null; createdAt: string; lastIndexedAt: string | null;
};
export type KbInfo = {
  mode: Mode; fallbackMessage: string; defaultFallback: string; sources: KbSource[];
  limits: { sources: number; chunks: number; fileBytes: number }; totals: { sources: number; chunks: number };
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
export type LiveItem = { id: string; name: string; contact: string; status: "open" | "closed"; createdAt: string; updatedAt: string; count: number; waiting: boolean; last: LiveMsg | null };
export type LiveChat = { id: string; name: string; contact: string; status: "open" | "closed"; context: { role: "user" | "model"; text: string }[]; messages: LiveMsg[]; createdAt: string };
export const getLiveCount = () => call<{ enabled: boolean; open: number; waiting: number }>("/tenant/live/count");
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

// Vizual API qoşulması (sehirbaz) üçün təmiz məntiq: formadan konfiqurasiya qurmaq və geri oxumaq.
// UI-dan ayrıdır ki, tsx ilə sınamaq olsun. Son yoxlama həmişə serverdədir (ai-server validateConfig).
import type { ConfigJson } from "./api";
import type { T } from "./i18n";
import { getPath, type Analysis } from "./sample-analyzer";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

export type AuthType = "none" | "bearer" | "header" | "query";
export type FilterKind = "text" | "string" | "number" | "range" | "boolean";
export type FilterRow = {
  key: string; label: string; kind: FilterKind; on: boolean; custom?: boolean;
  param: string; minParam: string; maxParam: string;
  /** API ad yox ID gözləyir: siyahı ünvanı və sahələr */
  vocab: boolean; vocabPath: string; vocabItems: string; vocabId: string; vocabName: string;
};
export type BuilderState = {
  url: string; method: "GET" | "POST"; authType: AuthType; authName: string;
  itemsPath: string; fields: Record<string, string>; currency: string; attrs: { label: string; path: string }[];
  filters: FilterRow[]; limitParam: string;
  /** Redaktədə: saxlanmış mənbənin əsli. Formanın idarə etmədiyi ayarlar (qiymət bölmə, çeşidləmə, timeout...) itməsin deyə saxlanır */
  orig?: Obj;
};

/** Kartda göstərilən əsas sahələr (ai-server PUBLIC_FIELDS-dən) */
export const CORE_FIELDS = ["title", "price", "id", "image", "url", "currency", "make", "model", "year", "city", "mileage"] as const;
export const REQUIRED_FIELDS = ["id", "title", "price"];

export const row = (key: string, label: string, kind: FilterKind, extra: Partial<FilterRow> = {}): FilterRow => ({
  key, label, kind, on: false, param: "", minParam: "", maxParam: "", vocab: false, vocabPath: "", vocabItems: "", vocabId: "id", vocabName: "name", ...extra,
});

/** Tanınan sahələrə görə təklif olunan filtrlər. Parametr adlarını müştəri yazır (hər API-də fərqlidir). */
export function suggestFilters(fields: Record<string, string>, t: T): FilterRow[] {
  const out: FilterRow[] = [row("keywords", t("Açar sözlə axtarış"), "text"), row("price", t("Qiymət"), "range")];
  const add: [string, string, FilterKind][] = [
    ["make", t("Marka"), "string"], ["model", t("Model"), "string"], ["city", t("Şəhər"), "string"], ["year", t("Buraxılış ili"), "range"],
    ["mileage", t("Yürüş"), "range"], ["bodyType", t("Kateqoriya"), "string"], ["fuelType", t("Yanacaq növü"), "string"], ["transmission", t("Sürətlər qutusu"), "string"],
  ];
  for (const [k, label, kind] of add) if (fields[k]) out.push(row(k, label, kind));
  return out;
}

/** Ünvandakı sorğu parametrləri (məs. ?brand=&limit=10): filtr parametrləri üçün ipucu */
export function urlParams(url: string): string[] {
  try { return [...new URL(url).searchParams.keys()]; } catch { return []; }
}

/** Elanın bütün sadə sahələri (yol → nümunə): sahə seçimi üçün */
export function leafPaths(item: unknown, prefix = "", depth = 0, out: { path: string; example: string }[] = []) {
  if (item === null || item === undefined || out.length > 120) return out;
  if (typeof item !== "object") { if (prefix) out.push({ path: prefix, example: String(item).slice(0, 40) }); return out; }
  if (depth >= 3) return out;
  if (Array.isArray(item)) { if (item.length) leafPaths(item[0], `${prefix}[0]`, depth + 1, out); return out; }
  for (const [k, v] of Object.entries(item)) leafPaths(v, prefix ? `${prefix}.${k}` : k, depth + 1, out);
  return out;
}

/** Cavabdakı elan siyahısı */
export function itemsOf(json: unknown, itemsPath: string): Obj[] {
  const v = !itemsPath || itemsPath === "." ? json : getPath(json, itemsPath);
  return Array.isArray(v) ? v.filter(isObj) : [];
}

/** Şablon və ya yol ilə dəyər: "{brand.name} {model.name?}" və ya "price" */
export function resolveField(item: unknown, spec: string): string {
  if (!spec) return "";
  if (spec.includes("{")) return spec.replace(/\{([^}?]+)\??\}/g, (_, p: string) => String(getPath(item, p) ?? "")).replace(/\s+/g, " ").trim();
  const v = getPath(item, spec);
  return v === undefined || v === null || typeof v === "object" ? "" : String(v);
}

/** Analizdən ilkin vəziyyət (əvvəlcədən doldurulmuş sahələr qorunur) */
export function fromAnalysis(prev: BuilderState, a: Analysis, t: T): BuilderState {
  const fields = { ...a.fields, ...Object.fromEntries(Object.entries(prev.fields).filter(([, v]) => v)) };
  // Redaktədə saxlanmış filtrlər qalır, yeni tanınan sahələr üçün təkliflər altına əlavə olunur
  const filters = [...prev.filters, ...suggestFilters(fields, t).filter((x) => !prev.filters.some((f) => f.key === x.key))];
  return {
    ...prev, fields, filters,
    itemsPath: a.itemsPath ?? (a.single ? prev.itemsPath : "."),
    attrs: prev.attrs.length ? prev.attrs : a.attributes.slice(0, 5).map(({ label, path }) => ({ label, path })),
  };
}

const ERR = (e: string) => ({ error: e });

/** Formadan konfiqurasiya. Səhv varsa { error } */
export function buildSource(s: BuilderState, t: T): { source: Obj } | { error: string } {
  let u: URL;
  try { u = new URL(s.url.trim()); } catch { return ERR(t("API ünvanı düzgün deyil. Tam yaz: https://api.saytim.az/elanlar")); }
  if (u.protocol !== "https:") return ERR(t("API ünvanı https:// ilə olmalıdır."));
  if (s.authType === "query" && s.authName) u.searchParams.delete(s.authName); // açar linkdə saxlanmır
  const o = s.orig ?? {};
  const oSearch = isObj(o.search) ? o.search : {};
  const oResp = isObj(o.response) ? o.response : {};
  const oFields = isObj(oResp.fields) ? oResp.fields : {};
  const oFilters = isObj(o.filters) ? o.filters : {};
  const oVocab = isObj(o.vocabulary) ? o.vocabulary : {};
  const oLists = isObj(oVocab.lists) ? oVocab.lists : {};
  for (const f of REQUIRED_FIELDS) if (!s.fields[f] && !isObj(oFields[f])) return ERR(t("“{f}” sahəsini seç: elan kartı üçün lazımdır.", { f: f }));

  const fields: Obj = {};
  // JSON-da obyekt kimi yazılmış sahələr (məs. { path, divide: 100 }) formada seçilməyibsə olduğu kimi qalır
  for (const [k, v] of Object.entries(oFields)) if (k !== "attributes" && isObj(v)) fields[k] = v;
  for (const [k, v] of Object.entries(s.fields)) if (v.trim()) fields[k] = v.trim();
  const oAttrs = isObj(oFields.attributes) ? oFields.attributes : {};
  const attrs: Obj = Object.fromEntries(Object.entries(oAttrs).filter(([, v]) => isObj(v)));
  for (const a of s.attrs) if (a.label.trim() && a.path.trim()) attrs[a.label.trim()] = a.path.trim();
  if (Object.keys(attrs).length) fields.attributes = attrs;

  const filters: Obj = {};
  const lists: Obj = {};
  for (const k of ["sort", "limit"]) if (oFilters[k] !== undefined) filters[k] = oFilters[k];
  // Formanın göstərmədiyi incə ayarlar (multiply, valueMap, values...) köhnə qaydadan götürülür
  const extras = (key: string): Obj => {
    const r = oFilters[key];
    if (!isObj(r)) return {};
    const { type: _t, description: _d, param: _p, minParam: _a, maxParam: _b, valueFrom: _v, ...rest } = r;
    return rest;
  };
  for (const f of s.filters.filter((x) => x.on)) {
    const description = f.label.trim();
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,29}$/.test(f.key)) return ERR(t("Filtrin açarı yalnız latın hərfi və rəqəm ola bilər: {k}", { k: f.key }));
    if (description.length < 3) return ERR(t("Filtrin adı ən azı 3 hərf olmalıdır: {k}", { k: f.key }));
    if (f.kind === "range") {
      if (!f.minParam.trim() && !f.maxParam.trim()) return ERR(t("“{l}” üçün ən azı bir parametr yaz (ən az və ya ən çox).", { l: description }));
      filters[f.key] = { ...extras(f.key), type: "range", description, ...(f.minParam.trim() && { minParam: f.minParam.trim() }), ...(f.maxParam.trim() && { maxParam: f.maxParam.trim() }) };
      continue;
    }
    if (!f.param.trim()) return ERR(t("“{l}” üçün API parametrinin adını yaz.", { l: description }));
    const rule: Obj = { ...extras(f.key), type: f.kind, description, param: f.param.trim() };
    if (f.kind === "boolean" && !rule.valueMap) rule.valueMap = { true: "true" }; // yalnız "bəli" göndərilir: "xeyr" bütün elanları süzməsin
    if (f.vocab && f.kind === "string") {
      if (!f.vocabPath.trim().startsWith("/") && !oVocab.path) return ERR(t("“{l}”: siyahı ünvanı / ilə başlamalıdır (məs. /api/brands).", { l: description }));
      rule.valueFrom = "vocabulary";
      lists[f.key] = { ...(isObj(oLists[f.key]) ? oLists[f.key] as Obj : {}), path: f.vocabPath.trim(), ...(f.vocabItems.trim() && { itemsPath: f.vocabItems.trim() }), idField: f.vocabId.trim() || "id", nameField: f.vocabName.trim() || "name" };
    }
    filters[f.key] = rule;
  }

  const { limitParam: _lp, ...searchRest } = oSearch;
  const oDefaults = isObj(oResp.defaults) ? oResp.defaults : {};
  const defaults = { ...oDefaults, ...(s.currency.trim() && !s.fields.currency && !isObj(fields.currency) && { currency: s.currency.trim().toUpperCase() }) };
  const { auth: _au, filters: _fi, vocabulary: _vo, ...oRest } = o;
  const source: Obj = {
    ...oRest,
    type: "rest",
    baseUrl: u.origin,
    search: { ...searchRest, method: s.method, path: `${u.pathname}${u.search}`, ...(s.limitParam.trim() && { limitParam: s.limitParam.trim() }) },
    response: { ...oResp, itemsPath: s.itemsPath || ".", ...(Object.keys(defaults).length && { defaults }), fields },
  };
  if (!Object.keys(defaults).length) delete (source.response as Obj).defaults;
  if (s.authType !== "none") source.auth = { type: s.authType, ...((s.authType === "header" || s.authType === "query") && { name: s.authName.trim() }) };
  if (Object.keys(filters).length) source.filters = filters;
  if (Object.keys(lists).length) source.vocabulary = { ...(typeof oVocab.path === "string" && { path: oVocab.path }), lists };
  return { source };
}

/** Saxlanmış konfiqurasiyadan formaya (redaktə üçün). Mürəkkəb sahələr (obyekt spesifikasiyalar) toxunulmur. */
export function fromConfig(cfg: ConfigJson | undefined, base: BuilderState): BuilderState {
  const src = cfg?.source;
  if (!isObj(src) || src.type !== "rest" || typeof src.baseUrl !== "string") return base;
  const search = isObj(src.search) ? src.search : {};
  const resp = isObj(src.response) ? src.response : {};
  const auth = isObj(src.auth) ? src.auth : {};
  const rawFields = isObj(resp.fields) ? resp.fields : {};
  const fields = Object.fromEntries(Object.entries(rawFields).filter(([k, v]) => k !== "attributes" && typeof v === "string")) as Record<string, string>;
  const attrs = isObj(rawFields.attributes) ? Object.entries(rawFields.attributes).filter(([, v]) => typeof v === "string").map(([label, path]) => ({ label, path: path as string })) : [];
  const lists = isObj(src.vocabulary) && isObj((src.vocabulary as Obj).lists) ? ((src.vocabulary as Obj).lists as Obj) : {};
  const filters: FilterRow[] = Object.entries(isObj(src.filters) ? src.filters : {}).filter(([k, v]) => k !== "sort" && k !== "limit" && isObj(v)).map(([k, v]) => {
    const r = v as Obj;
    const l = isObj(lists[k]) ? (lists[k] as Obj) : null;
    const kind = (["text", "string", "number", "range", "boolean"].includes(String(r.type)) ? r.type : "string") as FilterKind;
    return row(k, String(r.description ?? k), kind, {
      on: true, param: String(r.param ?? ""), minParam: String(r.minParam ?? ""), maxParam: String(r.maxParam ?? ""),
      vocab: r.valueFrom === "vocabulary", vocabPath: String(l?.path ?? ""), vocabItems: String(l?.itemsPath ?? ""), vocabId: String(l?.idField ?? "id"), vocabName: String(l?.nameField ?? "name"),
    });
  });
  const defaults = isObj(resp.defaults) ? resp.defaults : {};
  return {
    ...base,
    url: `${src.baseUrl.replace(/\/$/, "")}${typeof search.path === "string" ? search.path : ""}`,
    method: String(search.method ?? "GET").toUpperCase() === "POST" ? "POST" : "GET",
    authType: (["bearer", "header", "query"].includes(String(auth.type)) ? auth.type : "none") as AuthType,
    authName: typeof auth.name === "string" ? auth.name : base.authName,
    itemsPath: typeof resp.itemsPath === "string" ? resp.itemsPath : ".",
    fields, attrs, filters,
    currency: typeof defaults.currency === "string" ? defaults.currency : base.currency,
    limitParam: typeof search.limitParam === "string" ? search.limitParam : "",
    orig: JSON.parse(JSON.stringify(src)) as Obj,
  };
}

/** Saxlanmış konfiqurasiyada sahə JSON-da xüsusi (obyekt) kimi yazılıb: formada "JSON ayarı saxlanır" görünür */
export function lockedField(s: BuilderState, k: string): boolean {
  const r = isObj(s.orig?.response) ? (s.orig!.response as Obj) : {};
  const f = isObj(r.fields) ? (r.fields as Obj) : {};
  return isObj(f[k]) && !s.fields[k];
}

/** Forma kifayət qədər doludur: cavab gətirmədən də filtr və yoxlama addımlarına keçmək olar (redaktə) */
export const prefilled = (s: BuilderState) => Boolean(s.url) && REQUIRED_FIELDS.every((f) => s.fields[f] || lockedField(s, f));

/** Filtr sınağı üçün dəyər açarı: aralıq "price" → "priceMax" (yoxdursa "priceMin") */
export function testKey(f: FilterRow): string {
  if (f.kind !== "range") return f.key;
  return f.maxParam.trim() ? `${f.key}Max` : `${f.key}Min`;
}

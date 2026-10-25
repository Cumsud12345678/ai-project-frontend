// Konfiqurasiya JSON-unu əl ilə yazmadan düzəltmək və yoxlamaq üçün sadə köməkçilər.
// Qaydalar AI servisindəki (filters.js) ilə eynidir; son söz həmişə serverdədir, bura yalnız tez geri bildirimdir.
import type { ConfigJson } from "./api";
import { translate, type T } from "./i18n";

// t verilməsə mesajlar Azərbaycan dilində qalır (testlər və server tərəfi üçün)
const AZ: T = (k, v) => translate("az", k, v);

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const FILTER_KINDS = [
  { value: "string", label: "Mətn (dəqiq dəyər)", hint: "məs. rəng, şəhər, marka" },
  { value: "number", label: "Rəqəm", hint: "məs. maksimum yürüş" },
  { value: "range", label: "Aralıq (ən az – ən çox)", hint: "məs. il, həcm" },
  { value: "boolean", label: "Bəli / xeyr", hint: "məs. zəmanət, kredit" },
  { value: "multi", label: "Bir neçə dəyər", hint: "məs. bir neçə rəng eyni anda" },
  { value: "text", label: "Açar sözlərlə axtarış", hint: "təsvirə görə axtarış, yalnız bir dənə ola bilər" },
] as const;
export type FilterKind = (typeof FILTER_KINDS)[number]["value"];

export type FilterDraft = {
  name: string; kind: FilterKind; description: string;
  param: string; minParam: string; maxParam: string;
  vocabulary: boolean; vocabPath: string; vocabItems: string; vocabId: string; vocabName: string;
};
export const emptyDraft: FilterDraft = {
  name: "", kind: "string", description: "", param: "", minParam: "", maxParam: "",
  vocabulary: false, vocabPath: "", vocabItems: "", vocabId: "id", vocabName: "name",
};

const KEY_RE = /^[a-zA-Z][a-zA-Z0-9]{0,29}$/;
const PARAM_RE = /^[A-Za-z0-9_.\-[\]]{1,60}$/;
const RESERVED = ["sort", "limit", "sortBy", "sortDir"];
const MAX_FILTERS = 15;

const source = (c: ConfigJson): Obj => (isObj(c.source) ? c.source : {});
const filtersOf = (c: ConfigJson): Obj => (isObj(source(c).filters) ? (source(c).filters as Obj) : {});

export type Edit = { config: ConfigJson } | { error: string };

/** Yeni filtri JSON-a əlavə edir (lazım olsa vocabulary siyahısını da). */
export function addFilter(config: ConfigJson, d: FilterDraft, t: T = AZ): Edit {
  const name = d.name.trim();
  const description = d.description.trim();
  if (!KEY_RE.test(name)) return { error: t("Ad yalnız latın hərfi və rəqəmdən ibarət olmalıdır, hərflə başlamalıdır (məs. color, fuelType).") };
  if (RESERVED.includes(name)) return { error: t("“{name}” ayrılmış sözdür, başqa ad seç.", { name }) };
  if (name in filtersOf(config)) return { error: t("“{name}” filtri artıq var. Onu JSON-da dəyiş və ya başqa ad seç.", { name }) };
  if (Object.keys(filtersOf(config)).filter((k) => k !== "sort" && k !== "limit").length >= MAX_FILTERS) return { error: t("Ən çox {n} filtr ola bilər (AI-nın dəqiqliyi üçün).", { n: MAX_FILTERS }) };
  if (description.length < 3 || description.length > 200) return { error: t("Təsvir 3-200 simvol olmalıdır. AI filtri bu cümləyə görə başa düşür.") };
  if (d.kind === "text" && Object.values(filtersOf(config)).some((f) => isObj(f) && f.type === "text")) return { error: t("Açar sözlərlə axtarış filtri artıq var, yalnız biri ola bilər.") };

  const rule: Obj = { type: d.kind, description };
  if (d.kind === "range") {
    const lo = d.minParam.trim(), hi = d.maxParam.trim();
    if (!lo && !hi) return { error: t("“Ən az” və ya “ən çox” üçün API parametrinin adını yaz.") };
    if ((lo && !PARAM_RE.test(lo)) || (hi && !PARAM_RE.test(hi))) return { error: t("Parametr adında yalnız hərf, rəqəm və _ . - [ ] ola bilər.") };
    if (lo) rule.minParam = lo;
    if (hi) rule.maxParam = hi;
  } else {
    const p = d.param.trim();
    if (!PARAM_RE.test(p)) return { error: t("API parametrinin adını yaz (məs. color_id). Yalnız hərf, rəqəm və _ . - [ ] ola bilər.") };
    rule.param = p;
  }

  const next = clone(config);
  const src = (isObj(next.source) ? next.source : (next.source = {})) as Obj;
  if (d.vocabulary) {
    if (d.kind !== "string" && d.kind !== "multi") return { error: t("Siyahıdan çevirmə yalnız “Mətn” və “Bir neçə dəyər” tipində olur.") };
    const list: Obj = { idField: d.vocabId.trim() || "id", nameField: d.vocabName.trim() || "name" };
    if (d.vocabItems.trim()) list.itemsPath = d.vocabItems.trim();
    const vocab = (isObj(src.vocabulary) ? src.vocabulary : (src.vocabulary = {})) as Obj;
    const vp = d.vocabPath.trim();
    if (!vp && !vocab.path) return { error: t("Siyahının API ünvanını yaz (məs. /api/colors).") };
    if (vp) list.path = vp;
    rule.valueFrom = "vocabulary";
    const lists = (isObj(vocab.lists) ? vocab.lists : (vocab.lists = {})) as Obj;
    lists[name] = list;
  }
  const filters = (isObj(src.filters) ? src.filters : (src.filters = {})) as Obj;
  filters[name] = rule;
  return { config: next };
}

/** Elanda göstəriləcək əlavə sahə: "Ad": "api.yolu" */
export function addAttribute(config: ConfigJson, label: string, path: string, t: T = AZ): Edit {
  const l = label.trim(), p = path.trim();
  if (!l || l.length > 40) return { error: t("Ad 1-40 simvol olmalıdır (məs. Yürüş).") };
  if (!p) return { error: t("API cavabındakı sahənin yolunu yaz (məs. mileage və ya engine.volume).") };
  const next = clone(config);
  const src = (isObj(next.source) ? next.source : (next.source = {})) as Obj;
  const resp = (isObj(src.response) ? src.response : (src.response = {})) as Obj;
  const fields = (isObj(resp.fields) ? resp.fields : (resp.fields = {})) as Obj;
  const attrs = (isObj(fields.attributes) ? fields.attributes : (fields.attributes = {})) as Obj;
  if (l in attrs) return { error: t("“{l}” artıq var.", { l }) };
  attrs[l] = p;
  return { config: next };
}

export type Issue = { level: "error" | "warn" | "info"; text: string };

/** Göndərmədən əvvəl tez yoxlama: səhvlər, xəbərdarlıqlar və faydalı məsləhətlər. */
export function lintConfig(config: ConfigJson, t: T = AZ): Issue[] {
  const out: Issue[] = [];
  const src = config.source;
  if (!isObj(src)) return [{ level: "error", text: t("“source” bölməsi yoxdur: elan API-nin təsviri buradadır.") }];
  if (src.type !== "rest") out.push({ level: "error", text: t("source.type “rest” olmalıdır.") });
  const base = typeof src.baseUrl === "string" ? src.baseUrl : "";
  if (!/^https?:\/\//.test(base)) out.push({ level: "error", text: t("source.baseUrl https:// ilə başlayan sayt API ünvanı olmalıdır (məs. https://api.saytim.az).") });
  else if (/example\.com|SAYTIN-API|API_UNVANI/i.test(base)) out.push({ level: "error", text: t("baseUrl hələ nümunə ünvanıdır. Öz sayt API-nin ünvanını yaz.") });
  else if (base.startsWith("http://")) out.push({ level: "warn", text: t("baseUrl http:// ilədir. Mümkünsə https:// istifadə et.") });
  const search = isObj(src.search) ? src.search : null;
  if (search && typeof search.path === "string" && /ELAN-YOLU/.test(search.path)) out.push({ level: "error", text: t("search.path hələ nümunədir. Elanları qaytaran öz API yolunu yaz (məs. /api/listings).") });
  if (!search || typeof search.path !== "string") out.push({ level: "error", text: t("source.search.path yoxdur: elanları qaytaran API yolu (məs. /api/listings).") });

  const resp = isObj(src.response) ? src.response : null;
  if (!resp) out.push({ level: "error", text: t("source.response yoxdur: cavabdakı elanların harada olduğunu və sahələri göstər.") });
  else {
    if (typeof resp.itemsPath !== "string") out.push({ level: "warn", text: t("response.itemsPath yoxdur. Elanlar cavabın içində massivdədirsə (məs. data.items) yolunu yaz.") });
    const fields = isObj(resp.fields) ? resp.fields : {};
    for (const f of ["id", "title", "price"]) if (!(f in fields)) out.push({ level: "warn", text: t("response.fields.{f} yoxdur. Elan kartı üçün lazımdır.", { f }) });
    const img = fields.image;
    const imgPath = typeof img === "string" ? img : isObj(img) && typeof img.path === "string" ? img.path : "";
    const imgTpl = typeof img === "string" ? img : isObj(img) && typeof img.template === "string" ? img.template : "";
    if (/^https?:\/\//i.test(imgPath) && !imgPath.includes("{")) out.push({ level: "error", text: t("fields.image: tam ünvanın içində dəyişən hissə { } ilə yazılmalıdır, yoxsa o sadə yol sayılır və şəkil boş qalır. Məsələn: “https://cdn.saytim.az/{images[0]}”.") });
    else if (imgPath && !imgPath.includes("{") && /^[\w.\-\[\]]+$/.test(imgPath) && !imgTpl.includes("://") && !/(url|src|link|href)$/i.test(imgPath) && /(^|\.)(images?|photos?|pictures?|img|thumb\w*)/i.test(imgPath))
      out.push({ level: "info", text: t("fields.image yalnız açar/yoldur (məs. “images[0]”). Şəkillər ayrıca saxlanılırsa (R2, S3, CDN), tam ünvan şablonu yaz: “https://cdn.saytim.az/{images[0]}”. Yoxsa şəkil kataloqda yüklənməyəcək.") });
    const attrs = isObj(fields.attributes) ? Object.keys(fields.attributes) : [];
    if (attrs.length > 8) out.push({ level: "warn", text: t("{n} əlavə sahə var. Hər biri AI sorğusunu bahalaşdırır, 5-8 kifayətdir.", { n: attrs.length }) });
  }

  const filters = filtersOf(config);
  if ("limit" in filters) out.push({ level: "warn", text: t("filters.limit köhnə yazılışdır: səhifə ölçüsü filtr deyil. “source.search.limitParam” yaz (aşağıdakı “Avtomatik düzəlt” bunu özü edir).") });
  const keys = Object.keys(filters).filter((k) => k !== "sort" && k !== "limit");
  if (keys.length > MAX_FILTERS) out.push({ level: "error", text: t("{n} filtr var, ən çoxu {max} ola bilər.", { n: keys.length, max: MAX_FILTERS }) });
  const vocab = isObj(src.vocabulary) ? src.vocabulary : null;
  const lists = vocab && isObj(vocab.lists) ? vocab.lists : {};
  for (const k of keys) {
    const r = filters[k];
    if (!isObj(r)) { out.push({ level: "error", text: t("filters.{k} obyekt olmalıdır { ... }.", { k }) }); continue; }
    if (r.type === undefined) out.push({ level: "error", text: t("filters.{k}: “type” yazılmayıb (string, number, boolean, range, multi və ya text). Hər filtr eyni formada yazılır: { \"type\", \"description\", \"param\" }.", { k }) });
    if (r.description === undefined) out.push({ level: "error", text: t("filters.{k}: “description” yazılmayıb. AI filtri bu təsvirə görə başa düşür.", { k }) });
    if (r.type !== "range" && typeof r.param !== "string") out.push({ level: "error", text: t("filters.{k}: “param” yoxdur (API-n parametr adı).", { k }) });
    if (r.valueFrom === "vocabulary") {
      const list = lists[k];
      if (!isObj(list)) out.push({ level: "error", text: t("filters.{k} siyahıdan çevrilir, amma vocabulary.lists.{k} yoxdur. Siyahının açarı filtrin adı ilə eyni olmalıdır.", { k }) });
      else {
        if (typeof list.idField !== "string" || typeof list.nameField !== "string") out.push({ level: "error", text: t("vocabulary.lists.{k}: idField və nameField lazımdır.", { k }) });
        if (typeof list.path !== "string" && !(vocab && typeof vocab.path === "string")) out.push({ level: "error", text: t("vocabulary.lists.{k}: siyahının ünvanı (path) yoxdur.", { k }) });
      }
    }
  }
  if (!Object.values(filters).some((f) => isObj(f) && f.type === "text"))
    out.push({ level: "info", text: t("Açar sözlərlə axtarış filtri yoxdur. Əgər API-n mətn axtarışını dəstəkləyirsə, əlavə et: istifadəçi təsvirlə axtara bilsin (məs. “su keçirməyən”).") });
  if (typeof config.apiSecret === "string" && !isObj(src.auth)) out.push({ level: "warn", text: t("apiSecret yazılıb, amma source.auth yoxdur: açarın hansı başlıqla göndəriləcəyi bilinmir.") });
  return out;
}

/** JSON.parse xəta mesajından “sətir X, sütun Y” çıxarır (mümkündürsə). */
export function jsonErrorLocation(text: string, message: string, t: T = AZ): string {
  const m = /position (\d+)/.exec(message);
  if (!m) { const l = /line (\d+) column (\d+)/.exec(message); return l ? t("sətir {a}, sütun {b}", { a: l[1]!, b: l[2]! }) : ""; }
  const pos = Math.min(Number(m[1]), text.length);
  const before = text.slice(0, pos).split("\n");
  return t("sətir {a}, sütun {b}", { a: before.length, b: before[before.length - 1]!.length + 1 });
}

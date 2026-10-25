// Müştərinin API-sindən götürdüyü nümunə cavabı oxuyub "response" bölməsini (itemsPath, fields, attributes) təklif edir.
// AI istifadə etmir: sahə adlarına və quruluşa görə proqram qaydasıdır, ona görə pulsuzdur və nəticəsi proqnozlaşdırılandır.
import { translate, type T } from "./i18n";
import type { ConfigJson } from "./api";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export type Detected = { field: string; path: string; example: string };
export type Analysis = {
  itemsPath?: string; // undefined: cavab birbaşa siyahıdır və ya siyahı tapılmadı
  itemCount: number;
  fields: Record<string, string>; // id, title, price, make, ... → API yolu
  attributes: { label: string; path: string; example: string }[];
  detected: Detected[];
  preview: string[];
  notes: string[];
  /** Cavab tək elandır: itemsPath siyahı cavabından gəlməlidir */
  single?: boolean;
};

/** "a.b[0].c" yolu ilə dəyər oxuyur. */
export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean)) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Obj)[part];
  }
  return cur;
}

// ---- elan siyahısını tapmaq ----
const PRICE_KEYS = ["price", "cost", "amount", "pricevalue", "priceamount"];
const norm0 = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Elana oxşayır? (qiymət sahəsi var, ya da həm başlıq/ad, həm id var). equipment kimi kiçik siyahılar elan sayılmır. */
const looksLikeListing = (o: Obj) => {
  const keys = Object.keys(o).map(norm0);
  return keys.some((k) => PRICE_KEYS.includes(k)) || (keys.includes("title") && keys.some((k) => k === "id" || k === "_id"));
};
function findArrays(v: unknown, path: string, depth: number, out: { path: string; items: Obj[]; depth: number }[]) {
  if (Array.isArray(v)) {
    const objs = v.filter(isObj);
    if (objs.length && objs.length === v.length && objs.slice(0, 3).some(looksLikeListing)) out.push({ path, items: objs, depth });
    return;
  }
  if (isObj(v) && depth < 4) for (const [k, x] of Object.entries(v)) findArrays(x, path ? `${path}.${k}` : k, depth + 1, out);
}
/** Siyahı yoxdursa: cavabın içindəki TƏK elan obyektini tapır (məs. data). */
function findSingle(v: unknown, path: string, depth: number): { path: string; item: Obj } | null {
  if (!isObj(v)) return null;
  if (looksLikeListing(v)) return { path, item: v };
  if (depth >= 3) return null;
  for (const [k, x] of Object.entries(v)) { const r = findSingle(x, path ? `${path}.${k}` : k, depth + 1); if (r) return r; }
  return null;
}

// ---- elanın daxilindəki sahələri toplamaq ----
type Leaf = { path: string; key: string; value: string | number | boolean };
function leaves(v: unknown, path: string, depth: number, out: Leaf[]) {
  if (v === null || v === undefined) return;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    out.push({ path, key: path.split(/[.[\]]/).filter(Boolean).pop() ?? path, value: v });
    return;
  }
  if (depth >= 3) return;
  if (Array.isArray(v)) { if (v.length && isObj(v[0])) leaves(v[0], `${path}[0]`, depth + 1, out); else if (v.length && typeof v[0] === "string") out.push({ path: `${path}[0]`, key: path, value: v[0] }); return; }
  for (const [k, x] of Object.entries(v as Obj)) leaves(x, path ? `${path}.${k}` : k, depth + 1, out);
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const NAME_KEYS = ["name", "label", "title", "value"];

// Sabit sahələr üçün mümkün açar adları (kiçik hərflə, ayırıcısız), vacib olandan başlayaraq
const RULES: { field: string; keys: string[]; type?: "string" | "number" | "boolean" }[] = [
  { field: "id", keys: ["id", "_id", "uuid", "listingid", "adid", "itemid"] },
  { field: "title", keys: ["title", "name", "headline", "heading", "adtitle"], type: "string" },
  { field: "price", keys: ["price", "cost", "amount", "pricevalue", "priceamount"], type: "number" },
  { field: "currency", keys: ["currency", "currencycode"], type: "string" },
  { field: "url", keys: ["url", "link", "href", "permalink", "weburl"], type: "string" },
  { field: "make", keys: ["make", "brand", "marka", "manufacturer"] },
  { field: "model", keys: ["model", "modelname"] },
  { field: "year", keys: ["year", "releaseyear", "manufactureyear", "productionyear"], type: "number" },
  { field: "mileage", keys: ["mileage", "km", "odometer", "kilometers", "run"], type: "number" },
  { field: "volume", keys: ["volume", "enginevolume", "displacement", "enginecapacity"], type: "number" },
  { field: "power", keys: ["power", "hp", "horsepower"], type: "number" },
  { field: "city", keys: ["city", "region", "location", "town"] },
  { field: "bodyType", keys: ["bodytype", "body", "category"] },
  { field: "fuelType", keys: ["fueltype", "fuel"] },
  { field: "transmission", keys: ["transmission", "gearbox"] },
  { field: "used", keys: ["used", "isused", "secondhand"], type: "boolean" },
  { field: "credit", keys: ["credit", "hascredit", "installment"], type: "boolean" },
  { field: "barter", keys: ["barter", "hasbarter", "exchange"], type: "boolean" },
];
const IMAGE_KEYS = ["image", "imageurl", "photo", "photourl", "thumbnail", "cover", "picture", "img", "mainimage", "coverimage"];
const IMAGE_LISTS = ["images", "photos", "pictures", "gallery", "media"];
const IMAGE_SUB = ["url", "src", "path", "link", "original", "large", "medium", "thumbnail"];
const SKIP_ATTR = /(^|\.)(__v|createdat|updatedat|created|updated|deletedat|timestamp|slug|status|views|viewcount|likedcount|likes|likecount|isliked|ispublished|published|logo|isurgent)$/i;
// Şəxsi məlumat AI-yə getməsin: telefon, əlaqə, satıcı/sahib
const PERSONAL = /phone|tel\b|mobile|whatsapp|email|mail|contact|seller|owner|user|author|customer/i;

function resolveNamed(item: Obj, ls: Leaf[], keys: string[], type?: "string" | "number" | "boolean"): Leaf | undefined {
  for (const want of keys) {
    // əvvəl elanın birbaşa sahəsi, sonra iç-içə (brand.name kimi): ən qısa yol qazanır
    const direct = ls.filter((l) => norm(l.key) === want && !l.path.includes(".") && !l.path.includes("["));
    const nested = ls.filter((l) => !l.path.includes("[") && l.path.includes(".") && l.path.split(".").length === 2 && norm(l.path.split(".")[0]!) === want && NAME_KEYS.includes(norm(l.key)));
    const cands = [...direct, ...nested].filter((l) => !type || (type === "boolean" ? typeof l.value === "boolean" : type === "number" ? typeof l.value === "number" || (typeof l.value === "string" && l.value.trim() !== "" && !Number.isNaN(Number(l.value))) : typeof l.value === "string"));
    if (want === "id" || want === "_id") { const c = cands.find((x) => typeof x.value !== "boolean"); if (c) return c; continue; }
    // iç-içə obyektdə "id" yox "name" seçilir
    const pick = cands.find((l) => !(l.path.includes(".") && norm(l.key) === "id"));
    if (pick) return pick;
  }
  void item;
  return undefined;
}

const AZ: Record<string, string> = {
  color: "Rəng", colour: "Rəng", warranty: "Zəmanət", condition: "Vəziyyət", used: "İşlənmiş", credit: "Kredit", barter: "Barter",
  drive: "Ötürücü", seats: "Oturacaq sayı", doors: "Qapı sayı", size: "Ölçü", stock: "Stok", material: "Material", weight: "Çəki",
  engine: "Mühərrik", gearbox: "Sürətlər qutusu", fuel: "Yanacaq", owners: "Sahib sayı", vin: "VIN", brand: "Marka", type: "Növ",
  document: "Sənəd", availability: "Mövcudluq", discount: "Endirim", rating: "Reytinq", quantity: "Say", sku: "Kod",
};
const AZT: T = (k, v) => translate("az", k, v);
const human = (key: string, t: T) => {
  if (AZ[key.toLowerCase()]) return t(AZ[key.toLowerCase()]!);
  const s = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const show = (v: unknown) => (v === undefined ? "" : String(v).length > 40 ? `${String(v).slice(0, 37)}…` : String(v));

export type AnalyzeResult = { analysis: Analysis } | { error: string };

export function analyzeSample(text: string, t: T = AZT): AnalyzeResult {
  if (!text.trim()) return { error: t("Nümunə boşdur. API-nin elan siyahısı qaytaran cavabını yapışdır.") };
  let root: unknown;
  try { root = JSON.parse(text); } catch (e) { return { error: t("Bu JSON deyil: {msg}. API cavabını olduğu kimi, tam kopyala.", { msg: (e as Error).message }) }; }

  const notes: string[] = [];
  let items: Obj[];
  let itemsPath: string | undefined;
  let isSingle = false;
  if (Array.isArray(root)) {
    items = root.filter(isObj);
    if (!items.length) return { error: t("Cavab siyahıdır, amma içində elan obyekti yoxdur.") };
  } else if (isObj(root)) {
    const found: { path: string; items: Obj[]; depth: number }[] = [];
    findArrays(root, "", 0, found);
    if (found.length) {
      found.sort((a, b) => b.items.length - a.items.length || a.depth - b.depth);
      items = found[0]!.items;
      itemsPath = found[0]!.path || undefined;
      if (found.length > 1) notes.push(t("Cavabda {n} siyahı var, ən çox elanı olan “{path}” seçildi. Düz deyilsə, JSON-da itemsPath-i dəyiş.", { n: found.length, path: found[0]!.path }));
    } else {
      const single = findSingle(root, "", 0);
      if (!single) return { error: t("Cavabda elana oxşayan məlumat tapa bilmədim (qiymət sahəsi olan obyekt). API-nin elanlar siyahısı cavabını yapışdır.") };
      items = [single.item];
      isSingle = true;
      notes.push(t("Bu tək elan cavabıdır. Sahələri tapdım, amma elanların SİYAHISI API-nin siyahı cavabında harada olacaq (məs. data və ya data.items)? Onu özün yazmalısan: “response.itemsPath”. Mümkünsə siyahı cavabını yapışdır."));
    }
  } else return { error: t("Cavab obyekt və ya siyahı olmalıdır.") };

  const item = items[0]!;
  const ls: Leaf[] = [];
  leaves(item, "", 0, ls);

  const fields: Record<string, string> = {};
  const used = new Set<string>();
  for (const r of RULES) {
    const hit = resolveNamed(item, ls, r.keys, r.type);
    if (hit && !used.has(hit.path)) { fields[r.field] = hit.path; used.add(hit.path); }
  }
  // Şəkil
  const imgDirect = ls.find((l) => IMAGE_KEYS.includes(norm(l.key)) && typeof l.value === "string" && !l.path.includes("["));
  if (imgDirect) { fields.image = imgDirect.path; used.add(imgDirect.path); }
  else {
    for (const list of IMAGE_LISTS) {
      const key = Object.keys(item).find((k) => norm(k) === list && Array.isArray(item[k]) && (item[k] as unknown[]).length);
      if (!key) continue;
      const first = (item[key] as unknown[])[0];
      if (typeof first === "string") { fields.image = `${key}[0]`; used.add(`${key}[0]`); }
      else if (isObj(first)) { const sub = Object.keys(first).find((k) => IMAGE_SUB.includes(norm(k)) && typeof first[k] === "string"); if (sub) { fields.image = `${key}[0].${sub}`; used.add(`${key}[0].${sub}`); } }
      break;
    }
  }
  if (fields.image) {
    const v = getPath(item, fields.image);
    if (typeof v === "string" && !/^(https?:)?\/\//.test(v)) notes.push(t("Şəkil yolu nisbidir (“{v}”). Tam şəkil ünvanı üçün response.fields.image-də şablon yaz, məs. https://CDN-UNVANI/{{path}}.", { v: show(v), path: fields.image }));
  }
  // Başlıq yoxdursa marka + modeldən
  if (!fields.title && fields.make) fields.title = fields.model ? `{${fields.make}} {${fields.model}?}` : `{${fields.make}}`;
  // id
  if (!fields.id) notes.push(t("Elanın ID sahəsini tapa bilmədim. response.fields.id üçün yolu özün yaz."));
  if (!fields.title) notes.push(t("Başlıq sahəsini tapa bilmədim. response.fields.title üçün yolu özün yaz (və ya {{a}} {{b}} kimi şablon).", { a: t("marka"), b: t("model") }));
  if (!fields.price) notes.push(t("Qiymət sahəsini tapa bilmədim. response.fields.price üçün yolu özün yaz."));
  if (!fields.url) notes.push(t("Elanın link sahəsi yoxdur. Elan linki lazımdırsa, şablon yaz, məs. https://saytim.az/elan/{id}."));

  // Qalan sahələr: əlavə məlumat təklifləri
  const attributes: Analysis["attributes"] = [];
  for (const l of ls) {
    if (used.has(l.path) || attributes.length >= 8) continue;
    if (typeof l.value === "string" && /^(?=.*\d)(?=.*[a-f])[0-9a-f]{6,}$/i.test(l.value)) continue; // texniki ID-lər
    if (PERSONAL.test(l.path) || SKIP_ATTR.test(l.path) || /(^|[._])id$/i.test(l.path) || /Id$/.test(l.key) || l.path.includes("[")) continue;
    if (typeof l.value === "string" && (l.value.length > 60 || /<[a-z][\s\S]*>/i.test(l.value) || /^https?:\/\//.test(l.value))) continue;
    if (typeof l.value === "string" && l.value.trim() === "") continue;
    // iç-içə obyektin ID-si kimi sahələri keç, adını götür
    if (l.path.includes(".") && ["id", "_id"].includes(norm(l.key))) continue;
    attributes.push({ label: human(l.path.includes(".") ? l.path.split(".")[0]! : l.key, t), path: l.path, example: show(l.value) });
  }
  // eyni etiket təkrarlanmasın
  const seen = new Set<string>();
  const uniq = attributes.filter((a) => (seen.has(a.label) ? false : (seen.add(a.label), true)));

  const detected: Detected[] = Object.entries(fields).map(([field, path]) => ({ field, path, example: path.includes("{") ? show(path.replace(/\{([^}?]+)\??\}/g, (_, p: string) => String(getPath(item, p) ?? ""))) : show(getPath(item, path)) }));
  const preview = items.slice(0, 3).map((it) => {
    const label = fields.title ? (fields.title.includes("{") ? fields.title.replace(/\{([^}?]+)\??\}/g, (_, p: string) => String(getPath(it, p) ?? "")).trim() : show(getPath(it, fields.title))) : t("(başlıq yoxdur)");
    const p = fields.price ? show(getPath(it, fields.price)) : "?";
    return `${label} · ${p}`;
  });
  return { analysis: { itemsPath, itemCount: items.length, fields, attributes: uniq, detected, preview, notes, single: isSingle } };
}

/** Təklifi konfiqurasiyaya yazır: itemsPath və fields yenilənir, seçilmiş atributlar əlavə olunur. Qalan hissələrə toxunmur. */
export function applyAnalysis(config: ConfigJson, a: Analysis, chosenAttrs: string[]): ConfigJson {
  const next = clone(config);
  const src = (isObj(next.source) ? next.source : (next.source = {})) as Obj;
  const resp = (isObj(src.response) ? src.response : (src.response = {})) as Obj;
  if (a.itemsPath) resp.itemsPath = a.itemsPath; else if (a.itemCount && !a.single) delete resp.itemsPath;
  const fields = (isObj(resp.fields) ? resp.fields : (resp.fields = {})) as Obj;
  const oldAttrs = isObj(fields.attributes) ? fields.attributes : {};
  for (const [k, v] of Object.entries(a.fields)) fields[k] = v;
  const attrs: Obj = { ...oldAttrs };
  for (const at of a.attributes) if (chosenAttrs.includes(at.path) && !(at.label in attrs)) attrs[at.label] = at.path;
  if (Object.keys(attrs).length) fields.attributes = attrs;
  return next;
}

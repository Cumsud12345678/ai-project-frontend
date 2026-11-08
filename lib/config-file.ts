import type { ConfigJson } from "./api";
import { translate, type T } from "./i18n";

const AZ: T = (k, v) => translate("az", k, v);

/** Nümunə konfiqurasiya panelin dilində (təsvirlər və profil dili). */
export const makeExample = (t: T = AZ, language = "az"): ConfigJson => ({
  businessName: t("Mənim avto saytım"),
  domain: "example.com",
  apiSecret: "ELAN_API_ACARI",
  profile: { language, tone: t("dostcasına"), maxResults: 5, extraInstructions: t("Qiymətləri AZN ilə göstər.") },
  source: {
    type: "rest",
    baseUrl: "https://api.example.com",
    timeoutMs: 5000,
    cacheSeconds: 30,
    auth: { type: "header", name: "X-Api-Key" },
    search: { method: "GET", path: "/api/listings", limitParam: "per_page" }, // limitParam: bir səhifədə neçə elan istənilsin (filtr deyil)
    // FİLTRLƏR = AI-nın axtarış üçün istifadə edə biləcəyi şərtlər. Hamısı eyni formadadır:
    // { type, description, param }. Aralıq üçün param əvəzinə minParam/maxParam yazılır.
    filters: {
      maxPrice: { type: "number", description: t("Maksimum qiymət"), param: "price_to" },
      minPrice: { type: "number", description: t("Minimum qiymət"), param: "price_from" },
      // valueFrom: "vocabulary": API ad yox ID gözləyəndə, adı siyahıdan ID-yə çevirir (aşağıda vocabulary)
      make: { type: "string", description: t("Marka"), param: "brand_id", valueFrom: "vocabulary" },
      color: { type: "string", description: t("Rəng"), param: "color_id", valueFrom: "vocabulary" },
      year: { type: "range", description: t("Buraxılış ili"), minParam: "year_from", maxParam: "year_to" },
      // Açar sözlərlə axtarış. API-n mətn axtarışını dəstəkləmirsə, bu bloku sil
      keywords: { type: "text", description: t("Açar sözlərlə axtarış (təsvir, xüsusiyyət)"), param: "q" },
    },
    // Siyahıların açarı filtrin adı ilə eyni olmalıdır (make, color). Dəyərləri API-dən oxunur, əl ilə yazılmır.
    vocabulary: {
      path: "/api/meta",
      lists: {
        make: { itemsPath: "brands", idField: "id", nameField: "name" },
        color: { itemsPath: "colors", idField: "id", nameField: "name" },
      },
    },
    response: {
      itemsPath: "data.items",
      defaults: { currency: "AZN" },
      fields: {
        id: "id",
        make: "brand.name",
        model: "model.name",
        title: "{brand.name} {model.name?}",
        price: "price",
        image: "images[0].url",
        url: "https://example.com/elanlar/{id}",
        // ELAN SAHƏLƏRİ = cavabda nə göstərilsin (filtrlər isə axtarış şərtləridir). Sağ tərəf sənin API cavabındakı yoldur.
        // Əlavə sahələr "attributes"-ə yazılır (sol: göstəriləcək ad):
        attributes: { [t("Rəng")]: "color", [t("Buraxılış ili")]: "year", [t("Yürüş")]: "mileage" },
      },
    },
  },
});
export const exampleConfig: ConfigJson = makeExample();

/** JSON-dakı // və /* *\/ şərhlərini boşluqla əvəz edir (sətir/sütun yerləri dəyişmir, dırnaq içindəki // toxunulmur). */
export function stripJsonComments(text: string): string {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i]!;
    if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"' && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, Math.min(j + 1, n));
      i = j + 1;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") { out += " "; i++; }
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end + 2;
      for (; i < stop; i++) out += text[i] === "\n" ? "\n" : " ";
    } else { out += c; i++; }
  }
  return out;
}

/**
 * Konfiqurasiya sahələrinin izahı (yol → mətn). Nümunə JSON təmiz saxlanılır (şərhsiz),
 * izah isə redaktorda kursorun dayandığı sahəyə görə ayrıca göstərilir (ConfigFieldHint).
 */
export function configDocs(t: T = AZ): Record<string, string> {
  return {
    businessName: t("Biznesinin adı"),
    domain: t("Saytının domeni (https:// olmadan)"),
    apiSecret: t("Elan API-nin açarı. Yalnız API tələb edirsə yaz: şifrələnib saxlanır və bir daha göstərilmir"),
    profile: t("Məsləhətçinin davranışı: dil, ton, nəticə sayı"),
    "profile.extraInstructions": t("Məsləhətçiyə əlavə qayda (könüllü)"),
    source: t("Elan API-nin təsviri"),
    "source.baseUrl": t("API-nin əsas ünvanı (https:// ilə)"),
    "source.timeoutMs": t("API cavabı üçün maksimum gözləmə (millisaniyə)"),
    "source.cacheSeconds": t("Eyni sorğunun cavabı neçə saniyə yadda saxlanılsın"),
    "source.auth": t("API açarı necə göndərilsin: header, bearer və ya query. Açarın özü apiSecret-dədir"),
    "source.search": t("Elanlar siyahısını qaytaran yol. limitParam: bir səhifədə neçə elan istənilsin (filtr deyil)"),
    "source.filters": t("FİLTRLƏR: AI-nın axtarışda istifadə edə biləcəyi şərtlər. Hamısı { type, description, param } formasındadır. Aralıq üçün param əvəzinə minParam/maxParam yazılır"),
    "source.filters.make": t("valueFrom: vocabulary: API ad yox ID gözləyəndə adı siyahıdan ID-yə çevirir (aşağıda vocabulary)"),
    "source.filters.keywords": t("Açar sözlərlə axtarış. API mətn axtarışını dəstəkləmirsə bu bloku sil"),
    "source.vocabulary": t("Siyahıların açarı filtrin adı ilə eyni olmalıdır (make, color). Dəyərlər API-dən oxunur, əl ilə yazılmır"),
    "source.response": t("Cavabın oxunması: elanların cavabdakı yolu və sahələrin uyğunluğu"),
    "source.response.itemsPath": t("Elan massivinin cavabdakı yolu. Cavab birbaşa massivdirsə boş burax"),
    "source.localText": t("true: API açar söz axtarışını bilmirsə, sistem nəticələri özü süzür"),
    "source.response.defaults": t("Cavabda olmayan sahələr üçün sabit dəyərlər"),
    "source.response.fields": t("ELAN SAHƏLƏRİ: cavabda nə göstərilsin. Sağ tərəf sənin API cavabındakı yoldur (nöqtə ilə), {…} isə şablondur"),
    "source.response.fields.url": t("Elan səhifəsinin ünvanı (şablon)"),
    "source.response.fields.attributes": t("Əlavə sahələr: sol tərəf göstəriləcək ad, sağ tərəf cavabdakı yol"),
    "source.search.method": t("GET və ya POST: API-n axtarışı necə qəbul edir"),
    "source.search.path": t("Elanların siyahısını qaytaran yol, / ilə başlayır (məs. /api/listings)"),
    "source.search.limitParam": t("Bir səhifədə neçə elan istənilsin parametri (filtr deyil)"),
    "source.vocabulary.path": t("Ad və ID siyahılarını qaytaran ünvan"),
    "source.vocabulary.lists": t("Hər filtr üçün siyahı: itemsPath (siyahının yolu), idField, nameField"),
    "profile.language": t("Köməkçinin əsas dili: az, en, ru, tr"),
    "profile.tone": t("Danışıq tərzi, məs. dostcasına və ya rəsmi"),
    "profile.maxResults": t("Bir cavabda ən çox neçə elan göstərilsin"),
    "profile.agentName": t("Köməkçinin müştəriyə təqdim olunduğu ad"),
    "profile.answerLength": t("Cavabın uzunluğu: short (qısa), medium (orta) və ya long (ətraflı)"),
    "profile.mode": t("Köməkçinin işi: listings (elan axtarır), support (suallara cavab), both (hər ikisi)"),
    mode: t("Köməkçinin işi: listings (elan axtarır), support (suallara cavab), both (hər ikisi)"),
    widget: t("Çat vidjetinin ayarları (görünüş və canlı söhbət)"),
    "widget.live": t("Canlı söhbət: köməkçi bilmədikdə operatora ötürür"),
    "widget.live.enabled": t("true olanda müştəri operatorla danışa bilir"),
    "source.filters.*": t("Filtrin adı (yalnız latın hərfi və rəqəm). AI bu adı görür, aydın seç: color, city, maxPrice"),
    "source.filters.*.type": t("Filtrin növü: string (dəqiq mətn), number, boolean, range (aralıq), multi (bir neçə dəyər), text (açar söz)"),
    "source.filters.*.description": t("Filtr nədir: AI bunu oxuyub nə vaxt işlədəcəyini bilir. Aydın yaz, məs. “Avtomobilin rəngi”"),
    "source.filters.*.param": t("Sənin API-nin bu filtri qəbul etdiyi parametr adı (məs. color_id)"),
    "source.filters.*.minParam": t("Aralığın alt sərhədi üçün API parametri (məs. year_from)"),
    "source.filters.*.maxParam": t("Aralığın üst sərhədi üçün API parametri (məs. year_to)"),
    "source.filters.*.valueFrom": t("vocabulary: API ad yox ID gözləyir; ad siyahıdan ID-yə çevrilir. Eyni adlı siyahı vocabulary.lists-də olmalıdır"),
    "source.vocabulary.lists.*": t("Siyahının adı filtrin adı ilə eyni olmalıdır"),
    "source.vocabulary.lists.*.itemsPath": t("Siyahının cavabdakı yolu (məs. brands)"),
    "source.vocabulary.lists.*.idField": t("Hər elementdə ID sahəsi"),
    "source.vocabulary.lists.*.nameField": t("Hər elementdə ad sahəsi"),
    "source.response.fields.*": t("Sol: bizim sahə adı. Sağ: API cavabında yol (brand.name, images[0].url) və ya şablon ({brand.name} {model.name?})"),
    "source.response.fields.attributes.*": t("Sol: elanda göstəriləcək ad. Sağ: API cavabındakı yol"),
  };
}

/** Kursorun yerindəki açarın tam yolu (məs. "source.filters.make"): mətn JSON kimi tam düzgün olmasa da işləyir. Massiv indeksləri atılır. */
export function jsonPathAt(text: string, pos: number): string {
  const stack: (string | null)[] = []; // hər açıq { və ya [ üçün: həmin obyektdə son oxunan açar
  let lastKey: string | null = null;
  let i = 0;
  while (i < pos && i < text.length) {
    const ch = text[i]!;
    if (ch === '"') {
      let j = i + 1, str = "";
      while (j < text.length && text[j] !== '"') { if (text[j] === "\\") { str += text[j + 1] ?? ""; j += 2; } else { str += text[j]; j++; } }
      // Dırnaqdan sonra ":" gəlirsə, bu açardır
      let k = j + 1; while (k < text.length && /\s/.test(text[k]!)) k++;
      if (text[k] === ":") lastKey = str;
      i = j + 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (ch === "{" || ch === "[") { stack.push(lastKey); lastKey = null; }
    else if (ch === "}" || ch === "]") { lastKey = stack.pop() ?? null; }
    else if (ch === ",") lastKey = null;
    i++;
  }
  // Kursor açarın üzərindədirsə, həmin sətrin açarı da sayılır
  const lineEnd = text.indexOf("\n", pos);
  const rest = text.slice(pos, lineEnd < 0 ? undefined : lineEnd);
  const here = /^[^"]*"([^"]+)"\s*:/.exec(rest)?.[1] ?? (/"([^"]+)"\s*:/.exec(text.slice(text.lastIndexOf("\n", pos - 1) + 1, pos + 1))?.[1]);
  const parts = [...stack.filter((x): x is string => Boolean(x)), ...(lastKey ? [lastKey] : here ? [here] : [])];
  return parts.join(".");
}

/** Yol üçün ən yaxın izah: dəqiq yoxdursa üst yola baxılır (source.filters.color → source.filters) */
export function docFor(docs: Record<string, string>, path: string): { path: string; text: string } | null {
  // İstifadəçinin adları (filtr, siyahı, sahə) "*" ilə uyğunlaşdırılır: source.filters.color.param → source.filters.*.param
  if (docs[path]) return { path, text: docs[path]! };
  const parts0 = path.split(".");
  for (const prefix of ["source.filters", "source.vocabulary.lists", "source.response.fields.attributes", "source.response.fields"]) {
    const pre = prefix.split(".");
    if (parts0.length > pre.length && pre.every((x, i) => parts0[i] === x)) {
      const rest = parts0.slice(pre.length + 1);
      const k = [prefix, "*", ...rest].join(".");
      if (docs[k] && !(prefix === "source.response.fields" && parts0[pre.length] === "attributes")) return { path: [prefix, parts0[pre.length], ...rest].join("."), text: docs[k]! };
    }
  }
  const p = path.split(".");
  // Filtr və siyahı adları istifadəçinindir: source.filters.<ad>.param → "source.filters" izahı
  while (p.length) { const k = p.join("."); if (docs[k]) return { path: k, text: docs[k]! }; p.pop(); }
  return null;
}

export type Parsed = { config: ConfigJson } | { error: string };

/** Yapışdırılmış və ya fayldan oxunmuş mətni yoxlayır; səhv varsa başa düşülən mesaj qaytarır. */
export function parseConfigText(text: string, t: T = (k, v) => translate("az", k, v)): Parsed {
  if (!text.trim()) return { error: t("JSON boşdur. Fayl seç və ya mətni yapışdır.") };
  let value: unknown;
  try {
    value = JSON.parse(stripJsonComments(text));
  } catch (e) {
    return { error: t("JSON düzgün deyil: {msg}", { msg: (e as Error).message }) };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: t("JSON obyekt olmalıdır: { ... }") };
  return { config: value as ConfigJson };
}

/** Köhnə (qısa) yazılışı tam formaya çevirir: hazır adlara type/description əlavə edir, filters.limit-i search.limitParam-a köçürür. */
const LEGACY: Record<string, { type: string; description: string }> = {
  make: { type: "string", description: "Marka (dəqiq ad)" },
  model: { type: "string", description: "Model, məs. X5, Camry" },
  minPrice: { type: "number", description: "Minimum qiymət" },
  maxPrice: { type: "number", description: "Maksimum qiymət" },
  bodyType: { type: "string", description: "Kateqoriya / kuzov tipi (dəqiq ad)" },
  city: { type: "string", description: "Şəhər / region (dəqiq ad)" },
  fuelType: { type: "string", description: "Yanacaq növü (dəqiq ad)" },
  transmission: { type: "string", description: "Sürətlər qutusu (dəqiq ad)" },
  minYear: { type: "number", description: "Ən aşağı buraxılış ili" },
  maxYear: { type: "number", description: "Ən yüksək buraxılış ili" },
  maxMileage: { type: "number", description: "Maksimum yürüş (km)" },
};
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

export function isLegacyConfig(config: ConfigJson): boolean {
  const filters = isObj(config.source) && isObj(config.source.filters) ? config.source.filters : {};
  return Object.entries(filters).some(([k, r]) => (k === "limit" && isObj(r)) || (k in LEGACY && isObj(r) && (r.type === undefined || r.description === undefined)));
}

export function normalizeConfig(config: ConfigJson, t: T = AZ): ConfigJson {
  const next = JSON.parse(JSON.stringify(config)) as ConfigJson;
  if (!isObj(next.source) || !isObj(next.source.filters)) return next;
  const src = next.source as Obj;
  const filters = src.filters as Obj;
  for (const [k, r] of Object.entries(filters)) {
    if (k === "limit" && isObj(r) && typeof r.param === "string") {
      const search = (isObj(src.search) ? src.search : (src.search = {})) as Obj;
      if (search.limitParam === undefined) search.limitParam = r.param;
      delete filters[k];
    } else if (k in LEGACY && isObj(r)) {
      filters[k] = { type: LEGACY[k]!.type, description: t(LEGACY[k]!.description), ...r };
    }
  }
  return next;
}

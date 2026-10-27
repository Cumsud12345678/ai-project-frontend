// Mənbə koddakı bütün t("...") açarlarını çıxarır və en/ru lüğətlərində çatışanları yoxlayır.
// İstifadə: node scripts/i18n-keys.mjs [--list]
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DIRS = ["app", "components", "lib"];
const SKIP = (f) => f.includes(`${path.sep}locales${path.sep}`) || f.includes(`${path.sep}ui${path.sep}`);
// t() ilə birbaşa çağırılmayan (dəyişənlə ötürülən) açarlar
const EXTRA = [
  "Gözləyən 3 yükləmə sorğun var. Əvvəlcə onlar həll olunmalıdır", "Məbləğ düzgün deyil", "Sorğu tapılmadı", "Sorğu artıq həll olunub",
  "Bakı", "Gəncə", "Sumqayıt", "Qiymət (min)", "Qiymət (max)", "Şəhər", "Yanacaq növü", "Rəng",
  "İstifadə", "Sınaq söhbəti", "Sorğular", "Elanlar", "Elan mənbəyi", "Saytına qoş", "Ayarlar",
  "Kateqoriya", "Brend", "Çatdırılma", "Qara · 12 ay zəmanət", "Ağ · 24 ay zəmanət",
  "Elan", "Qiymət", "İl", "Yürüş", "km",
  "Yeni açar yarat", "Açarı yenilə", "İstifadəçini sil", "Hesabımı sil", "Bütün sorğuları sil",
  "Mətn (dəqiq dəyər)", "Rəqəm", "Aralıq (ən az – ən çox)", "Bəli / xeyr", "Bir neçə dəyər", "Açar sözlərlə axtarış",
  "məs. rəng, şəhər, marka", "məs. maksimum yürüş", "məs. il, həcm", "məs. zəmanət, kredit", "məs. bir neçə rəng eyni anda", "təsvirə görə axtarış, yalnız bir dənə ola bilər",
  "yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek", "mln", "min",
  "Rəng", "Zəmanət", "Vəziyyət", "İşlənmiş", "Kredit", "Barter", "Ötürücü", "Oturacaq sayı", "Qapı sayı", "Ölçü", "Stok", "Material", "Çəki",
  "Mühərrik", "Sürətlər qutusu", "Yanacaq", "Sahib sayı", "VIN", "Marka", "Növ", "Sənəd", "Mövcudluq", "Endirim", "Reytinq", "Say", "Kod",
  "(silinib)", "marka", "model",
  // Müştəri məlumatı: hazır şablon adları
  "Sifarişlər", "Ödənişlər", "Şikayətlər", "Sorğular / müraciətlər", "Abunələr", "Digər (özün təyin et)",
  // config-file.ts köhnə yazılış təsvirləri
  "Marka (dəqiq ad)", "Model, məs. X5, Camry", "Kateqoriya / kuzov tipi (dəqiq ad)", "Şəhər / region (dəqiq ad)", "Yanacaq növü (dəqiq ad)", "Sürətlər qutusu (dəqiq ad)", "Ən aşağı buraxılış ili", "Ən yüksək buraxılış ili", "Maksimum yürüş (km)",
  // serverin statik xəta mesajları (lib/api.ts tərcümə edir)
  // bilik bazası: serverin statik xəta mesajları
  "Fayl göndərilməyib", "Ünvan http:// və ya https:// ilə başlamalıdır", "Mətn ən azı 20 simvol olmalıdır", "Çox əməliyyat oldu, bir az gözləyin", "Yanlış identifikator",
  "Mənbə tapılmadı", "Müraciət tapılmadı", "Fayl boşdur", "Bu fayl artıq əlavə edilib", "Bu mətn artıq əlavə edilib", "Bu ünvan artıq əlavə edilib", "Mətn çox qısadır",
  "Dəstəklənməyən format. PDF, DOCX, TXT, MD, CSV və ya HTML yükləyin.", "PDF oxuna bilmədi (zədəli və ya parolludur)",
  "PDF-də oxunan mətn yoxdur (skan edilmiş şəkil ola bilər). Mətnli PDF və ya Word yükləyin.", "Word faylı oxuna bilmədi", "Düzgün telefon və ya e-poçt yazın",
  "Elan mənbəyi qoşulmayıb: əvvəlcə elan API-sini qoşun", "Bu hesabın elan mənbəyi yoxdur", "Emal alınmadı", "Emal yarımçıq qaldı, yenidən cəhd edin",
  "Xidmət yüklüdür, bir azdan yenidən cəhd edin", "Mənbə hazırda emal olunur", "Yalnız sayt mənbələri yenilənə bilər",
  "Səhifədə oxunan mətn tapılmadı (səhifə JavaScript ilə yüklənə bilər)", "Sayt vaxtında cavab vermədi", "Mətn tapılmadı", "Çox yönləndirmə",
  "Bu ünvan səhifə deyil (HTML, PDF və ya mətn gözlənilirdi)", "Yalnız https ünvanlarına icazə var", "Daxili şəbəkə ünvanlarına icazə yoxdur",
  "Bilik bazası həcm limitini aşır. Köhnə mənbələri silin və ya daha kiçik sənəd yükləyin.", "Bu çatda əlaqə forması yoxdur",
  "Saytdan mətn oxuna bilmədi (səhifələr JavaScript ilə yüklənə və ya robots.txt ilə bağlı ola bilər)",
  "(başlıq yoxdur)",
  "Serverə qoşulmaq olmur. İnternetini və ya serverin işlədiyini yoxla.",
  "Xəta baş verdi",
  "Admin hesabı buradan silinmir",
  "Admin hesabını burada silmək olmaz",
  "Artıq aktiv mənbən var",
  "Artıq aktiv mənbən var. Konfiqurasiyanı yeniləyə bilərsən.",
  "Başlıq 1-60 simvol olmalıdır",
  "Bu email ilə hesab artıq var. Daxil ol.",
  "Bu mənbədən sorğuya icazə yoxdur",
  "Bu saytdan vidjetə icazə yoxdur",
  "Bu əməliyyat yalnız admin üçündür",
  "role “admin” və ya “user” olmalıdır", "Öz rolunu dəyişə bilməzsən", "Əsas adminin (.env) rolunu burada dəyişmək olmaz", "Email təsdiqlənməyib: əvvəlcə hesab təsdiqlənməlidir",
  "Düzgün email yaz",
  "Email göndərilə bilmədi. Bir az sonra yenidən cəhd et.",
  "Email hələ təsdiqlənməyib. Sənə yeni kod göndərdik.",
  "Email və parol lazımdır",
  "Email və ya parol yanlışdır",
  "Fayl çox böyükdür",
  "Giriş lazımdır",
  "JSON düzgün deyil",
  "Kod yanlışdır və ya vaxtı keçib",
  "Konfiqurasiya JSON obyekt olmalıdır",
  "Mesaj 1-500 simvol olmalıdır",
  "Müştəri tapılmadı",
  "Parol yanlışdır",
  "Rəng #rrggbb formatında olmalıdır",
  "Salamlama mesajı 1-300 simvol olmalıdır",
  "Silməyi təsdiqləmək üçün parolunu yaz",
  "Tapılmadı",
  "Vidjet tapılmadı və ya söndürülüb",
  "enabled true/false olmalıdır",
  "Çat müvəqqəti məşğuldur, bir azdan yenidən cəhd et",
  "Çox cəhd edildi. Bir az sonra yenidən yoxla.",
  "Çox sınaq oldu, bir neçə dəqiqə sonra yenidən yoxla",
  "Çox tez-tez mesaj göndərdin, bir az gözləyib yenidən yaz",
  "Çox yanlış cəhd oldu. Yeni kod istə.",
  "Öz hesabını burada silə bilməzsən. Ayarlar səhifəsindən sil.",
  "İstifadəçi tapılmadı",
  "Ən çox 10 əlavə ünvan əlavə edə bilərsən",
  "Əvvəlcə elan mənbəyini qoş",
  "Əvvəlki əməliyyat hələ bitməyib, bir az gözlə",
  "AI servisinə qoşulmaq olmur",
  "AI servisi vaxtında cavab vermədi",
  "AI servisi xəta qaytardı",
  "Aylıq sorğu limiti dolub",
  "Çox tez-tez sorğu göndərilir",
  "Data mənbəyi əlçatan deyil",
  "Elan API-sindən heç bir elan gəlmədi. Xəritələməni yoxlaya bilmək üçün saytda ən azı bir elan olmalıdır.",
  "Müştəri aktivləşdirilə bilmədi",
  "Xidmət müvəqqəti yüklüdür, bir azdan yenə cəhd edin",
];

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f, out); else if (/\.(ts|tsx)$/.test(e.name) && !SKIP(f)) out.push(f);
  }
  return out;
}

const keys = new Set(EXTRA);
for (const dir of DIRS) for (const f of walk(path.join(ROOT, dir))) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true);
  (function visit(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ["t", "translate"].includes(n.expression.text)) {
      const a = n.arguments[n.expression.text === "translate" ? 1 : 0];
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) && a.text) keys.add(a.text);
    }
    ts.forEachChild(n, visit);
  })(sf);
}

const all = [...keys];
if (process.argv.includes("--list")) { console.log(JSON.stringify(all, null, 1)); process.exit(0); }

const load = async (n) => Object.keys((await import(`../lib/locales/${n}.ts`)).default ?? {});
const { createRequire } = await import("node:module");
// en.ts / ru.ts TS fayllarıdır: sadə regex ilə açarları oxuyuruq
const read = (n) => {
  const src = fs.readFileSync(path.join(ROOT, "lib/locales", `${n}.ts`), "utf8");
  const m = new Map();
  for (const mm of src.matchAll(/^\s*(".*?[^\\]"|""): (".*?[^\\]"|""),?\s*$/gm)) m.set(JSON.parse(mm[1]), JSON.parse(mm[2]));
  return m;
};
let bad = 0;
for (const n of ["en", "ru"]) {
  const d = read(n);
  const missing = all.filter((k) => !d.has(k));
  const stale = [...d.keys()].filter((k) => !keys.has(k));
  // dəyişən yer tutucuları ({x}) və <c>/<b> işarələri tərcümədə saxlanmalıdır
  const tokens = (s) => (s.match(/\{\w+\}|<\/?[cbi]>/g) ?? []).sort().join(",");
  const broken = all.filter((k) => d.has(k) && tokens(k) !== tokens(d.get(k)));
  const same = all.filter((k) => d.has(k) && d.get(k) === k && /[əıöüçşğƏİÖÜÇŞĞ]/.test(k));
  console.log(`${n}: ${all.length} açar, çatışmayan ${missing.length}, artıq ${stale.length}, yer tutucu pozulub ${broken.length}, tərcümə olunmayıb ${same.length}`);
  for (const [label, list] of [["ÇATIŞMIR", missing], ["POZULUB", broken], ["TƏRCÜMƏSİZ", same]]) for (const k of list.slice(0, 40)) console.log(`  ${label}: ${k.slice(0, 90)}`);
  bad += missing.length + broken.length + same.length;
}
process.exit(bad ? 1 : 0);

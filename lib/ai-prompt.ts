import { makeExample, stripJsonComments } from "./config-file";
import { translate, type T } from "./i18n";

const AZ: T = (k, v) => translate("az", k, v);

/** Müştəri bu mətni öz saytını yazan AI alətinə (Cursor, ChatGPT, Claude, Lovable…) verir; AI konfiqurasiya JSON-unu hazırlayır. */
export function buildAiPrompt(t: T = AZ, locale = "az"): string {
  const example = JSON.stringify({ ...makeExample(t, locale), apiSecret: undefined, businessName: undefined, domain: undefined }, null, 2);
  return [
    t("Sənə mənim saytımın elanlarını (məhsul/avtomobil/əmlak və s.) oxuyan AI məsləhətçi üçün KONFİQURASİYA JSON-u hazırlamaq lazımdır."),
    t("Aşağıdakı nümunə JSON-un strukturunu və açar adlarını DƏQİQ saxla. Dəyərləri isə MƏNİM SAYTIMIN kodundan və ya sənə verəcəyim nümunələrdən doldur."),
    "",
    t("QAYDALAR"),
    t("1. Saytımın kod bazasına baxa bilirsənsə: elanların siyahısını qaytaran API route-unu, onun qəbul etdiyi sorğu parametrlərini (filtr, sıralama, səhifələmə), elanın cavab formatını (model/serializer) və marka/rəng/şəhər kimi seçimləri qaytaran endpoint-ləri tap. Baxa bilmirsənsə, aşağıda mənim yapışdıracağım nümunələrdən istifadə et."),
    t("2. source.baseUrl: API-nin əsas ünvanı. source.search.path: elanlar siyahısını qaytaran yol. Səhifədəki elan sayı parametri varsa source.search.limitParam-a yaz."),
    t("3. source.filters: yalnız MƏNİM API-mın doğrudan dəstəklədiyi filtrlər. Hər filtr { \"type\", \"description\", \"param\" } formasındadır. Aralıq (min/max) üçün \"param\" əvəzinə \"minParam\" və \"maxParam\" yaz. type: string | number | boolean | multi | range | text. \"text\" açar sözlə sərbəst axtarışdır (yalnız bir dənə, API dəstəkləmirsə yazma). description-ı Azərbaycan dilində, AI-nın nə vaxt istifadə edəcəyini başa düşəcəyi şəkildə yaz. Filtr adı yalnız latın hərfi və rəqəm olsun. Qiymət üçün maxPrice və minPrice adlarını işlət. Uydurma filtr yazma: kodda olmayanı əlavə etmə."),
    t("4. API filtr üçün ad yox ID gözləyirsə (məs. brand_id=5): həmin filtrdə \"valueFrom\": \"vocabulary\" yaz və source.vocabulary.lists-ə eyni adla siyahı əlavə et (itemsPath, idField, nameField). Siyahı ayrı endpoint-dədirsə siyahıya \"path\" yaz."),
    t("5. source.response.itemsPath: elan massivinin cavabdakı yolu (cavab birbaşa massivdirsə boş burax). source.response.fields: sol tərəf nümunədəki adlar (id, make, model, title, price, image, url, currency, year, volume, power, mileage, bodyType, city, fuelType, transmission, used, credit, barter), sağ tərəf MƏNİM cavabımdakı yol (nöqtə ilə, məs. brand.name; massiv üçün images[0]). Şablon: \"{brand.name} {model.name?}\". Şəkil yolu nisbidirsə tam ünvan şablonu yaz. Elan səhifəsinin ünvanı üçün url şablonu yaz."),
    t("6. fields.attributes: elan haqqında istifadəçiyə lazım olan 5-8 əlavə sahə, formada { \"Göstəriləcək ad\": \"cavabdakı yol\" }. Telefon, e-poçt, satıcı/sahib məlumatı, daxili ID-lər, say və tarix sahələrini ƏLAVƏ ETMƏ."),
    t("7. Əmin olmadığın yerə uydurma dəyər yazma: o sahəni buraxma, əvəzinə dəyər kimi \"TODO: nə lazımdır\" yaz."),
    t("8. Heç bir şifrə və ya API açarı yazma; apiSecret, businessName və domain sahələrini də əlavə etmə."),
    t("9. Cavabın YALNIZ bir JSON bloku olsun (izahsız, şərhsiz, sonunda artıq vergülsüz)."),
    "",
    t("NÜMUNƏ STRUKTUR (mənim saytıma uyğun dəyişdir, lazımsız filtr və sahələri sil)"),
    example,
    "",
    t("MƏNİM NÜMUNƏLƏRİM (kod bazasına baxa bilmirsənsə bu hissəni dolduracağam)"),
    t("- Elanlar siyahısı API-sinin ünvanı və cavabı:"),
    t("- Saytda filtr tətbiq edəndə gedən sorğu ünvanı (Network tabından), məs. /api/listings?minPrice=1000&make=5:"),
    t("- Marka/rəng/şəhər seçimlərini qaytaran API-nin cavabı:"),
    "",
  ].join("\n");
}

/** AI-nın cavabından JSON blokunu çıxarır (kod hasarı və ətrafdakı mətni atır). */
export function extractJson(text: string, t: T = AZ): { json: string } | { error: string } {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b <= a) return { error: t("Cavabda JSON tapılmadı. AI-nın verdiyi { ilə başlayan bloku bütövlükdə yapışdır.") };
  const raw = text.slice(a, b + 1);
  try { return { json: JSON.stringify(JSON.parse(stripJsonComments(raw)), null, 2) }; }
  catch { return { json: raw }; } // səhv olsa belə redaktora qoyuruq: canlı yoxlama xətanı göstərər
}

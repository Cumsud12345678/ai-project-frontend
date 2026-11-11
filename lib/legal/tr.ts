import type { LegalPack } from "./types";

const tr: LegalPack = {
  ui: {
    updated: "Son güncelleme", operator: "Hizmet sağlayıcı", voen: "Vergi No (VÖEN)", address: "Adres", contact: "İletişim",
    onThisPage: "Bu sayfada", home: "Ana sayfa",
    docs: { terms: "Kullanım şartları", privacy: "Gizlilik politikası", refund: "Ödeme ve iade" },
    note: "Sorun mu var? {email} adresine yaz.",
  },
  docs: {
    terms: {
      title: "Kullanım şartları",
      summary: "{brand} kullanım kuralları: hesap, abonelik planı, içerik, sorumluluk ve uyuşmazlıklar.",
      sections: [
        { id: "umumi", h: "1. Genel hükümler", body: [
          "Bu şartlar, {operator} (bundan sonra “biz”) tarafından sunulan {brand} platformunun (web paneli, sohbet widget'ı, Telegram ve WhatsApp entegrasyonları, API) kullanımını düzenler.",
          "Kayıt olarak veya hizmeti kullanarak bu şartları, Gizlilik politikasını ve Ödeme ve iade kurallarını kabul etmiş olursun. Kabul etmiyorsan hizmeti kullanma.",
        ] },
        { id: "xidmet", h: "2. Hizmetin tanımı", body: [
          "{brand}, işletmenin sitesine, Telegram veya WhatsApp hesabına bağlanan bir yapay zekâ asistanıdır. Müşterinin verdiği bilgilere (ilan ve ürün kaynakları, belgeler, site sayfaları, şirket bilgileri) dayanarak ziyaretçilere cevap verir, ilan arar ve gerektiğinde sohbeti operatöre aktarır.",
          "Özellikler ve fiyatlar sitede ve panelde gösterilir ve zaman zaman güncellenebilir.",
        ] },
        { id: "hesab", h: "3. Hesap ve güvenlik", body: [
          "- Hesabı 18 yaşını doldurmuş kişi açmalıdır. Bir işletme adına kayıt oluyorsan buna yetkin olduğunu onaylarsın.",
          "- Doğru bilgi vermeli ve güncel tutmalısın.",
          "- Şifrenin ve API anahtarının gizliliğinden sen sorumlusun. İki adımlı girişi açmanı öneririz.",
          "- Hesabındaki tüm işlemlerden (ekip üyelerinin işlemleri dahil) sen sorumlusun. Yetkisiz erişimden şüphelenirsen hemen bize yaz.",
        ] },
        { id: "balans", h: "4. Abonelik planı ve ödeme", body: [
          "Hizmet aylık abonelik planıyla sunulur (her dönem 30 gündür). Her planın aylık yanıt limiti, kullanıcı sayısı ve özellikleri panelde ve sitenin fiyat bölümünde gösterilir. Yeni hesaba bir kez ücretsiz deneme verilir: 14 gün içinde 100 yanıt (hangisi önce biterse).",
          "Limitin %80'i ve tamamı kullanıldığında e-postayla bildiririz. Limit dolduğunda asistan ziyaretçilere yanıt vermez, bunun yerine iletişim formu gösterilir. Planı yükseltmek veya ek yanıt paketi almakla hizmet hemen devam eder.",
          "Plan otomatik yenilenmez: dönem bitmeden 3 gün önce hatırlatırız. Dönem bittikten sonra kısa bir ek süre (3 gün) vardır, ardından asistan durur; verilerin saklanır ve plan yenilenir yenilenmez hizmet devam eder.",
          "Ödenmiş dönem ve ek paketler iade edilmez ve nakde çevrilmez (hatalı tahsilat ve hizmetin tarafımızca durdurulması hariç). Fiyat değişikliğini en az 14 gün önceden bildiririz; ödenmiş dönem eski fiyatla tamamlanır. Ayrıntılar: “Ödeme ve iade” belgesi.",
        ] },
        { id: "mezmun", h: "5. İçeriğin ve yükümlülüklerin", body: [
          "- Yüklediğin veya bağladığın veriler (ilanlar, belgeler, API yanıtları, şirket bilgileri) sana aittir. Bunları kullanma hakkın olduğunu onaylarsın.",
          "- Asistanın içeriğinden (karşılama, hazır cevaplar, operatör cevapları) ve ziyaretçilere verdiğin bilgilerin doğruluğundan sen sorumlusun.",
          "- Ziyaretçilerinin verileri için veri sorumlusu sensin; biz bu verileri senin adına işleriz. Sitenin gizlilik politikasında sohbet asistanı kullandığını belirtmelisin.",
          "- Hizmeti sunmak amacıyla verileri saklamamız, işlememiz ve yapay zekâ sağlayıcılarına iletmemiz için bize sınırlı, geri alınabilir bir izin verirsin.",
        ] },
        { id: "qadagan", h: "6. Yasak kullanım", body: [
          "- yasa dışı, yanıltıcı, hakaret içeren, şiddete çağıran veya başkalarının haklarını ihlal eden içerik yaymak;",
          "- spam, dolandırıcılık, başkasının kimliğine bürünmek;",
          "- sahibi olmadığın veya izin almadığın siteye, bota ya da numaraya bağlanmak;",
          "- deneme bakiyesi veya bonus için aynı siteyi birden fazla hesapla bağlamak ya da limitleri başka yollarla aşmak;",
          "- hizmetin işleyişine müdahale etmek, açıkları istismar etmek, tersine mühendislik, otomatik saldırılar.",
          "Bu durumlarda hesabı uyarısız askıya alabilir veya alan adını engelleyebiliriz.",
        ] },
        { id: "ai", h: "7. Yapay zekâ cevapları", body: [
          "Cevaplar otomatik üretilir ve hatalı, eksik veya eski olabilir. Asistan hukuki, tıbbi veya finansal danışmanlık vermez.",
          "Yayına almadan önce asistanı deneme sohbetinde test etmeni ve önemli bilgileri (fiyat, şartlar) kaynakta güncel tutmanı öneririz. Asistanın cevaplarına dayanarak alınan kararlardan sorumlu değiliz.",
        ] },
        { id: "elcatanliq", h: "8. Erişilebilirlik", body: [
          "Hizmeti kesintisiz tutmaya çalışırız; ancak bakım, arızalar ve üçüncü taraf hizmetler (yapay zekâ sağlayıcıları, Telegram, WhatsApp, barındırma) nedeniyle kesintiler olabilir. Hizmet “olduğu gibi” sunulur.",
          "Planlı bakımları mümkün olduğunca önceden duyururuz.",
        ] },
        { id: "dayandirma", h: "9. Askıya alma ve hesabın silinmesi", body: [
          "Hesabını istediğin zaman panelden (Ayarlar → Hesap → Hesabı sil) silebilirsin. Verilerin Gizlilik politikasında belirtilen şekilde silinir. Hesap silindiğinde ödenmiş dönemin kalanı ve kullanılmayan paketler iade edilmez.",
          "Şartların ihlali, ödeme dolandırıcılığı veya yasal zorunluluk hâlinde hesabı askıya alabiliriz. Askıya alınan hesabın verileri ve bakiyesi hemen silinmez, sebep e-postayla bildirilir.",
        ] },
        { id: "mesuliyyet", h: "10. Sorumluluğun sınırlandırılması", body: [
          "Yasanın izin verdiği ölçüde dolaylı zararlardan, kâr kaybından ve veri kaybından sorumlu değiliz.",
          "Herhangi bir talepteki toplam sorumluluğumuz, talepten önceki 3 ayda bize ödediğin tutarla sınırlıdır.",
        ] },
        { id: "mulkiyyet", h: "11. Fikri mülkiyet", body: [
          "Platform, tasarımı, kodu ve {brand} adı bize aittir. Bu şartlar sana yalnızca hizmeti kullanma hakkı verir.",
          "Widget'ta “{brand} ile çalışır” notu gösterilebilir. Kaldırılması ayrı bir anlaşmayla mümkündür.",
        ] },
        { id: "deyisiklik", h: "12. Şartların değiştirilmesi", body: [
          "Şartları güncelleyebiliriz. Önemli değişiklikleri yürürlüğe girmeden en az 14 gün önce e-posta veya panel üzerinden duyururuz. Değişiklikten sonra kullanmaya devam etmek kabul anlamına gelir.",
        ] },
        { id: "huquq", h: "13. Uygulanacak hukuk", body: [
          "Bu şartlara Azerbaycan Cumhuriyeti mevzuatı uygulanır. Uyuşmazlıklar önce müzakere yoluyla, uzlaşılamazsa Azerbaycan Cumhuriyeti mahkemelerinde çözülür.",
        ] },
        { id: "elaqe", h: "14. İletişim", body: ["Şartlarla ilgili sorular için {email} adresine yaz."] },
      ],
    },
    privacy: {
      title: "Gizlilik politikası",
      summary: "Hangi verileri topluyoruz, neden kullanıyoruz, kimlerle paylaşıyoruz ve ne kadar saklıyoruz.",
      sections: [
        { id: "kim", h: "1. Biz kimiz ve rolümüz", body: [
          "{operator}, {brand} platformunu işletir. Hesap sahiplerinin (işletmelerin) verileri için veri sorumlusuyuz.",
          "İşletmenin sitesinde, Telegram veya WhatsApp'ında asistanla yazışan ziyaretçilerin verileri için veri sorumlusu o işletmedir; biz bu verileri onun adına ve talimatıyla işleriz.",
          "Kişisel verileri Azerbaycan Cumhuriyeti “Kişisel Veriler Hakkında” Kanunu'na uygun olarak işleriz.",
        ] },
        { id: "melumat", h: "2. Topladığımız veriler", body: [
          "- **Hesap:** e-posta, şifre özeti (şifrenin kendisi saklanmaz), iki adımlı giriş ayarları, dil.",
          "- **İşletme:** işletme adı, site alan adı, şirket iletişim bilgileri (telefon, adres, çalışma saatleri), asistan ayarları.",
          "- **Ödeme:** plan veya paket siparişinin tutarı, tarihi ve durumu. Kart bilgileri ödeme sağlayıcısında işlenir, bizde saklanmaz.",
          "- **Bilgi bankası ve katalog:** yüklenen belgeler, metinler, okunan site sayfaları, ilan kaynağının adresi ve yanıtları. API anahtarları şifreli saklanır.",
          "- **Ziyaretçi sohbetleri:** mesajlar, tarayıcıda saklanan anonim ziyaretçi kimliği, sohbetin başladığı sayfa, ziyaretçinin kendi isteğiyle yazdığı ad, telefon veya e-posta.",
          "- **Kanallar:** Telegram ve WhatsApp kullanıcı kimliği, adı ve numarası (kanal bağlıysa).",
          "- **Teknik:** IP adresi, tarayıcı bilgisi, giriş ve hata kayıtları, hesaplara bağlanan alan adları (kötüye kullanımı önlemek için).",
        ] },
        { id: "meqsed", h: "3. Verileri neden kullanıyoruz", body: [
          "- hizmeti sunmak: cevaplar, arama, operatör sohbeti, bildirimler;",
          "- hesap güvenliği, giriş doğrulama ve kötüye kullanımın (ör. aynı sitenin birden fazla hesapla bağlanması) önlenmesi;",
          "- abonelik limitinin takibi, ödemelerin kaydı ve muhasebe yükümlülükleri;",
          "- destek ve önemli hizmet bildirimleri;",
          "- hizmeti geliştirmek için toplu, kimliği belirlemeyen istatistikler.",
          "Verileri reklam amacıyla satmayız veya paylaşmayız. Müşteri verilerini kendi modellerimizi eğitmek için kullanmayız.",
        ] },
        { id: "esas", h: "4. Hukuki dayanaklar", body: [
          "Verileri sözleşmenin ifası (hizmetin sunulması), meşru menfaat (güvenlik, kötüye kullanımın önlenmesi), yasal yükümlülük (muhasebe) ve gerektiğinde açık rıza temelinde işleriz.",
        ] },
        { id: "paylasma", h: "5. Kimlerle paylaşıyoruz", body: [
          "Hizmeti sunmak için aşağıdaki sağlayıcıları kullanırız. Bu sağlayıcılar verileri yalnızca talimatımızla ve sözleşme kapsamında işler:",
          "- **Yapay zekâ sağlayıcıları** (Anthropic — Claude, Google — Gemini): ziyaretçinin sorusu ve cevap için gereken bağlam;",
          "- **E-posta gönderimi** (Resend): kod ve bildirim e-postaları;",
          "- **Bulut barındırma ve veritabanı sağlayıcıları**;",
          "- **Ödeme sağlayıcısı**: plan ve paket ödemeleri;",
          "- **Telegram ve WhatsApp**: yalnızca bu kanalları bağladığında.",
          "Bazı sağlayıcılar Azerbaycan dışında (ABD, AB) bulunduğundan veriler yurt dışına aktarılabilir. Bu aktarımlar hizmetin sunulması için gereklidir ve uygun güvencelerle yapılır.",
          "Verileri yalnızca yasa gerektirdiğinde resmi makamlara sunarız.",
        ] },
        { id: "saxlama", h: "6. Ne kadar saklıyoruz", body: [
          "- canlı operatör sohbetleri: 60 gün;",
          "- asistana yapılan sorguların kaydı ve cevap değerlendirmeleri: 90 gün;",
          "- Telegram ve WhatsApp sohbet oturumları: 14 gün hareketsizlikten sonra;",
          "- hata kayıtları: 30 gün; güvenlik ve yönetici işlemleri kaydı: 1 yıl;",
          "- doğrulama kodları: 15 dakika;",
          "- hesap, bilgi bankası ve başvurular: sen silene veya hesap silinene kadar;",
          "- ödeme kayıtları: yasanın öngördüğü süre boyunca.",
        ] },
        { id: "tehlukesizlik", h: "7. Güvenlik", body: [
          "Tüm bağlantılar HTTPS ile şifrelenir, şifreler özetlenir, API anahtarları ve kanal token'ları şifreli saklanır. İki adımlı giriş, oturum kontrolü ve yönetici işlem kaydı vardır. Hiçbir sistem tamamen güvenli değildir, ancak riskleri azaltmak için sürekli çalışırız.",
        ] },
        { id: "huquqlar", h: "8. Hakların", body: [
          "Verilerine erişme, düzeltme, silme, kopyasını alma ve işlenmesine itiraz etme hakkın vardır. Hesabını ve verilerini panelden silebilir, başvuruları ve sohbetleri CSV olarak dışa aktarabilirsin. Diğer talepler için {email} adresine yaz; 30 gün içinde cevap veririz.",
          "Ziyaretçiler verileriyle ilgili önce yazıştıkları işletmeye başvurmalıdır. İşletmenin bu talebi yerine getirmesine yardımcı oluruz.",
        ] },
        { id: "kuki", h: "9. Çerezler ve tarayıcı depolaması", body: [
          "- **ca_session:** panelde oturumu açık tutar (zorunlu);",
          "- **lang:** seçtiğin dil;",
          "- **ref_code:** ortaklık linkiyle geldiysen ortak kodu (90 gün);",
          "- **sohbet widget'ı:** sayfa değişince sohbet kaybolmasın diye ziyaretçinin tarayıcısında anonim kimlik ve sohbet durumu saklanır.",
          "Reklam veya izleme çerezleri kullanmayız.",
        ] },
        { id: "usaqlar", h: "10. Çocuklar", body: ["Platform 18 yaşından küçükler için tasarlanmamıştır ve onların verilerini bilerek toplamayız."] },
        { id: "deyisiklik", h: "11. Değişiklikler", body: ["Politikayı güncelleyebiliriz. Önemli değişiklikleri e-posta veya panel üzerinden önceden duyururuz."] },
        { id: "elaqe", h: "12. İletişim", body: ["Gizlilikle ilgili talepler için {email} adresine yaz."] },
      ],
    },
    refund: {
      title: "Ödeme ve iade",
      summary: "Aboneliğin nasıl çalıştığı, yenileme, plan değişikliği ve iade kuralları.",
      sections: [
        { id: "model", h: "1. Abonelik nasıl çalışır", body: [
          "{brand} aylık abonelik planıyla çalışır (her dönem 30 gündür). Her planın aylık yanıt limiti vardır: asistanın ziyaretçiye verdiği her yanıt bir yanıt sayılır. Sesin metne çevrilmesi, operatör için AI taslağı ve soru analizi limite dahil değildir.",
          "Kayıtta bir kez ücretsiz deneme verilir: 14 gün içinde 100 yanıt (hangisi önce biterse). Kullanılmayan yanıtlar sonraki döneme aktarılmaz.",
          "Limitin %80'i ve tamamı kullanıldığında e-postayla bildiririz. Limit dolduğunda asistan ziyaretçilere yanıt vermez, bunun yerine iletişim formu gösterilir (başvurular kaybolmaz).",
          "**Ek paket** (ör. +500 yanıt) plan limiti dolduktan sonra kullanılır ve satın alındığı tarihten itibaren 12 ay geçerlidir. Paket yalnızca aktif bir planla alınabilir.",
        ] },
        { id: "yenileme", h: "2. Yenileme, yükseltme ve iptal", body: [
          "Plan **otomatik yenilenmez** ve karttan otomatik ödeme alınmaz. Dönem bitmeden 3 gün önce e-postayla hatırlatırız. Zamanında yenilersen yeni dönem eskisinin bittiği günden başlar: hiçbir gün kaybolmaz.",
          "Dönem bittikten sonra 3 günlük ek süre vardır. Bu sürede yenilersen yeni dönem yine eskisinin bitiş tarihinden sayılır. Ek süreden sonra asistan durur; bilgi tabanın ve ayarların saklanır.",
          "**Yükseltme:** daha pahalı plana geçerken yalnızca mevcut dönemin kalan günleri için farkı ödersin; yeni limit ve özellikler hemen açılır, dönemin bitiş tarihi değişmez.",
          "**Daha ucuz plana geçiş** sonraki dönemden itibaren olur: mevcut dönem ödenen planla tamamlanır.",
          "**İptal:** planı yenilememen yeterlidir, hizmet dönem sonunda durur. Ödenmiş dönem iade edilmez.",
        ] },
        { id: "odenis", h: "3. Ödeme", body: [
          "Ödemeler Azerbaycan manatı (AZN) ile, lisanslı bir ödeme sağlayıcısı aracılığıyla banka kartıyla kabul edilir. Kart bilgilerini görmeyiz ve saklamayız. Tutar, siparişten önce panelde gösterilir.",
          "Ödeme onaylandığında plan veya paket etkinleşir ve onay e-postası gönderilir.",
        ] },
        { id: "qaytarma", h: "4. İade", body: [
          "Ödenmiş abonelik dönemi ve ek paketler **iade edilmez ve nakde çevrilmez**: ne ödemeden sonra, ne dönem ortasında iptal edildiğinde, ne de hesap kapatıldığında. Önce ücretsiz denemeyle her şeyi kontrol etmeni öneririz.",
          "Para yalnızca şu durumlarda iade edilir:",
          "- **Hatalı tahsilat:** teknik bir hata nedeniyle fazla tutar alındıysa veya ödeme iki kez geçtiyse, fazla kısım tamamen iade edilir.",
          "- **Hizmeti biz durdurursak:** platform faaliyetini durdurursa, ödenmiş dönemin kullanılmayan günleri ve paketlerin kalanı iade edilir.",
          "- yasanın gerektirdiği diğer durumlar.",
        ] },
        { id: "qaytarilmir", h: "5. İade edilmeyen durumlar", body: [
          "- ödenmiş dönemin kullanılan veya kullanılmayan kısmı (limitten az yanıt kullanılması dahil);",
          "- süresi (12 ay) dolmuş veya kullanılmamış ek paketler;",
          "- yükseltme sırasında ödenen fark;",
          "- ücretsiz deneme, bonus, promosyon veya yönetici tarafından verilen plan;",
          "- şartların ihlali nedeniyle askıya alınan hesap.",
        ] },
        { id: "nece", h: "6. Hatalı tahsilat için nasıl başvurulur", body: [
          "{email} adresine hesap e-postan, ödeme tarihi ve tutarıyla yaz. Başvuruları 10 iş günü içinde inceleriz.",
          "Onaylanan tutar ödemenin yapıldığı karta iade edilir. Paranın karta geçmesi bankaya bağlı olarak 5–15 iş günü sürebilir.",
        ] },
        { id: "mubahise", h: "7. Ödeme uyuşmazlıkları", body: [
          "Ödemeyle ilgili bir sorun olursa bankada itiraz (chargeback) açmadan önce bize yaz: çoğu durumu birkaç gün içinde çözeriz. İtiraz açık olduğu sürece hesap geçici olarak kısıtlanabilir.",
        ] },
        { id: "qiymet", h: "8. Fiyat değişiklikleri", body: [
          "Plan fiyatları veya limitleri değişirse, en az 14 gün önceden e-posta veya panel aracılığıyla bildiririz. Ödenmiş dönem eski koşullarla tamamlanır; yeni koşullar sonraki yenilemeden itibaren uygulanır.",
        ] },
      ],
    },
  },
};
export default tr;

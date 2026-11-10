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
      summary: "{brand} kullanım kuralları: hesap, bakiye, içerik, sorumluluk ve uyuşmazlıklar.",
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
        { id: "balans", h: "4. Bakiye ve ödeme", body: [
          "Hizmet ön ödemeli bakiye (AZN) ile çalışır. Her cevabın gerçek maliyeti bakiyeden düşülür; güncel bakiye ve harcama geçmişi panelde görünür.",
          "Bakiye bitince asistan ziyaretçilere cevap vermez, yerine iletişim formu gösterilir. Bakiye yüklenince hizmet otomatik olarak devam eder.",
          "Fiyat değişikliklerini en az 14 gün önceden e-posta veya panel üzerinden duyururuz. Yüklenmiş bakiye değişiklikten sonra yeni fiyatlarla kullanılır.",
          "Her yüklemenin kullanım süresi yükleme tarihinden itibaren 12 aydır; bu sürede kullanılmayan kısım yanar. Yüklenen bakiye iade edilmez ve nakde çevrilmez (hatalı tahsilat ve hizmetin bizim tarafımızdan durdurulması hariç). Ayrıntılar: “Ödeme ve iade” belgesi.",
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
          "Hesabını istediğin zaman panelden (Ayarlar → Hesap → Hesabı sil) silebilirsin. Verilerin Gizlilik politikasında belirtilen şekilde silinir. Hesap silindiğinde kullanılmayan bakiye iade edilmez.",
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
          "- **Ödeme:** yükleme tutarı, tarihi ve durumu. Kart bilgileri ödeme sağlayıcısında işlenir, bizde saklanmaz.",
          "- **Bilgi bankası ve katalog:** yüklenen belgeler, metinler, okunan site sayfaları, ilan kaynağının adresi ve yanıtları. API anahtarları şifreli saklanır.",
          "- **Ziyaretçi sohbetleri:** mesajlar, tarayıcıda saklanan anonim ziyaretçi kimliği, sohbetin başladığı sayfa, ziyaretçinin kendi isteğiyle yazdığı ad, telefon veya e-posta.",
          "- **Kanallar:** Telegram ve WhatsApp kullanıcı kimliği, adı ve numarası (kanal bağlıysa).",
          "- **Teknik:** IP adresi, tarayıcı bilgisi, giriş ve hata kayıtları, hesaplara bağlanan alan adları (kötüye kullanımı önlemek için).",
        ] },
        { id: "meqsed", h: "3. Verileri neden kullanıyoruz", body: [
          "- hizmeti sunmak: cevaplar, arama, operatör sohbeti, bildirimler;",
          "- hesap güvenliği, giriş doğrulama ve kötüye kullanımın (ör. aynı sitenin birden fazla hesapla bağlanması) önlenmesi;",
          "- bakiyenin hesaplanması, ödemelerin kaydı ve muhasebe yükümlülükleri;",
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
          "- **Ödeme sağlayıcısı**: bakiye yüklemeleri;",
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
      summary: "Bakiyenin nasıl çalıştığı, kullanım süresi ve iade kuralları.",
      sections: [
        { id: "model", h: "1. Bakiye nasıl çalışır", body: [
          "{brand} ön ödemeli bakiyeyle çalışır. Bakiyeni yüklersin, her cevabın gerçek maliyeti düşülür. Otomatik yenilenen abonelik veya gizli ücret yoktur.",
          "Harcama geçmişi, güncel bakiye ve yüklemeler paneldeki “Bakiye” bölümünde görünür. Günlük harcama limiti beklenmedik artışlara (ör. bot saldırılarına) karşı korur.",
          "Her yüklemenin kullanım süresi **yükleme tarihinden itibaren 12 aydır**. Bu sürede kullanılmayan kısım yanar ve geri getirilmez. Harcama önce süresi en erken dolacak yüklemeden düşülür. Her yüklemenin kalanı ve bitiş tarihi panelde görünür; süresi dolmak üzereyken panelde uyarı gösterilir.",
        ] },
        { id: "odenis", h: "2. Ödeme", body: [
          "Ödemeler Azerbaycan manatı (AZN) ile, lisanslı bir ödeme sağlayıcısı üzerinden banka kartıyla alınır. Kart bilgilerini görmeyiz ve saklamayız.",
          "Başarılı ödemeden sonra bakiye otomatik artar ve onay e-postası gönderilir.",
        ] },
        { id: "qaytarma", h: "3. İade", body: [
          "Yüklenen bakiye **iade edilmez ve nakde çevrilmez**: ne yüklemeden sonra ne de hesap kapatılırken. Bu yüzden tutarı ihtiyacına göre seç; küçük bir tutarla başlayıp gerektikçe yükleyebilirsin.",
          "Para yalnızca şu durumlarda iade edilir:",
          "- **Hatalı tahsilat:** teknik bir hata nedeniyle fazla tutar düşüldüyse veya ödeme iki kez geçtiyse, fazlası tamamen iade edilir.",
          "- **Hizmeti biz durdurursak:** platform faaliyetini durdurursa, kullanılmayan yüklenmiş bakiye iade edilir.",
          "- yasanın gerektirdiği diğer durumlar.",
        ] },
        { id: "qaytarilmir", h: "4. İade edilmeyen durumlar", body: [
          "- zaten kullanılmış harcama (asistanın verdiği cevaplar);",
          "- süresi (12 ay) dolmuş bakiye;",
          "- hesap kapatılırken veya silinirken kalan bakiye;",
          "- ücretsiz, bonus, promosyon veya ortaklık programıyla verilen bakiye (nakde çevrilmez);",
          "- şartların ihlali nedeniyle askıya alınan hesaplar.",
        ] },
        { id: "nece", h: "5. Hatalı tahsilatı nasıl bildirirsin", body: [
          "{email} adresine hesap e-postan, ödeme tarihi ve tutarıyla yaz. Talepleri 10 iş günü içinde inceleriz.",
          "Onaylanan tutar ödemenin yapıldığı karta iade edilir. Bankaya bağlı olarak 5–15 iş günü sürebilir.",
        ] },
        { id: "mubahise", h: "6. Ödeme itirazları", body: [
          "Ödemeyle ilgili bir sorun olursa bankada itiraz (chargeback) açmadan önce bize yaz — çoğu durumu birkaç gün içinde çözeriz. İtiraz açıkken hesap geçici olarak kısıtlanabilir.",
        ] },
        { id: "qiymet", h: "7. Fiyat değişiklikleri", body: [
          "Fiyat değişikliklerini en az 14 gün önceden e-posta veya panel üzerinden duyururuz. Bu sürede yükleme yapmayabilirsin; yüklenmiş bakiye değişiklikten sonra yeni fiyatlarla kullanılır.",
        ] },
      ],
    },
  },
};
export default tr;

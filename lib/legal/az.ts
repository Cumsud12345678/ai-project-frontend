import type { LegalPack } from "./types";

const az: LegalPack = {
  ui: {
    updated: "Son yenilənmə", operator: "Xidməti göstərən", voen: "VÖEN", address: "Ünvan", contact: "Əlaqə",
    onThisPage: "Bu səhifədə", home: "Ana səhifə",
    docs: { terms: "İstifadə şərtləri", privacy: "Məxfilik siyasəti", refund: "Ödəniş və geri qaytarma" },
    note: "Sualın varsa, {email} ünvanına yaz.",
  },
  docs: {
    terms: {
      title: "İstifadə şərtləri",
      summary: "{brand} xidmətindən istifadə qaydaları: hesab, balans, məzmun, məsuliyyət və mübahisələr.",
      sections: [
        { id: "umumi", h: "1. Ümumi müddəalar", body: [
          "Bu şərtlər {operator} (bundan sonra “biz”) tərəfindən təqdim olunan {brand} platformasından (veb panel, çat vidjeti, Telegram və WhatsApp inteqrasiyaları, API) istifadə qaydalarını müəyyən edir.",
          "Qeydiyyatdan keçməklə və ya xidmətdən istifadə etməklə bu şərtləri, Məxfilik siyasətini və Ödəniş və geri qaytarma qaydasını qəbul etmiş olursan. Razı deyilsənsə, xidmətdən istifadə etmə.",
        ] },
        { id: "xidmet", h: "2. Xidmətin təsviri", body: [
          "{brand} biznesin saytına, Telegram və ya WhatsApp hesabına qoşulan süni intellekt köməkçisidir. Köməkçi müştərinin verdiyi məlumata (elan və məhsul mənbələri, sənədlər, sayt səhifələri, şirkət məlumatı) əsasən ziyarətçilərə cavab verir, elan axtarır və lazım olanda söhbəti operatora ötürür.",
          "Xidmətin konkret imkanları və qiymətləri saytda və paneldə göstərilir və vaxtaşırı yenilənə bilər.",
        ] },
        { id: "hesab", h: "3. Hesab və təhlükəsizlik", body: [
          "- Hesabı 18 yaşı tamam olmuş şəxs açmalıdır. Biznes adından qeydiyyatdan keçirsənsə, bunu etməyə səlahiyyətin olduğunu təsdiq edirsən.",
          "- Qeydiyyatda düzgün məlumat verməli və onu aktual saxlamalısan.",
          "- Parolun və API açarının məxfiliyinə sən cavabdehsən. İki addımlı girişi açmağı tövsiyə edirik.",
          "- Hesabında baş verən fəaliyyətə (komanda üzvlərinin hərəkətləri daxil) sən cavabdehsən. İcazəsiz girişdən şübhələnsən, dərhal bizə yaz.",
        ] },
        { id: "balans", h: "4. Balans və ödəniş", body: [
          "Xidmət əvvəlcədən ödənilmiş balans (AZN) əsasında işləyir. Hər cavab üçün faktiki xərc balansdan çıxılır, cari balans və xərc tarixçəsi paneldə görünür.",
          "Balans bitəndə köməkçi ziyarətçilərə cavab vermir, əvəzinə əlaqə forması göstərilir. Balans artırılan kimi xidmət avtomatik davam edir.",
          "Qiymətlər dəyişərsə, ən azı 14 gün əvvəl e-poçt və ya panel vasitəsilə xəbərdarlıq edirik. Artıq yüklənmiş balans dəyişiklikdən sonra yeni qiymətlərlə istifadə olunur.",
          "Geri qaytarma qaydaları ayrıca “Ödəniş və geri qaytarma” sənədindədir.",
        ] },
        { id: "mezmun", h: "5. Sənin məzmunun və öhdəliklərin", body: [
          "- Yüklədiyin və ya qoşduğun məlumat (elanlar, sənədlər, API cavabları, şirkət məlumatı) sənə məxsusdur. Bu məlumatı istifadə etməyə hüququn olduğunu təsdiq edirsən.",
          "- Köməkçinin məzmununa (salamlama, hazır cavablar, operator cavabları) və ziyarətçilərə verdiyin məlumatın düzgünlüyünə sən cavabdehsən.",
          "- Ziyarətçilərinin məlumatları üçün sən məlumat sahibisən (nəzarətçi), biz bu məlumatları sənin adından emal edirik. Saytının məxfilik siyasətində çat köməkçisindən istifadə etdiyini qeyd etməlisən.",
          "- Xidməti göstərmək üçün (məlumatı saxlamaq, emal etmək, AI provayderinə ötürmək) bizə məhdud, geri götürülə bilən icazə verirsən.",
        ] },
        { id: "qadagan", h: "6. Qadağan olunmuş istifadə", body: [
          "- Qanunsuz, aldadıcı, təhqiredici, zorakılığa çağıran və ya başqalarının hüquqlarını pozan məzmun yaymaq;",
          "- spam, fırıldaqçılıq, başqasının adından çıxış etmək;",
          "- sahibi olmadığın və ya icazən olmayan sayta, bota və ya nömrəyə qoşulmaq;",
          "- sınaq balansı və ya bonus almaq üçün eyni sayta bir neçə hesabla qoşulmaq və ya limitləri başqa yolla keçmək;",
          "- xidmətin işinə müdaxilə etmək, zəiflikləri istismar etmək, kodu tərsinə açmaq, avtomatlaşdırılmış hücum etmək.",
          "Bu hallarda hesabı xəbərdarlıq etmədən dayandıra və ya domeni bloklaya bilərik.",
        ] },
        { id: "ai", h: "7. Süni intellekt cavabları", body: [
          "Cavablar avtomatik yaradılır və səhv, natamam və ya köhnə ola bilər. Köməkçi hüquqi, tibbi və ya maliyyə məsləhəti vermir.",
          "Köməkçini müştərilərə açmazdan əvvəl sınaq çatında yoxlamağı, vacib məlumatı (qiymət, şərtlər) mənbədə aktual saxlamağı tövsiyə edirik. Köməkçinin cavabına əsasən verilən qərarlara görə biz cavabdeh deyilik.",
        ] },
        { id: "elcatanliq", h: "8. Xidmətin əlçatanlığı", body: [
          "Xidməti fasiləsiz saxlamağa çalışırıq, lakin texniki işlər, nasazlıqlar və üçüncü tərəf xidmətlərindən (AI provayderləri, Telegram, WhatsApp, hostinq) asılı fasilələr ola bilər. Xidmət “olduğu kimi” təqdim olunur.",
          "Planlı texniki işlər barədə imkan daxilində əvvəlcədən xəbər veririk.",
        ] },
        { id: "dayandirma", h: "9. Dayandırma və hesabın silinməsi", body: [
          "Hesabını istənilən vaxt paneldən (Ayarlar → Hesab → Hesabı sil) silə bilərsən. Silinmə ilə məlumatların Məxfilik siyasətində göstərilən qaydada silinir.",
          "Şərtlər pozulduqda, ödəniş fırıldaqçılığı və ya qanun tələbi olduqda hesabı dayandıra bilərik. Dayandırılmış hesabda məlumat və balans dərhal silinmir, səbəb e-poçtla bildirilir.",
        ] },
        { id: "mesuliyyet", h: "10. Məsuliyyətin məhdudlaşdırılması", body: [
          "Qanunun icazə verdiyi həddə biz dolayı zərərə, əldən çıxmış gəlirə və məlumat itkisinə görə məsuliyyət daşımırıq.",
          "İstənilən iddia üzrə ümumi məsuliyyətimiz iddiadan əvvəlki 3 ay ərzində bizə ödədiyin məbləğlə məhdudlaşır.",
        ] },
        { id: "mulkiyyet", h: "11. Əqli mülkiyyət", body: [
          "Platforma, onun dizaynı, kodu və {brand} adı bizə məxsusdur. Bu şərtlər sənə yalnız xidmətdən istifadə hüququ verir.",
          "Vidjetdə “{brand} ilə işləyir” qeydi göstərilə bilər. Bu qeydin götürülməsi ayrıca razılaşma ilə mümkündür.",
        ] },
        { id: "deyisiklik", h: "12. Şərtlərin dəyişdirilməsi", body: [
          "Şərtləri yeniləyə bilərik. Əhəmiyyətli dəyişikliklər barədə qüvvəyə minməzdən ən azı 14 gün əvvəl e-poçt və ya panel vasitəsilə xəbər veririk. Dəyişiklikdən sonra xidmətdən istifadə yeni şərtlərin qəbulu deməkdir.",
        ] },
        { id: "huquq", h: "13. Tətbiq olunan hüquq", body: [
          "Bu şərtlərə Azərbaycan Respublikasının qanunvericiliyi tətbiq olunur. Mübahisələr əvvəlcə danışıqlar yolu ilə, razılıq əldə edilmədikdə Azərbaycan Respublikasının məhkəmələrində həll olunur.",
        ] },
        { id: "elaqe", h: "14. Əlaqə", body: ["Şərtlərlə bağlı suallar üçün {email} ünvanına yaz."] },
      ],
    },
    privacy: {
      title: "Məxfilik siyasəti",
      summary: "Hansı məlumatları toplayırıq, nə üçün istifadə edirik, kimlə paylaşırıq və nə qədər saxlayırıq.",
      sections: [
        { id: "kim", h: "1. Kim və hansı rolda", body: [
          "{operator} {brand} platformasını idarə edir. Hesab sahiblərinin (bizneslərin) məlumatı üçün biz məlumat nəzarətçisiyik.",
          "Bizneslərin saytında, Telegram və ya WhatsApp-da köməkçi ilə yazışan ziyarətçilərin məlumatı üçün nəzarətçi həmin biznesdir, biz isə bu məlumatı onun adından və onun tapşırığı ilə emal edirik.",
          "Fərdi məlumatları “Fərdi məlumatlar haqqında” Azərbaycan Respublikasının Qanununa uyğun emal edirik.",
        ] },
        { id: "melumat", h: "2. Hansı məlumatları toplayırıq", body: [
          "- **Hesab:** e-poçt, parolun heşi (parolun özü saxlanmır), iki addımlı giriş ayarları, dil.",
          "- **Biznes:** biznes adı, sayt domeni, şirkət əlaqə məlumatı (telefon, ünvan, iş saatları), köməkçi ayarları.",
          "- **Ödəniş:** yükləmə məbləği, tarixi və statusu. Kart məlumatları ödəniş provayderində emal olunur, bizdə saxlanmır.",
          "- **Bilik bazası və kataloq:** yüklədiyin sənədlər, mətnlər, oxunan sayt səhifələri, elan mənbəyinin ünvanı və cavabları. API açarları şifrələnmiş saxlanır.",
          "- **Ziyarətçi söhbətləri:** mesajlar, brauzerdə saxlanan anonim ziyarətçi ID-si, söhbətin başladığı səhifə, ziyarətçinin könüllü yazdığı ad, telefon və ya e-poçt.",
          "- **Kanallar:** Telegram və WhatsApp-da istifadəçi ID-si, adı və nömrəsi (həmin kanal qoşulubsa).",
          "- **Texniki:** IP ünvanı, brauzer məlumatı, giriş və xəta jurnalları, hesabın qoşulduğu domenlər (sui-istifadənin qarşısını almaq üçün).",
        ] },
        { id: "meqsed", h: "3. Məlumatı nə üçün istifadə edirik", body: [
          "- xidməti göstərmək: köməkçinin cavab verməsi, axtarış, operator söhbəti, bildirişlər;",
          "- hesabın təhlükəsizliyi, girişin təsdiqi və sui-istifadənin (məsələn, eyni sayta çoxlu hesabla qoşulmanın) qarşısını almaq;",
          "- balansın hesablanması, ödənişlərin uçotu və qanuni mühasibat öhdəlikləri;",
          "- dəstək və xidmətlə bağlı vacib bildirişlər;",
          "- xidməti yaxşılaşdırmaq üçün ümumiləşdirilmiş, şəxsiyyəti açmayan statistika.",
          "Məlumatı reklam məqsədilə satmırıq və ötürmürük. Müştəri məlumatını öz modellərimizi öyrətmək üçün istifadə etmirik.",
        ] },
        { id: "esas", h: "4. Hüquqi əsaslar", body: [
          "Məlumatı müqavilənin icrası (xidmətin göstərilməsi), qanuni maraq (təhlükəsizlik, sui-istifadənin qarşısı), qanuni öhdəlik (mühasibat) və lazım olduqda razılıq əsasında emal edirik.",
        ] },
        { id: "paylasma", h: "5. Kimlərlə paylaşırıq", body: [
          "Xidməti göstərmək üçün aşağıdakı provayderlərdən istifadə edirik. Onlar məlumatı yalnız bizim tapşırığımızla və müqavilə əsasında emal edir:",
          "- **Süni intellekt provayderləri** (Anthropic — Claude, Google — Gemini): ziyarətçi sualı və cavab üçün lazım olan kontekst;",
          "- **E-poçt göndərişi** (Resend): kod və bildiriş məktubları;",
          "- **Bulud hostinq və verilənlər bazası provayderləri**;",
          "- **Ödəniş provayderi**: balans yükləmələri;",
          "- **Telegram və WhatsApp**: yalnız sən bu kanalları qoşduqda.",
          "Bəzi provayderlər Azərbaycandan kənarda (ABŞ, Avropa İttifaqı) yerləşir, ona görə məlumat sərhəddən kənara ötürülə bilər. Belə ötürmələr xidmətin göstərilməsi üçün zəruridir və müvafiq qorunma tədbirləri ilə həyata keçirilir.",
          "Məlumatı yalnız qanunla tələb olunduqda dövlət orqanlarına təqdim edirik.",
        ] },
        { id: "saxlama", h: "6. Nə qədər saxlayırıq", body: [
          "- canlı operator söhbətləri: 60 gün;",
          "- köməkçiyə verilən sorğuların jurnalı və cavab rəyləri: 90 gün;",
          "- Telegram və WhatsApp söhbət sessiyaları: 14 gün hərəkətsizlikdən sonra;",
          "- xəta jurnalları: 30 gün; təhlükəsizlik və admin əməliyyatları jurnalı: 1 il;",
          "- təsdiq kodları: 15 dəqiqə;",
          "- hesab, bilik bazası və müraciətlər: sən silənə və ya hesab silinənə qədər;",
          "- ödəniş qeydləri: qanunla tələb olunan müddət ərzində.",
        ] },
        { id: "tehlukesizlik", h: "7. Təhlükəsizlik", body: [
          "Bütün bağlantılar HTTPS ilə şifrələnir, parollar heşlənir, API açarları və kanal tokenləri şifrələnmiş saxlanır. İki addımlı giriş, sessiya nəzarəti və admin əməliyyatlarının jurnalı var. Heç bir sistem tam təhlükəsiz deyil, amma riskləri azaltmaq üçün davamlı işləyirik.",
        ] },
        { id: "huquqlar", h: "8. Sənin hüquqların", body: [
          "Məlumatına baxmaq, onu düzəltmək, silmək, emalına etiraz etmək və surətini almaq hüququn var. Hesabı və məlumatları paneldən silə, müraciətləri və söhbətləri CSV kimi ixrac edə bilərsən. Digər sorğular üçün {email} ünvanına yaz, 30 gün ərzində cavab veririk.",
          "Ziyarətçilər öz məlumatları ilə bağlı əvvəlcə yazışdıqları biznesə müraciət etməlidir. Biznesə bu sorğunu icra etməkdə kömək edirik.",
        ] },
        { id: "kuki", h: "9. Kukilər və brauzer yaddaşı", body: [
          "- **ca_session:** paneldə girişi saxlayır (zəruri);",
          "- **lang:** seçdiyin dil;",
          "- **ref_code:** partnyor linki ilə gəlmisənsə, partnyor kodu (90 gün);",
          "- **çat vidjeti:** ziyarətçinin brauzerində anonim ID və söhbət vəziyyəti saxlanır ki, səhifə dəyişəndə söhbət itməsin.",
          "Reklam və ya izləmə kukilərindən istifadə etmirik.",
        ] },
        { id: "usaqlar", h: "10. Uşaqlar", body: ["Platforma 18 yaşdan aşağı şəxslər üçün nəzərdə tutulmayıb və onların məlumatını bilərəkdən toplamırıq."] },
        { id: "deyisiklik", h: "11. Dəyişikliklər", body: ["Siyasəti yeniləyə bilərik. Əhəmiyyətli dəyişikliklər barədə e-poçt və ya panel vasitəsilə əvvəlcədən xəbər veririk."] },
        { id: "elaqe", h: "12. Əlaqə", body: ["Məxfiliklə bağlı sorğular üçün {email} ünvanına yaz."] },
      ],
    },
    refund: {
      title: "Ödəniş və geri qaytarma",
      summary: "Balansın necə işlədiyi, hansı hallarda və necə geri qaytarıldığı.",
      sections: [
        { id: "model", h: "1. Balans necə işləyir", body: [
          "{brand} əvvəlcədən ödənilən balansla işləyir. Balansı artırırsan, hər cavab üçün faktiki xərc balansdan çıxılır. Avtomatik yenilənən abunə və gizli ödəniş yoxdur.",
          "Xərc tarixçəsi, cari balans və yükləmələr paneldəki “Balans” bölməsində görünür. Gündəlik xərc limiti gözlənilməz artımdan (məsələn, bot hücumundan) qoruyur.",
        ] },
        { id: "odenis", h: "2. Ödəniş", body: [
          "Ödənişlər Azərbaycan manatı (AZN) ilə, lisenziyalı ödəniş provayderi vasitəsilə bank kartı ilə qəbul olunur. Kart məlumatlarını biz görmürük və saxlamırıq.",
          "Uğurlu ödənişdən sonra balans avtomatik artır və təsdiq məktubu göndərilir.",
        ] },
        { id: "qaytarma", h: "3. Geri qaytarılan hallar", body: [
          "- **14 gün ərzində:** yükləmədən sonra 14 gün ərzində həmin yükləmənin istifadə olunmamış hissəsi tam geri qaytarılır.",
          "- **Hesab bağlananda:** 14 gündən sonra da hesabını bağlayırsansa, istifadə olunmamış balans sorğu əsasında qaytarılır.",
          "- **Səhv tutulma:** texniki xəta ilə artıq məbləğ çıxılıbsa və ya ödəniş iki dəfə keçibsə, artıq hissə tam qaytarılır.",
        ] },
        { id: "qaytarilmir", h: "4. Geri qaytarılmayan hallar", body: [
          "- artıq istifadə olunmuş xərc (köməkçinin verdiyi cavablar);",
          "- hər ay verilən pulsuz balans, bonus, promo və ya partnyor proqramı ilə verilən balans (bunlar nağdlaşdırılmır);",
          "- şərtlərin pozulmasına görə dayandırılmış hesab (qanunla tələb olunan hallar istisna).",
        ] },
        { id: "nece", h: "5. Necə müraciət etmək olar", body: [
          "{email} ünvanına hesabının e-poçtu, ödənişin tarixi və məbləği ilə yaz. Müraciətə 10 iş günü ərzində baxırıq.",
          "Təsdiq olunan məbləğ ödənişin edildiyi karta qaytarılır. Pulun karta düşməsi bankdan asılı olaraq 5–15 iş günü çəkə bilər. Ödəniş provayderinin tutduğu komissiya qaytarılmaya bilər.",
        ] },
        { id: "mubahise", h: "6. Ödəniş mübahisələri", body: [
          "Ödənişlə bağlı problem olduqda bankda mübahisə (chargeback) açmazdan əvvəl bizə yaz: əksər halları bir neçə gün ərzində həll edirik. Mübahisə açıq olduğu müddətdə hesab müvəqqəti məhdudlaşdırıla bilər.",
        ] },
        { id: "qiymet", h: "7. Qiymət dəyişiklikləri", body: [
          "Qiymətlər dəyişərsə, ən azı 14 gün əvvəl xəbər veririk. Razı deyilsənsə, istifadə olunmamış balansı bu qaydaya uyğun geri ala bilərsən.",
        ] },
      ],
    },
  },
};
export default az;

"use client";
import { Fragment } from "react";
import { useT } from "@/lib/i18n";

const Code = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-muted px-1 font-mono text-xs">{children}</code>;

/** Tərcümə mətnində: <c>kod</c>, <b>qalın</b>. Tərcüməçi bu işarələri olduğu kimi saxlayır. */
function R({ text }: { text: string }) {
  const parts = text.split(/(<c>.*?<\/c>|<b>.*?<\/b>)/g);
  return <>{parts.map((p, i) => p.startsWith("<c>") ? <Code key={i}>{p.slice(3, -4)}</Code> : p.startsWith("<b>") ? <strong key={i}>{p.slice(3, -4)}</strong> : <Fragment key={i}>{p}</Fragment>)}</>;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

/** Konfiqurasiyanı ilk dəfə yazan müştəri üçün qısa izah. Defolt bağlıdır. */
export function ConfigGuide() {
  const t = useT();
  return (
    <details className="rounded-md border border-border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{t("Necə doldurulur? Addım-addım izah")}</summary>
      <div className="flex flex-col gap-5 border-t border-border px-4 py-4">
        <p className="text-sm text-muted-foreground"><R text={t("Burada sayt API-ni məsləhətçiyə təsvir edirsən: <b>elanları haradan oxusun</b>, <b>hansı şərtlərlə axtarsın</b> və <b>cavabdan nəyi götürsün</b>. Ən asan yol: yuxarıdakı “AI ilə hazırla” (öz AI alətinə hazır tapşırıq ver, cavabını yapışdır) və ya “Nümunə cavabdan doldur” (API-nin real cavabını yapışdır). Hər dəyişiklikdən sonra “Yoxla” düyməsinə bas.")} /></p>

        <Block title={t("1. API-nin ünvanı və açar")}>
          <p><R text={t("<c>baseUrl</c>: API-nin əsas ünvanı (məs. <c>https://api.saytim.az</c>). <c>search.path</c>: elanların siyahısını qaytaran yol (məs. <c>/api/listings</c>).")} /></p>
          <p><R text={t("API açar tələb edirsə: <c>auth.name</c> açarın göndəriləcəyi başlığın adıdır (məs. <c>X-Api-Key</c>), <c>apiSecret</c> isə açarın özü. Açar şifrələnib saxlanır və bir daha göstərilmir. API açıqdırsa, ikisini də sil.")} /></p>
        </Block>

        <Block title={t("2. Filtrlər: AI hansı şərtlərlə axtara bilər")}>
          <p>{t("Yalnız burada yazdığın filtrlər işləyir: AI özündən filtr uydura bilmir. Hər filtr üçün 3 şey yazılır:")}</p>
          <ul className="list-disc pl-5">
            <li><R text={t("<c>type</c>: filtrin növü (aşağıdakı cədvəl).")} /></li>
            <li><R text={t("<c>description</c>: filtr nədir. AI bunu oxuyub nə vaxt istifadə edəcəyini bilir, ona görə aydın yaz.")} /></li>
            <li><R text={t("<c>param</c>: sənin API-n bu filtri hansı adla qəbul edir (məs. <c>color_id</c>).")} /></li>
          </ul>
          <ul className="list-disc pl-5">
            <li><R text={t("<c>string</c> dəqiq mətn (rəng, şəhər). <c>number</c> rəqəm. <c>boolean</c> bəli/xeyr.")} /></li>
            <li><R text={t("<c>range</c> iki sərhəd (il, həcm): <c>minParam</c> və <c>maxParam</c> yazılır.")} /></li>
            <li><R text={t("<c>multi</c> bir neçə dəyər birlikdə. <c>text</c> açar sözlərlə axtarış (yalnız bir dənə).")} /></li>
          </ul>
          <p><R text={t("<b>Bütün filtrlər eyni formada yazılır</b>, istisna yoxdur: <c>{ \"type\", \"description\", \"param\" }</c> (aralıqda <c>param</c> əvəzinə <c>minParam</c> və <c>maxParam</c>). Qiymət filtrləri <c>maxPrice</c> və <c>minPrice</c>, marka <c>make</c> adı ilə yazılır.")} /></p>
          <p><R text={t("Filtri əl ilə yazmaq lazım deyil: aşağıdakı “+ Filtr əlavə et” düyməsi sənin üçün JSON-a yazır. Bir səhifədə neçə elan istənilməsi filtr deyil, <c>search.limitParam</c>-dır.")} /></p>
          <p className="rounded bg-muted px-2 py-1.5"><R text={t("<b>Filtr ilə elan sahəsini qarışdırma:</b> <i>filtrlər</i> axtarış şərtləridir (AI-dan API-yə gedir). <i>Elan sahələri</i> (<c>response.fields</c> və <c>attributes</c>) isə cavabda nə göstərilsin deməkdir (API-dən AI-yə gəlir).")} /></p>
        </Block>

        <Block title={t("3. Siyahı (vocabulary): API ID gözləyəndə")}>
          <p><R text={t("API-n rəngi “Qırmızı” yox, <c>5</c> kimi ID ilə qəbul edirsə, ad və ID siyahısını göstərməlisən. Sistem istifadəçinin dediyi adı ID-yə özü çevirəcək. Siyahının açarı filtrin adı ilə eyni olmalıdır (<c>color</c> filtri üçün <c>vocabulary.lists.color</c>).")} /></p>
          <p>{t("Hər siyahı üçün ayrıca API ünvanı yaza bilərsən (marka, rəng, şəhər ayrı ünvanlardadırsa).")}</p>
        </Block>

        <Block title={t("4. Cavabdan nəyi götürək (response)")}>
          <p><R text={t("<c>itemsPath</c>: elanlar cavabın harasındadır (məs. <c>data.items</c>). Cavab birbaşa siyahıdırsa, boş burax.")} /></p>
          <p><R text={t("<c>fields</c> bölməsində sol tərəf bizim ad, sağ tərəf <b>sənin API cavabındakı yoldur</b>. İç-içə sahə nöqtə ilə (<c>brand.name</c>), siyahı elementi nömrə ilə (<c>images[0].url</c>), şablon isə fiqurlu mötərizə ilə yazılır: <c>{brand.name} {model.name?}</c> (<c>?</c> boş ola bilər deməkdir).")} /></p>
          <p><R text={t("Əlavə məlumat (yürüş, həcm, şəhər) üçün <c>attributes</c>-ə sətir əlavə et. Bunun üçün də “+ Elanda yeni sahə göstər” düyməsi var. 5-8 sahə kifayətdir: çox sahə hər sorğunu bahalaşdırır.")} /></p>
        </Block>

        <Block title={t("Ən çox rast gəlinən səhvlər")}>
          <ul className="list-disc pl-5">
            <li>{t("JSON-da son elementdən sonra vergül qoymaq (JSON bunu qəbul etmir).")}</li>
            <li>{t("Filtr adında boşluq və ya Azərbaycan hərfi (yalnız latın hərfi və rəqəm).")}</li>
            <li><R text={t("<c>valueFrom: \"vocabulary\"</c> yazıb siyahını (<c>vocabulary.lists</c>) əlavə etməmək.")} /></li>
            <li>{t("Sağ tərəfdə API cavabında olmayan yol yazmaq: elanda həmin sahə boş görünür.")}</li>
          </ul>
        </Block>
      </div>
    </details>
  );
}

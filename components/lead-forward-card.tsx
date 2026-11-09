"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, FlaskConical, Send, Sheet, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { deleteLeadTarget, getLeadForward, linkLeadTelegram, saveLeadTarget, testLeadForward, unlinkLeadTelegram, type LeadForwardView } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Google Sheets üçün hazır Apps Script: hər müraciət cədvələ yeni sətir kimi düşür
const SHEETS_SCRIPT = `function doPost(e) {
  var d = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(["Tarix", "Mənbə", "Ad", "Əlaqə", "Sual", "Səhifə"]);
  if (d.event === "lead" || d.event === "chat_closed") sheet.appendRow([new Date(), d.event === "lead" ? d.source : d.channel, d.name, d.contact, d.question || "", d.page || ""]);
  return ContentService.createTextOutput("ok");
}`;

function Row({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 first:pt-0">
      <p className="flex items-center gap-2 text-sm font-medium">{icon}{title}</p>
      {children}
    </div>
  );
}
const Linked = ({ text, onRemove, label }: { text: string; onRemove: () => void; label: string }) => (
  <div className="flex flex-wrap items-center gap-2 text-sm">
    <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-primary"><Check size={14} aria-hidden />{text}</span>
    <Button size="sm" variant="ghost" onClick={onRemove}><Trash2 size={14} aria-hidden />{label}</Button>
  </div>
);

/** Yeni müraciəti Telegram qrupuna, Bitrix24-ə və ya webhook-a (Google Sheets, Make, Zapier, n8n) ötürmək. Yalnız sahib görür. */
export function LeadForwardCard({ bare, onChange }: { bare?: boolean; onChange?: () => void } = {}) {
  const { t } = useI18n();
  const [v, setV] = useState<LeadForwardView | null>(null);
  const [bitrix, setBitrix] = useState("");
  const [hook, setHook] = useState("");
  const [busy, setBusy] = useState("");
  const [linking, setLinking] = useState(false);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => { getLeadForward().then(setV).catch(() => {}); return () => clearInterval(poll.current); }, []);

  async function run<T>(key: string, fn: () => Promise<T>, ok?: string): Promise<T | null> {
    setBusy(key);
    try { const r = await fn(); if (ok) toast.success(ok); return r; }
    catch (err) { toast.error((err as Error).message); return null; }
    finally { setBusy(""); }
  }
  async function linkTg() {
    const r = await run("tg", linkLeadTelegram);
    if (!r) return;
    window.open(r.url, "_blank", "noopener");
    setLinking(true);
    clearInterval(poll.current);
    const until = Date.now() + r.expiresInS * 1000;
    poll.current = setInterval(() => {
      if (Date.now() > until) { clearInterval(poll.current); setLinking(false); return; }
      getLeadForward().then((x) => { if (x.telegram) { clearInterval(poll.current); setV(x); setLinking(false); toast.success(t("Telegram qrupu qoşuldu.")); } }).catch(() => {});
    }, 3000);
  }
  async function save(kind: "bitrix" | "webhook") {
    const r = await run(kind, () => saveLeadTarget(kind, kind === "bitrix" ? bitrix : hook), kind === "bitrix" ? t("Bitrix24 qoşuldu.") : t("Webhook qoşuldu. Sınaq göndərişi uğurlu oldu."));
    if (r) { setV(r); if (kind === "bitrix") setBitrix(""); else setHook(""); }
  }
  async function remove(kind: "bitrix" | "webhook" | "telegram") {
    const r = await run(`rm-${kind}`, () => (kind === "telegram" ? unlinkLeadTelegram() : deleteLeadTarget(kind)));
    if (r) setV(r);
  }
  async function test() {
    const r = await run("test", testLeadForward);
    if (r) setResults(r.results);
  }

  useEffect(() => { if (v) onChange?.(); }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v) return null;
  const any = Boolean(v.telegram || v.bitrix || v.webhook);
  const res = (k: string) => results?.[k] && (
    <p className={results[k] === "ok" ? "text-xs text-primary" : "text-xs text-destructive"}>{results[k] === "ok" ? t("Sınaq çatdı.") : results[k]}</p>
  );
  return (
    <section className={bare ? "flex flex-col gap-3" : "flex flex-col gap-3 rounded-lg border border-border bg-card p-4"} aria-label={t("Müraciətləri ötür")}>
      {!bare && <div>
        <h2 className="text-sm font-semibold">{t("Müraciətləri ötür")}</h2>
        <p className="text-xs text-muted-foreground">{t("Yeni müraciət (ad, əlaqə, sual) paneldən və e-poçtdan əlavə, burada seçdiyin yerə də dərhal göndərilsin. Heç bir rəsmi icazə lazım deyil.")}</p>
      </div>}

      <Row icon={<Send size={15} aria-hidden className="text-primary" />} title={t("Telegram qrupu")}>
          {!v.telegramAvailable && !v.telegram ? <p className="text-xs text-muted-foreground">{t("Telegram qrupuna göndərmə hazırda əlçatan deyil. Tezliklə açılacaq; o vaxta qədər Bitrix24, Google Sheets və ya e-poçtdan istifadə et.")}</p>
          : v.telegram ? <Linked text={v.telegram.title || t("Qrup qoşulub")} onRemove={() => remove("telegram")} label={t("Ayır")} />
            : (
              <>
                <p className="text-xs text-muted-foreground">{t("Satış komandanın Telegram qrupu varsa: düyməni bas, açılan pəncərədə qrupu seç. Bot qrupa əlavə olunur və müraciətləri ora yazır.")}</p>
                <div><Button size="sm" variant="outline" onClick={linkTg} disabled={busy === "tg" || linking}><Send size={14} aria-hidden />{linking ? t("Telegram-da qrupu seç…") : t("Qrupa qoş")}</Button></div>
              </>
            )}
          {res("telegram")}
        </Row>

      <Row icon={<Sheet size={15} aria-hidden className="text-primary" />} title="Bitrix24">
        {v.bitrix ? <Linked text={v.bitrix.host} onRemove={() => remove("bitrix")} label={t("Ayır")} />
          : (
            <>
              <form onSubmit={(e) => { e.preventDefault(); void save("bitrix"); }} className="flex flex-wrap gap-2">
                <Input className="min-w-0 flex-1 font-mono text-xs" placeholder="https://sirket.bitrix24.az/rest/1/abc123…/" value={bitrix} onChange={(e) => setBitrix(e.target.value)} aria-label={t("Bitrix24 webhook linki")} />
                <Button size="sm" disabled={!bitrix.trim() || busy === "bitrix" || !v.keyReady}>{busy === "bitrix" ? t("Yoxlanır…") : t("Qoş")}</Button>
              </form>
              <details className="text-xs text-muted-foreground">
                <summary className="inline-flex cursor-pointer items-center gap-1 text-primary"><ChevronDown size={12} aria-hidden />{t("Linki necə almaq olar?")}</summary>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5">
                  <li>{t("Bitrix24-də: Tətbiqlər → Developer resources → Other → Inbound webhook.")}</li>
                  <li>{t("İcazələrdə “CRM” seç və saxla.")}</li>
                  <li>{t("“Webhook to call REST API” linkini kopyalayıb bura yapışdır.")}</li>
                </ol>
                <p className="mt-1">{t("Hər müraciət CRM-də yeni lid olur: ad, telefon və ya e-poçt, sual və söhbətin son hissəsi ilə.")}</p>
              </details>
            </>
          )}
        {res("bitrix")}
      </Row>

      <Row icon={<Webhook size={15} aria-hidden className="text-primary" />} title={t("Google Sheets və ya webhook")}>
        {v.webhook ? <Linked text={v.webhook.host} onRemove={() => remove("webhook")} label={t("Ayır")} />
          : (
            <>
              <form onSubmit={(e) => { e.preventDefault(); void save("webhook"); }} className="flex flex-wrap gap-2">
                <Input className="min-w-0 flex-1 font-mono text-xs" placeholder="https://script.google.com/macros/s/…/exec" value={hook} onChange={(e) => setHook(e.target.value)} aria-label={t("Webhook ünvanı")} />
                <Button size="sm" disabled={!hook.trim() || busy === "webhook" || !v.keyReady}>{busy === "webhook" ? t("Yoxlanır…") : t("Qoş")}</Button>
              </form>
              <details className="text-xs text-muted-foreground">
                <summary className="inline-flex cursor-pointer items-center gap-1 text-primary"><ChevronDown size={12} aria-hidden />{t("Google Sheets-ə necə qoşmaq olar?")}</summary>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5">
                  <li>{t("Yeni Google Sheets cədvəli aç → Extensions (Genişləndirmələr) → Apps Script.")}</li>
                  <li>{t("Oradakı kodu silib aşağıdakını yapışdır və saxla.")}</li>
                  <li>{t("Deploy → New deployment → növ: Web app. “Execute as: Me”, “Who has access: Anyone” seç → Deploy, icazə ver.")}</li>
                  <li>{t("Verilən “Web app URL” linkini bura yapışdır və “Qoş” bas.")}</li>
                </ol>
                <div className="relative mt-2">
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">{SHEETS_SCRIPT}</pre>
                  <Button type="button" size="sm" variant="outline" className="absolute top-2 right-2" onClick={() => { void navigator.clipboard.writeText(SHEETS_SCRIPT).then(() => toast.success(t("Kopyalandı."))); }}><Copy size={13} aria-hidden />{t("Kopyala")}</Button>
                </div>
                <p className="mt-1.5">{t("Make, Zapier və ya n8n istifadə edirsənsə, onların “Webhook” linkini də bura yazmaq olar: hər müraciət JSON kimi göndərilir (event, name, contact, question, page, conversation).")}</p>
              </details>
            </>
          )}
        {res("webhook")}
      </Row>

      {!v.keyReady && <p className="text-xs text-destructive">{t("Serverdə CHANNEL_SECRET_KEY təyin edilməyib: Bitrix24 və webhook linkləri şifrəli saxlanmadığı üçün qoşulmur.")}</p>}
      {any && (
        <div className="border-t border-border pt-3">
          <Button size="sm" variant="outline" onClick={test} disabled={busy === "test"}><FlaskConical size={14} aria-hidden />{busy === "test" ? t("Göndərilir…") : t("Sınaq müraciəti göndər")}</Button>
        </div>
      )}
    </section>
  );
}

"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { buildAiPrompt, extractJson } from "@/lib/ai-prompt";
import { parseConfigText, normalizeConfig } from "@/lib/config-file";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const todoLeft = (s: string) => /TODO/i.test(s);

/** Ən asan yol: hazır tapşırığı öz AI alətinə ver, cavabını yapışdır. */
export function AiHelper({ onChange }: { onChange: (next: string) => void }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function copy() {
    try { await navigator.clipboard.writeText(buildAiPrompt(t, locale)); setCopied(true); toast.success(t("Tapşırıq kopyalandı. İndi AI alətinə yapışdır.")); setTimeout(() => setCopied(false), 2500); }
    catch { toast.error(t("Kopyalanmadı. Aşağıdakı mətni əl ilə seçib kopyala.")); }
  }

  function useReply() {
    const r = extractJson(reply, t);
    if ("error" in r) { setMsg({ ok: false, text: r.error }); return; }
    const p = parseConfigText(r.json, t);
    if ("error" in p) { onChange(r.json); setMsg({ ok: false, text: t("JSON redaktora qoyuldu, amma səhv var: {err} Aşağıdakı yoxlama xətanı göstərir, düzəldə və ya AI-dan düzəltməsini istəyə bilərsən.", { err: p.error }) }); return; }
    const out = JSON.stringify(normalizeConfig(p.config, t), null, 2);
    onChange(out);
    setReply("");
    setMsg(null);
    toast.success(todoLeft(out) ? t("Qoyuldu. “TODO” yazılmış yerləri öz məlumatınla əvəz et, lazımsız sahələri sil, sonra “Yoxla” düyməsinə bas.") : t("Qoyuldu. Lazımsız filtr və sahələri sil, apiSecret, businessName və domain-i yaz, sonra “Yoxla” düyməsinə bas."), { duration: 9000 });
  }

  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-col gap-3 px-4 py-4 text-sm">
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>{t("“Tapşırığı kopyala” düyməsinə bas.")}</li>
          <li>{t("Saytını yazan AI aləti (Cursor, Claude Code, ChatGPT, Lovable və s.) kod bazana baxa bilirsə, tapşırığı ona yapışdır. Baxa bilmirsə, tapşırığın sonundakı boş yerlərə API cavabı nümunələrini də əlavə et.")}</li>
          <li>{t("AI-nın verdiyi JSON-u aşağıdakı qutuya yapışdır, “Redaktora qoy” düyməsinə bas.")}</li>
          <li>{t("Lazımsız filtr və sahələri sil, “Yoxla”.")}</li>
        </ol>
        <div><Button type="button" size="sm" onClick={copy}>{copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? t("Kopyalandı") : t("Tapşırığı kopyala")}</Button></div>
        <Textarea rows={5} spellCheck={false} className="font-mono text-xs" placeholder={t("AI-nın cavabını bura yapışdır (JSON, ətrafında izah mətni olsa da olar)")} aria-label={t("AI-nın cavabı")} value={reply} onChange={(e) => setReply(e.target.value)} />
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" variant="outline" disabled={!reply.trim()} onClick={useReply}>{t("Redaktora qoy")}</Button>
          {msg && <p role="status" className={msg.ok ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}

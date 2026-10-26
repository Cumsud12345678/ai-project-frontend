"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getConversation, getConversations, type ConversationMsg, type ConversationRow } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PAGE = 30;

/** Söhbət tarixçəsi: ziyarətçinin sualları və AI-ın cavabları bir yerdə oxunur. */
export function Conversations({ days, enabled }: { days: number; enabled: boolean }) {
  const { t, short } = useI18n();
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [meta, setMeta] = useState<{ hasMore: boolean; nextCursor: string | null }>({ hasMore: false, nextCursor: null });
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ConversationMsg[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const seq = useRef(0);

  const loadFirst = useCallback(() => {
    const id = ++seq.current;
    setError(""); setRows(null); setOpen(null);
    getConversations({ days, limit: PAGE })
      .then((l) => { if (id === seq.current) { setRows(l.conversations); setMeta({ hasMore: l.hasMore, nextCursor: l.nextCursor }); } })
      .catch((e: Error) => { if (id === seq.current) setError(e.message); });
  }, [days]);
  useEffect(() => loadFirst(), [loadFirst]);

  async function more() {
    if (!meta.nextCursor || loadingMore) return;
    const id = seq.current;
    setLoadingMore(true);
    try {
      const l = await getConversations({ days, limit: PAGE, before: meta.nextCursor });
      if (id !== seq.current) return;
      setRows((cur) => { const have = new Set((cur ?? []).map((r) => r.sid)); return [...(cur ?? []), ...l.conversations.filter((r) => !have.has(r.sid))]; });
      setMeta({ hasMore: l.hasMore, nextCursor: l.nextCursor });
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingMore(false); }
  }

  function toggle(sid: string) {
    if (open === sid) { setOpen(null); return; }
    setOpen(sid); setMsgs(null);
    getConversation(sid).then((c) => setMsgs(c.messages)).catch((e: Error) => setError(e.message));
  }

  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!rows) return <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{enabled ? t("Bu dövrdə söhbət yoxdur. Söhbətlər vidjetdən yazılan suallardan toplanır.") : t("Sorğuların saxlanması söndürülüb, söhbət tarixçəsi yazılmır.")}</p>;

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((c) => (
          <li key={c.sid}>
            <button type="button" onClick={() => toggle(c.sid)} aria-expanded={open === c.sid} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.first}</span>
                <span className="text-xs text-muted-foreground">{short(c.startedAt)} · {t("{n} mesaj", { n: c.messages })}</span>
              </span>
              {c.unanswered > 0 && <Badge className="shrink-0 bg-amber/15 text-amber">{t("{n} cavabsız", { n: c.unanswered })}</Badge>}
            </button>
            {open === c.sid && (
              <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3">
                {!msgs ? <p className="text-sm text-muted-foreground">{t("Yüklənir…")}</p> : msgs.map((m) => (
                  <div key={m.id} className="flex flex-col gap-1.5 text-sm">
                    <p className="self-end max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-primary px-3 py-1.5 text-primary-foreground">{m.message}</p>
                    <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg border border-border bg-card px-3 py-1.5">
                      {m.error ? <span className="text-destructive">{t("Cavab alınmadı (xəta).")}</span> : m.answer ?? <span className="text-muted-foreground">{t("Cavab mətni saxlanmayıb.")}</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">{short(m.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {meta.hasMore && <Button type="button" variant="outline" className="self-start" onClick={more} disabled={loadingMore}>{loadingMore ? t("Yüklənir…") : t("Daha çox göstər")}</Button>}
    </div>
  );
}

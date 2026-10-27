"use client";
import { useEffect } from "react";
import { reportClientError } from "@/lib/api";

/** Brauzerdə tutulmamış xətaları (JS xətası, rədd edilmiş promise) admin jurnalına göndərir. Səhifədə ən çox 5 xəta, təkrarlar atılır. */
export function ErrorReporter() {
  useEffect(() => {
    const seen = new Set<string>();
    const send = (message: string, stack?: string) => {
      const key = message.slice(0, 120);
      if (seen.has(key) || seen.size >= 5) return;
      seen.add(key);
      reportClientError({ message, stack, page: location.pathname });
    };
    const onError = (e: ErrorEvent) => send(e.message || "Script error", e.error instanceof Error ? e.error.stack : undefined);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      send(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}

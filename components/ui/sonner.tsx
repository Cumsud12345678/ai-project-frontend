"use client";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** shadcn/ui "Sonner" toast: bütün panelin bildirişləri buradan göstərilir (toast.success / toast.error). */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      richColors
      duration={4000}
      toastOptions={{ classNames: { toast: "font-sans", title: "text-sm font-medium", description: "text-xs" } }}
      style={{ "--normal-bg": "var(--card)", "--normal-text": "var(--foreground)", "--normal-border": "var(--border)", fontFamily: "var(--font-sans)" } as React.CSSProperties}
      {...props}
    />
  );
}

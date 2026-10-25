"use client";
import { createElement, useEffect, useRef, useState } from "react";

type Variant = "up" | "left" | "right" | "scale";

/** Ekrana girəndə yumşaq görünür (opacity + yerdəyişmə + ölçü). Bir dəfə işləyir; hərəkəti azaldanlarda dərhal görünür. */
export function Reveal({ children, as = "div", variant = "up", delay = 0, className = "" }: {
  children: React.ReactNode; as?: "div" | "li" | "h1" | "h2" | "p" | "ul"; variant?: Variant; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return createElement(as, { ref, className: `l-reveal l-${variant} ${shown ? "is-in" : ""} ${className}`, style: { "--d": `${delay}ms` } as React.CSSProperties }, children);
}

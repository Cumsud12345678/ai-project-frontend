import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...p }: React.ComponentProps<"section">) => (
  <section className={cn("rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,.04)]", className)} {...p} />
);
export const CardHeader = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-1 border-b border-border px-5 py-4", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.ComponentProps<"h2">) => (
  <h2 className={cn("text-[15px] font-semibold", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.ComponentProps<"p">) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div className={cn("px-5 py-4", className)} {...p} />
);

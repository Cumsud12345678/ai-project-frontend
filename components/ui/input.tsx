import * as React from "react";
import { cn } from "@/lib/utils";

const field = "w-full rounded-md border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60";

export const Input = ({ className, ...p }: React.ComponentProps<"input">) => <input className={cn(field, "h-10", className)} {...p} />;
export const Textarea = ({ className, ...p }: React.ComponentProps<"textarea">) => <textarea className={cn(field, "min-h-24 py-2", className)} {...p} />;
export const Label = ({ className, ...p }: React.ComponentProps<"label">) => <label className={cn("text-sm font-medium", className)} {...p} />;

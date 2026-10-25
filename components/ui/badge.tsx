import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = ({ className, ...p }: React.ComponentProps<"span">) => (
  <span className={cn("inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground", className)} {...p} />
);

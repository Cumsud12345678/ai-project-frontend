import * as React from "react";
import { cn } from "@/lib/utils";

/** Yüklənən məzmunun yerini tutan boz blok. Ekran oxuyucudan gizlidir; "azaldılmış hərəkət" seçilibsə animasiya yoxdur. */
export const Skeleton = ({ className, ...p }: React.ComponentProps<"div">) => (
  <div aria-hidden className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)} {...p} />
);

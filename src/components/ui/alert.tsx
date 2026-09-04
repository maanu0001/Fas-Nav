import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex gap-3 rounded-lg border px-4 py-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-sky-200 bg-sky-50 text-sky-900",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
        error: "border-red-200 bg-red-50 text-red-900",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
} as const;

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & { title?: string };

export function Alert({ className, variant = "info", title, children, ...props }: AlertProps) {
  const Icon = icons[variant ?? "info"];
  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
      <Icon aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}

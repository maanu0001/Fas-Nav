import * as React from "react";

import { cn } from "@/lib/utils";

const base =
  "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, "h-10", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(base, "min-h-20 resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(base, "h-10 pr-8", className)} {...props} />
));
Select.displayName = "Select";

export function Label({
  className,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("block text-sm font-medium text-slate-700", className)}
      {...props}
    >
      {props.children}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </label>
  );
}

export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{message}</p>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>;
}

/** Feld-Wrapper mit Label, Hinweis und Fehlermeldung. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {hint ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError message={error} />
    </div>
  );
}

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 rounded border-input text-primary accent-primary-700",
        className,
      )}
      {...props}
    />
  );
}

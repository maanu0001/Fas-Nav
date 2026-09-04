"use client";

import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast muss innerhalb von <ToastProvider> verwendet werden.");
  return ctx;
}

const icons = { success: CheckCircle2, error: TriangleAlert, info: Info } as const;

const styles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-card text-emerald-900",
  error: "border-red-200 bg-card text-red-900",
  info: "border-border bg-card text-foreground",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const remove = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++counter.current;
      setItems((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-live="polite"
      >
        {items.map((item) => {
          const Icon = icons[item.variant];
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lift animate-fade-in",
                styles[item.variant],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1">{item.message}</p>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Meldung schliessen"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

import type { ReactNode } from "react";

/** Einheitliches Layout für rechtliche Seiten. */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <div className="container py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        {updatedAt ? (
          <p className="mt-2 text-sm text-muted-foreground">Stand: {updatedAt}</p>
        ) : null}
        <div className="prose-fasnav mt-8 space-y-6 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-semibold [&_li]:mb-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import type { SectionButton, SectionItem } from "@/lib/queries/homepage";
import { cn } from "@/lib/utils";

export type EditableSection = {
  id: string;
  key: string;
  type: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  isVisible: boolean;
  sortOrder: number;
  data: {
    buttons?: SectionButton[];
    items?: SectionItem[];
    limit?: number;
  };
};

const TYPE_LABELS: Record<string, string> = {
  HERO: "Hero / Welcome Banner",
  INFO: "Informationssektion",
  FEATURED_CARNIVALS: "Featured Fasnachten",
  FEATURED_GUGGEN: "Featured Guggen",
  UPCOMING_EVENTS: "Kommende Veranstaltungen",
  CANTON_GRID: "Kantonsübersicht",
  ORGANISATION_CTA: "Aufruf für Organisationen",
  CTA: "Call-to-Action",
  FAQ: "Häufige Fragen",
  STATS: "Kennzahlen",
};

/** Strukturierter Editor für eine Homepage-Sektion – bewusst kein HTML-Editor. */
export function HomepageSectionEditor({ section }: { section: EditableSection }) {
  const router = useRouter();
  const { toast } = useToast();

  const [state, setState] = React.useState({
    eyebrow: section.eyebrow ?? "",
    title: section.title ?? "",
    subtitle: section.subtitle ?? "",
    isVisible: section.isVisible,
    buttons: section.data.buttons ?? [],
    items: section.data.items ?? [],
    limit: section.data.limit,
  });
  const [pending, setPending] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const supportsButtons = ["HERO", "ORGANISATION_CTA", "CTA"].includes(section.type);
  const supportsItems = ["INFO", "ORGANISATION_CTA", "FAQ"].includes(section.type);
  const supportsLimit = [
    "FEATURED_CARNIVALS",
    "FEATURED_GUGGEN",
    "UPCOMING_EVENTS",
  ].includes(section.type);

  async function save() {
    setPending(true);
    try {
      await apiRequest(`/api/homepage/${section.key}`, {
        method: "PATCH",
        body: {
          eyebrow: state.eyebrow || null,
          title: state.title || null,
          subtitle: state.subtitle || null,
          isVisible: state.isVisible,
          data: {
            ...(supportsButtons ? { buttons: state.buttons } : {}),
            ...(supportsItems ? { items: state.items } : {}),
            ...(supportsLimit && state.limit ? { limit: state.limit } : {}),
          },
        },
      });
      toast("Sektion gespeichert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function toggleVisibility() {
    const next = !state.isVisible;
    setState((s) => ({ ...s, isVisible: next }));
    try {
      await apiRequest(`/api/homepage/${section.key}`, {
        method: "PATCH",
        body: { isVisible: next },
      });
      toast(next ? "Sektion eingeblendet." : "Sektion ausgeblendet.", "success");
      router.refresh();
    } catch (error) {
      setState((s) => ({ ...s, isVisible: !next }));
      toast(errorMessage(error), "error");
    }
  }

  return (
    <Card className={cn("p-5", !state.isVisible && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-primary-900">
            {TYPE_LABELS[section.type] ?? section.type}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Position {section.sortOrder} · Schlüssel {section.key}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={toggleVisibility}>
            {state.isVisible ? <Eye /> : <EyeOff />}
            {state.isVisible ? "Sichtbar" : "Ausgeblendet"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Schliessen" : "Bearbeiten"}
          </Button>
        </div>
      </div>

      {!expanded ? (
        <p className="mt-3 text-sm text-slate-600">
          {state.title || <span className="text-muted-foreground">Ohne Titel</span>}
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          <Field label="Überzeile" htmlFor={`${section.key}-eyebrow`}>
            <Input
              id={`${section.key}-eyebrow`}
              value={state.eyebrow}
              onChange={(e) => setState((s) => ({ ...s, eyebrow: e.target.value }))}
              maxLength={80}
            />
          </Field>

          <Field label="Titel" htmlFor={`${section.key}-title`}>
            <Input
              id={`${section.key}-title`}
              value={state.title}
              onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
              maxLength={160}
            />
          </Field>

          <Field label="Untertitel" htmlFor={`${section.key}-subtitle`}>
            <Textarea
              id={`${section.key}-subtitle`}
              value={state.subtitle}
              onChange={(e) => setState((s) => ({ ...s, subtitle: e.target.value }))}
              rows={3}
              maxLength={300}
            />
          </Field>

          {supportsLimit ? (
            <Field
              label="Anzahl Einträge"
              htmlFor={`${section.key}-limit`}
              hint="Wie viele Einträge auf der Startseite erscheinen."
            >
              <Select
                id={`${section.key}-limit`}
                value={String(state.limit ?? 3)}
                onChange={(e) => setState((s) => ({ ...s, limit: Number(e.target.value) }))}
              >
                {[3, 6, 9, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {supportsButtons ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Buttons</legend>
              <div className="space-y-2">
                {state.buttons.map((button, index) => (
                  <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row">
                    <Input
                      value={button.label}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          buttons: s.buttons.map((b, i) =>
                            i === index ? { ...b, label: e.target.value } : b,
                          ),
                        }))
                      }
                      placeholder="Beschriftung"
                      aria-label="Button-Beschriftung"
                      maxLength={60}
                    />
                    <Input
                      value={button.href}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          buttons: s.buttons.map((b, i) =>
                            i === index ? { ...b, href: e.target.value } : b,
                          ),
                        }))
                      }
                      placeholder="/agenda"
                      aria-label="Ziel"
                      maxLength={300}
                    />
                    <Select
                      value={button.variant ?? "primary"}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          buttons: s.buttons.map((b, i) =>
                            i === index
                              ? { ...b, variant: e.target.value as SectionButton["variant"] }
                              : b,
                          ),
                        }))
                      }
                      aria-label="Darstellung"
                      className="sm:w-36"
                    >
                      <option value="primary">Primär</option>
                      <option value="secondary">Sekundär</option>
                      <option value="ghost">Dezent</option>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          buttons: s.buttons.filter((_, i) => i !== index),
                        }))
                      }
                      aria-label="Button entfernen"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                {state.buttons.length < 4 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        buttons: [...s.buttons, { label: "", href: "/", variant: "primary" }],
                      }))
                    }
                  >
                    <Plus />
                    Button hinzufügen
                  </Button>
                ) : null}
              </div>
            </fieldset>
          ) : null}

          {supportsItems ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">
                {section.type === "FAQ" ? "Fragen und Antworten" : "Inhaltspunkte"}
              </legend>
              <div className="space-y-2">
                {state.items.map((item, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex gap-2">
                      <Input
                        value={item.title}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            items: s.items.map((it, i) =>
                              i === index ? { ...it, title: e.target.value } : it,
                            ),
                          }))
                        }
                        placeholder={section.type === "FAQ" ? "Frage" : "Titel"}
                        aria-label="Titel"
                        maxLength={120}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            items: s.items.filter((_, i) => i !== index),
                          }))
                        }
                        aria-label="Eintrag entfernen"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <Textarea
                      value={item.body}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          items: s.items.map((it, i) =>
                            i === index ? { ...it, body: e.target.value } : it,
                          ),
                        }))
                      }
                      placeholder={section.type === "FAQ" ? "Antwort" : "Text"}
                      aria-label="Text"
                      rows={2}
                      maxLength={600}
                    />
                  </div>
                ))}

                {state.items.length < 8 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setState((s) => ({ ...s, items: [...s.items, { title: "", body: "" }] }))
                    }
                  >
                    <Plus />
                    Eintrag hinzufügen
                  </Button>
                ) : null}
              </div>
            </fieldset>
          ) : null}

          <Button onClick={save} disabled={pending}>
            {pending ? <Spinner /> : <Save />}
            Sektion speichern
          </Button>
        </div>
      )}
    </Card>
  );
}

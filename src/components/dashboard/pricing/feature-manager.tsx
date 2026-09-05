"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

export type FeatureRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

/**
 * Leistungen verwalten – zugleich die Zeilen der Vergleichstabelle.
 *
 * Die Reihenfolge wird über Pfeile gesetzt und in einem Zug gespeichert; das
 * ist auf dem Handy und mit der Tastatur bedienbar, anders als Ziehen und
 * Ablegen. Der Schlüssel ist zusätzlich die Kennung, über die das Abonnement
 * Funktionen freischaltet – deshalb der Warnhinweis beim Ändern.
 */
export function FeatureManager({ features }: { features: FeatureRow[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [liste, setListe] = React.useState(features);
  const [pending, setPending] = React.useState(false);
  const [loeschen, setLoeschen] = React.useState<FeatureRow | null>(null);
  const [neu, setNeu] = React.useState({ key: "", name: "", description: "" });
  const [fehler, setFehler] = React.useState<Record<string, string>>({});

  React.useEffect(() => setListe(features), [features]);

  const geaendert = React.useMemo(
    () => liste.some((f, i) => f.id !== features[i]?.id),
    [liste, features],
  );

  function verschieben(index: number, richtung: -1 | 1) {
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= liste.length) return;
    const kopie = [...liste];
    [kopie[index], kopie[ziel]] = [kopie[ziel], kopie[index]];
    setListe(kopie);
  }

  async function reihenfolgeSpeichern() {
    setPending(true);
    try {
      await apiRequest("/api/features", {
        method: "PATCH",
        body: { order: liste.map((f, i) => ({ id: f.id, sortOrder: i })) },
      });
      toast("Reihenfolge gespeichert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function anlegen(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setFehler({});
    try {
      await apiRequest("/api/features", {
        method: "POST",
        // Ans Ende der Liste, in Zehnerschritten wie die bestehenden Werte.
        body: {
          ...neu,
          sortOrder: liste.reduce((max, f) => Math.max(max, f.sortOrder), 0) + 10,
        },
      });
      toast("Leistung angelegt.", "success");
      setNeu({ key: "", name: "", description: "" });
      router.refresh();
    } catch (error) {
      setFehler(fieldErrors(error));
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function umbenennen(feature: FeatureRow, name: string) {
    if (name.trim() === feature.name) return;
    try {
      await apiRequest(`/api/features/${feature.id}`, { method: "PATCH", body: { name } });
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    }
  }

  async function entfernen() {
    if (!loeschen) return;
    setPending(true);
    try {
      const antwort = await apiRequest<{ betroffeneTarife: number }>(
        `/api/features/${loeschen.id}`,
        { method: "DELETE" },
      );
      toast(
        antwort.betroffeneTarife
          ? `Leistung gelöscht. Sie war in ${antwort.betroffeneTarife} Tarif(en) hinterlegt.`
          : "Leistung gelöscht.",
        "success",
      );
      setLoeschen(null);
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {liste.map((feature, index) => (
          <div
            key={feature.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5"
          >
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => verschieben(index, -1)}
                disabled={index === 0}
                aria-label={`${feature.name} nach oben`}
                className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => verschieben(index, 1)}
                disabled={index === liste.length - 1}
                aria-label={`${feature.name} nach unten`}
                className="rounded p-0.5 text-muted-foreground hover:bg-secondary disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            <Input
              defaultValue={feature.name}
              aria-label={`Bezeichnung von ${feature.name}`}
              onBlur={(e) => umbenennen(feature, e.target.value)}
              className="h-9 min-w-0 flex-1"
            />
            <code className="shrink-0 rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
              {feature.key}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLoeschen(feature)}
              aria-label={`${feature.name} löschen`}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        {liste.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Noch keine Leistungen erfasst. Lege unten die erste an.
          </p>
        ) : null}
      </div>

      {geaendert ? (
        <Button onClick={reihenfolgeSpeichern} disabled={pending} variant="primary">
          <Save />
          Reihenfolge speichern
        </Button>
      ) : null}

      <form onSubmit={anlegen} className="rounded-lg border border-border bg-muted/40 p-4">
        <h3 className="mb-3 text-sm font-semibold">Neue Leistung</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Bezeichnung" htmlFor="feature-name" required error={fehler.name}>
            <Input
              id="feature-name"
              value={neu.name}
              onChange={(e) => setNeu({ ...neu, name: e.target.value })}
              placeholder="Eigene Organisationsseite"
              required
            />
          </Field>
          <Field
            label="Schlüssel"
            htmlFor="feature-key"
            required
            error={fehler.key}
            hint="Kleinbuchstaben, Zahlen, Unterstrich. Schaltet die Funktion im Abonnement frei."
          >
            <Input
              id="feature-key"
              value={neu.key}
              onChange={(e) => setNeu({ ...neu, key: e.target.value })}
              placeholder="gallery"
              required
            />
          </Field>
          <Field label="Erläuterung" htmlFor="feature-desc" error={fehler.description}>
            <Input
              id="feature-desc"
              value={neu.description}
              onChange={(e) => setNeu({ ...neu, description: e.target.value })}
              placeholder="Optionaler Zusatz unter der Bezeichnung"
            />
          </Field>
        </div>
        <Button type="submit" disabled={pending} className="mt-3">
          <Plus />
          Leistung anlegen
        </Button>
      </form>

      <ConfirmDialog
        open={loeschen !== null}
        onClose={() => setLoeschen(null)}
        onConfirm={entfernen}
        pending={pending}
        title={`„${loeschen?.name}“ löschen?`}
        description="Die Leistung verschwindet aus allen Tarifen und aus der Vergleichstabelle. Organisationen verlieren damit die zugehörige Funktion."
      />
    </div>
  );
}

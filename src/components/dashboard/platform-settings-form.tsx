"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";

type Setting = { key: string; label: string; group: string; value: string };

const GROUP_LABELS: Record<string, string> = {
  general: "Allgemein",
  contact: "Kontakt",
  pricing: "Preise und Texte",
};

/** Bearbeitet die Key-Value-Einstellungen der Plattform. */
export function PlatformSettingsForm({ settings }: { settings: Setting[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [values, setValues] = React.useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [pending, setPending] = React.useState(false);

  const groups = React.useMemo(() => {
    const map = new Map<string, Setting[]>();
    for (const setting of settings) {
      map.set(setting.group, [...(map.get(setting.group) ?? []), setting]);
    }
    return [...map.entries()];
  }, [settings]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await apiRequest("/api/settings", {
        method: "PUT",
        body: {
          settings: Object.entries(values).map(([key, value]) => ({ key, value })),
        },
      });
      toast("Einstellungen gespeichert.", "success");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  if (!settings.length) {
    return <p className="text-sm text-muted-foreground">Keine Einstellungen vorhanden.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {groups.map(([group, items]) => (
        <fieldset key={group}>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {GROUP_LABELS[group] ?? group}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((setting) => {
              const long = setting.value.length > 90;
              return (
                <Field
                  key={setting.key}
                  label={setting.label}
                  htmlFor={setting.key}
                  className={long ? "sm:col-span-2" : undefined}
                >
                  {long ? (
                    <Textarea
                      id={setting.key}
                      value={values[setting.key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [setting.key]: e.target.value }))
                      }
                      rows={3}
                      maxLength={1000}
                    />
                  ) : (
                    <Input
                      id={setting.key}
                      value={values[setting.key] ?? ""}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [setting.key]: e.target.value }))
                      }
                      maxLength={500}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </fieldset>
      ))}

      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : <Save />}
        Einstellungen speichern
      </Button>
    </form>
  );
}

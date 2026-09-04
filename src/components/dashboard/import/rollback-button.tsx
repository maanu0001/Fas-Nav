"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";

type RollbackSummary = {
  deletedOrganizations: number;
  keptOrganizations: number;
  deletedEvents: number;
  notRolledBackUpdates: number;
  kept: { name: string; reason: string }[];
};

/** Macht einen Importlauf rückgängig, soweit dies gefahrlos möglich ist. */
export function RollbackButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [summary, setSummary] = React.useState<RollbackSummary | null>(null);

  async function rollback() {
    setPending(true);
    try {
      const result = await apiRequest<RollbackSummary>(`/api/import/${jobId}/rollback`, {
        method: "POST",
      });
      setSummary(result);
      setOpen(false);
      toast(
        `${result.deletedOrganizations} Organisationen entfernt.`,
        "success",
      );
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <RotateCcw />
        Import rückgängig machen
      </Button>

      {summary ? (
        <Alert variant="info" className="mt-4" title="Rückgängig gemacht">
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>{summary.deletedOrganizations} neu angelegte Organisationen entfernt</li>
            <li>{summary.deletedEvents} zugehörige Agenda-Einträge entfernt</li>
            {summary.keptOrganizations > 0 ? (
              <li>
                {summary.keptOrganizations} Organisationen behalten, weil sie inzwischen
                bearbeitet oder zugewiesen wurden
              </li>
            ) : null}
            {summary.notRolledBackUpdates > 0 ? (
              <li>
                {summary.notRolledBackUpdates} Aktualisierungen bestehender Organisationen
                wurden nicht zurückgesetzt
              </li>
            ) : null}
          </ul>
        </Alert>
      ) : null}

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={rollback}
        pending={pending}
        title="Import rückgängig machen?"
        description="Entfernt werden ausschliesslich Organisationen, die dieser Lauf neu angelegt hat und die seither weder bearbeitet noch einem Konto zugewiesen wurden. Aktualisierungen bestehender Organisationen bleiben erhalten."
        confirmLabel={pending ? "Wird ausgeführt …" : "Rückgängig machen"}
      />
    </>
  );
}

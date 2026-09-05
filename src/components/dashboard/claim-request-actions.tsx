"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { CLAIM_REQUEST_STATUS_LABELS } from "@/lib/constants";

/**
 * Bearbeitungsstand einer Übernahmeanfrage setzen.
 *
 * Genehmigen legt bewusst keine Zuordnung an – das geschieht in der
 * Zugriffsverwaltung der Organisation, siehe Endpunkt. Die Oberfläche sagt das
 * ausdrücklich, damit niemand den zweiten Schritt vergisst.
 */
export function ClaimRequestActions({
  requestId,
  status: initialStatus,
  organizationId,
}: {
  requestId: string;
  status: string;
  organizationId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [status, setStatus] = React.useState(initialStatus);
  const [pending, setPending] = React.useState(false);

  async function speichern(naechster: string) {
    const vorher = status;
    setStatus(naechster);
    setPending(true);
    try {
      await apiRequest(`/api/claim-requests/${requestId}`, {
        method: "PATCH",
        body: { status: naechster },
      });
      toast(
        naechster === "APPROVED"
          ? "Anfrage genehmigt. Erteile den Zugriff nun in der Zugriffsverwaltung der Organisation."
          : naechster === "REJECTED"
            ? "Anfrage abgelehnt. Das Profil steht wieder für Anfragen offen."
            : "Status gespeichert.",
        "success",
      );
      router.refresh();
    } catch (error) {
      setStatus(vorher);
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="Bearbeitungsstand" htmlFor="claim-status" className="sm:w-56">
        <Select
          id="claim-status"
          value={status}
          disabled={pending}
          onChange={(e) => speichern(e.target.value)}
        >
          {Object.entries(CLAIM_REQUEST_STATUS_LABELS).map(([wert, label]) => (
            <option key={wert} value={wert}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/organisationen/${organizationId}`)}
      >
        Zugriff erteilen
      </Button>
    </div>
  );
}

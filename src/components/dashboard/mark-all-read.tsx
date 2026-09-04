"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";

export function MarkAllReadButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function markAll() {
    setPending(true);
    try {
      await apiRequest("/api/notifications", { method: "POST", body: {} });
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={markAll} disabled={pending}>
      {pending ? <Spinner /> : <CheckCheck />}
      Alle als gelesen markieren
    </Button>
  );
}

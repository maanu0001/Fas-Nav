"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";

export function CompleteOnboardingButton({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function complete() {
    setPending(true);
    try {
      await apiRequest(`/api/organizations/${organizationId}/onboarding`, { method: "POST" });
      toast("Einrichtung abgeschlossen.", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
      setPending(false);
    }
  }

  return (
    <Button onClick={complete} disabled={pending}>
      {pending ? <Spinner /> : <CheckCircle2 />}
      Einrichtung abschliessen
    </Button>
  );
}

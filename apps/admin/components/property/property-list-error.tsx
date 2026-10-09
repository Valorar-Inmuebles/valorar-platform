"use client";

import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";

export function PropertyListError({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="space-y-3" role="alert">
      <ApiErrorPanel message={message} />
      <Button variant="secondary" onClick={() => router.refresh()}>
        Reintentar
      </Button>
    </div>
  );
}

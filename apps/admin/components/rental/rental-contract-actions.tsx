"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/button";
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { transitionRentalContractAction } from "@/lib/api/rental-actions";
import type { RentalContractGeneral } from "@/lib/api/types/rental";

type Action = "end" | "cancel";
const COPY = {
  end: [
    "Finalizar contrato",
    "El contrato quedará finalizado y la acción se registrará en el historial.",
    "Finalizar",
  ],
  cancel: [
    "Cancelar contrato",
    "El contrato quedará cancelado y la acción se registrará en el historial.",
    "Cancelar contrato",
  ],
} satisfies Record<Action, [string, string, string]>;

export function RentalContractActions({
  contract,
  canUpdate,
  canEnd,
  canRenew,
}: {
  contract: RentalContractGeneral;
  canUpdate: boolean;
  canEnd: boolean;
  canRenew: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [action, setAction] = useState<Action | null>(null);
  const [pending, setPending] = useState(false);
  const items = [
    ...(canRenew &&
    ["ACTIVE", "ENDED"].includes(contract.status) &&
    (!contract.renewedContract || contract.renewedContract.status === "DRAFT")
      ? [
          {
            id: "renew",
            label: contract.renewedContract
              ? "Continuar renovación"
              : "Renovar contrato",
            onSelect: () => router.push(`/alquileres/${contract.id}/renovar`),
          },
        ]
      : []),
    ...(canEnd && contract.status === "ACTIVE"
      ? [
          {
            id: "end",
            label: "Finalizar contrato",
            onSelect: () => setAction("end" as const),
          },
        ]
      : []),
    ...(canEnd && ["DRAFT", "ACTIVE"].includes(contract.status)
      ? [
          {
            id: "cancel",
            label: "Cancelar contrato",
            destructive: true,
            onSelect: () => setAction("cancel" as const),
          },
        ]
      : []),
  ];

  async function confirm() {
    if (!action) return;
    setPending(true);
    try {
      const result = await transitionRentalContractAction(contract.id, action);
      if (!result.ok) return toast.error(result.error);
      toast.success(
        action === "end" ? "Contrato finalizado." : "Contrato cancelado.",
      );
      setAction(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canUpdate ? (
          <Link href={`/alquileres/${contract.id}/editar`}>
            <Button variant="secondary">Editar contrato</Button>
          </Link>
        ) : null}
        {items.length ? (
          <DropdownMenu
            ariaLabel="Más acciones del contrato"
            trigger={<Button variant="secondary">Más acciones</Button>}
            items={items}
          />
        ) : null}
      </div>
      <ConfirmModal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={() => void confirm()}
        title={action ? COPY[action][0] : "Confirmar acción"}
        description={action ? COPY[action][1] : ""}
        confirmLabel={action ? COPY[action][2] : "Confirmar"}
        loading={pending}
      />
    </>
  );
}

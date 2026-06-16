"use client";

import { useRef } from "react";
import {
  SidePanel,
  SidePanelHeader,
  SidePanelTitle,
  SidePanelDescription,
  SidePanelContent,
} from "@/components/ui/side-panel";
import { ClienteForm } from "@/components/modules/clientes/ClienteForm";
import { createCliente, getCliente } from "@/lib/api/cliente.api";
import { formatClienteDisplayName } from "@/lib/persona-display";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (cliente: { id: string; label: string }) => void;
};

export function ClienteCreateSidePanel({ open, onClose, onCreated }: Props) {
  const createdClienteIdRef = useRef<string | null>(null);

  return (
    <SidePanel open={open} onClose={onClose} width="xl">
      <SidePanelHeader>
        <SidePanelTitle>Nuevo cliente</SidePanelTitle>
        <SidePanelDescription>
          Los datos se guardan como cliente y quedan disponibles para este caso.
        </SidePanelDescription>
      </SidePanelHeader>

      <SidePanelContent>
        <ClienteForm
          mode="create"
          cancelLabel="Cancelar"
          onCancel={onClose}
          submitAction={async (payload) => {
            const result = await createCliente(payload);
            createdClienteIdRef.current = result.id;
          }}
          onSuccess={async () => {
            const id = createdClienteIdRef.current;
            if (!id) return;

            const cliente = await getCliente(id);
            const label = formatClienteDisplayName(cliente);
            onCreated({ id, label });
            createdClienteIdRef.current = null;
            onClose();
          }}
        />
      </SidePanelContent>
    </SidePanel>
  );
}

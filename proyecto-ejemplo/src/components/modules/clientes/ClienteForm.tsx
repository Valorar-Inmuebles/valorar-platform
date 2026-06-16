"use client";

import { useRouter } from "next/navigation";

import { AgendaPanel } from "@/components/modules/agenda";
import { ComentariosPanel } from "@/components/modules/comentarios";
import { DocumentosPanel } from "@/components/modules/documentos";
import { PersonaForm } from "@/components/modules/personas/persona-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createCliente, updateCliente } from "@/lib/api/cliente.api";
import type { ComponentProps } from "react";

type PersonaFormCreateExtras = Pick<
  ComponentProps<typeof PersonaForm>,
  | "onSuccess"
  | "onCancel"
  | "cancelLabel"
  | "submitAction"
  | "backHref"
  | "submitLabel"
  | "successMessage"
>;

type Props =
  | ({ mode: "create" } & PersonaFormCreateExtras)
  | { mode: "view"; clienteId: string; personaId: string }
  | { mode: "edit"; clienteId: string; personaId: string };

export function ClienteForm(props: Props) {
  const router = useRouter();

  if (props.mode === "create") {
    const {
      mode: _mode,
      submitAction = createCliente,
      backHref = "/clientes",
      submitLabel = "Crear cliente",
      successMessage = "Cliente creado",
      onSuccess,
      onCancel,
      cancelLabel,
    } = props;

    return (
      <PersonaForm
        mode="create"
        submitAction={submitAction}
        backHref={backHref}
        submitLabel={submitLabel}
        successMessage={successMessage}
        onSuccess={onSuccess}
        onCancel={onCancel}
        cancelLabel={cancelLabel}
      />
    );
  }

  const isView = props.mode === "view";
  const { clienteId, personaId } = props;

  return (
    <div className="space-y-8">
      <PageHeader
        back
        backHref="/clientes"
        title={isView ? "Ver Cliente" : "Editar Cliente"}
        breadcrumb={[
          { label: "Clientes", href: "/clientes" },
          { label: isView ? "Ver" : "Editar" },
        ]}
        actions={
          isView ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/clientes")}
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => router.push(`/clientes/${clienteId}?edit=1`)}
              >
                Editar
              </Button>
            </>
          ) : undefined
        }
      />

      <PersonaForm
        mode={isView ? "view" : "edit"}
        id={personaId}
        submitAction={(payload) => updateCliente(clienteId, payload)}
        backHref="/clientes"
        submitLabel="Guardar cambios"
        successMessage="Cliente actualizado"
        afterDomicilios={
          <div className="space-y-6">
            <DocumentosPanel
              entidadTipo="cliente"
              entidadId={clienteId}
              disabled={isView}
            />
            <AgendaPanel
              entidadTipo="cliente"
              entidadId={clienteId}
            />
            <ComentariosPanel
              entidadTipo="cliente"
              entidadId={clienteId}
              botonNuevoComentario
            />
          </div>
        }
      />
    </div>
  );
}

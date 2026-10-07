"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useState, useTransition } from "react";

import { Button } from "@repo/ui/button";
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { ConfirmModal } from "@repo/ui/modal";

import { useToast } from "@repo/ui/toast";

import { PropertyArchiveModalContent } from "@/components/property/property-archive-modal-content";

import {
  archivePropertyAction,
  restorePropertyAction,
} from "@/lib/api/property-actions";

import type { AdminProperty } from "@/lib/api/types/property";

type PropertyRowActionsProps = {
  property: AdminProperty;

  publicUrl: string | null;

  activeListingsCount?: number;
};

type PropertyLifecycleActionsProps = {
  property: AdminProperty;
  activeListingsCount?: number;
  presentation?: "buttons" | "menu";
};

export function PropertyLifecycleActions({
  property,
  activeListingsCount = 0,
  presentation = "buttons",
}: PropertyLifecycleActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archivePropertyAction(property.id);
      setShowArchiveModal(false);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Propiedad archivada correctamente.");
      router.refresh();
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restorePropertyAction(property.id);
      setShowRestoreModal(false);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Propiedad restaurada correctamente.");
      router.refresh();
    });
  };

  const lifecycleAction = property.isActive
    ? {
        id: "archive",
        label: "Archivar propiedad",
        destructive: true,
        onSelect: () => setShowArchiveModal(true),
      }
    : {
        id: "restore",
        label: "Restaurar propiedad",
        onSelect: () => setShowRestoreModal(true),
      };

  return (
    <>
      {presentation === "menu" ? (
        <DropdownMenu
          ariaLabel="Más acciones de la propiedad"
          asChild
          disabled={isPending}
          trigger={
            <Button variant="secondary" size="sm">
              Más acciones
            </Button>
          }
          items={[lifecycleAction]}
        />
      ) : property.isActive ? (
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={isPending}
          onClick={() => setShowArchiveModal(true)}
        >
          Archivar
        </Button>
      ) : (
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={isPending}
          onClick={() => setShowRestoreModal(true)}
        >
          Restaurar
        </Button>
      )}

      <ConfirmModal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchive}
        title="Archivar propiedad"
        description={
          <PropertyArchiveModalContent
            propertyTitle={property.title}
            activeListingsCount={activeListingsCount}
          />
        }
        confirmLabel="Archivar"
        cancelLabel="Cancelar"
        loading={isPending}
      />

      <ConfirmModal
        open={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={handleRestore}
        title="Restaurar propiedad"
        description={
          <>
            ¿Restaurar <strong>{property.title}</strong>? Volverá a estar activa
            y podrá gestionarse normalmente.
          </>
        }
        confirmLabel="Restaurar"
        cancelLabel="Cancelar"
        loading={isPending}
      />
    </>
  );
}

export function PropertyRowActions({
  property,
  publicUrl,
  activeListingsCount = 0,
}: PropertyRowActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {publicUrl ? (
        <Link href={publicUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline-secondary" size="sm">
            Ver en web
          </Button>
        </Link>
      ) : null}
      <Link href={`/propiedades/${property.id}`}>
        <Button variant="secondary" size="sm">
          Editar
        </Button>
      </Link>
      <PropertyLifecycleActions
        property={property}
        activeListingsCount={activeListingsCount}
      />
    </div>
  );
}

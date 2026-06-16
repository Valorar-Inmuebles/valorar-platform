"use client";

import {
  PersonasTable,
  type Persona,
  type EntityTableConfig,
} from "@/components/modules/personas/PersonasTable";
import { deleteCliente } from "@/lib/api/cliente.api";

type Props = {
  clientes: Persona[];
};

const CLIENTES_CONFIG: EntityTableConfig = {
  basePath: "/clientes",
  createLabel: "Nuevo Cliente",
  emptyLabel: "No hay clientes registrados",
  deleteTitle: "Eliminar cliente",
  deleteDescription: "¿Estás seguro que querés eliminar este cliente?",
  deleteSuccessMessage: "Cliente eliminado",
  onDelete: deleteCliente,
  displayNameColumnLabel: "Apellido y nombre",
  defaultSortKey: "nombre",
  defaultSortDir: "asc",
  showTipoColumn: false,
  showViewAction: true,
};

export function ClientesTable({ clientes }: Props) {
  return <PersonasTable personas={clientes} config={CLIENTES_CONFIG} />;
}

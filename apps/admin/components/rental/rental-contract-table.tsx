import Link from "next/link";
import { Badge, type BadgeVariant } from "@repo/ui/badge";
import { Card, CardContent } from "@repo/ui/card";
import type {
  RentalContract,
  RentalContractStatus,
} from "@/lib/api/types/rental";

const STATUS: Record<
  RentalContractStatus,
  { label: string; variant: BadgeVariant }
> = {
  DRAFT: { label: "Borrador", variant: "neutral" },
  ACTIVE: { label: "Activo", variant: "success" },
  ENDED: { label: "Finalizado", variant: "info" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
};

export function RentalContractTable({
  contracts,
}: {
  contracts: RentalContract[];
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Inmueble</th>
                <th className="px-4 py-3 font-medium">Inquilino</th>
                <th className="px-4 py-3 font-medium">Vigencia</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  className="border-b border-border last:border-0 hover:bg-zinc-50/80"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/alquileres/${contract.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {contract.propertyAddressSnapshot}
                    </Link>
                    <p className="text-xs text-muted">
                      {contract.propertyLocalitySnapshot || "Referencia manual"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {contract.parties
                      .filter((party) => party.role === "RENTER")
                      .map((party) => party.contact.name)
                      .join(", ") || "Sin asignar"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {contract.startsOn.slice(0, 10)}
                    {contract.endsOn
                      ? ` — ${contract.endsOn.slice(0, 10)}`
                      : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS[contract.status].variant}>
                      {STATUS[contract.status].label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

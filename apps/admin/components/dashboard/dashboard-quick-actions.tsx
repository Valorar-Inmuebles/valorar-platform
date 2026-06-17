import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { getPublicWebBaseUrl } from "@/lib/property/publishability";

export function DashboardQuickActions() {
  const publicWebUrl = getPublicWebBaseUrl();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Acciones rápidas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Link href="/propiedades/crear">
          <Button className="w-full">Nueva propiedad</Button>
        </Link>
        <Link href="/propiedades">
          <Button variant="secondary" className="w-full">
            Ver propiedades
          </Button>
        </Link>
        {publicWebUrl ? (
          <Link href={publicWebUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline-secondary" className="w-full">
              Ver sitio web
            </Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

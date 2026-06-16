import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

export default function PropertyNotFound() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Propiedad no encontrada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted">
          La propiedad no existe o no pertenece al tenant configurado.
        </p>
        <Link href="/propiedades">
          <Button variant="secondary">Volver al listado</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

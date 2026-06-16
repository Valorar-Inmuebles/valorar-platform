import Link from "next/link";
import { PlaceholderPanel } from "@/components/shared/placeholder-panel";
import { Card, CardContent, CardList, CardListItem } from "@repo/ui/card";

export default function ConfiguracionPage() {
  return (
    <>
      <PlaceholderPanel
        title="Configuración"
        description="Accesos a ajustes del tenant y del equipo. Seleccioná una sección para continuar."
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Configuración" },
        ]}
      />

      <Card className="mt-6">
        <CardContent className="py-0">
          <CardList>
            <CardListItem>
              <Link
                href="/configuracion/usuarios"
                className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-primary"
              >
                Usuarios
                <span aria-hidden>›</span>
              </Link>
            </CardListItem>
            <CardListItem>
              <Link
                href="/configuracion/inmobiliaria"
                className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-primary"
              >
                Inmobiliaria
                <span aria-hidden>›</span>
              </Link>
            </CardListItem>
          </CardList>
        </CardContent>
      </Card>
    </>
  );
}

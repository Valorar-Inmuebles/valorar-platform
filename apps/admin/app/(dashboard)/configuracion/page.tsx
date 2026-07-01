import Link from "next/link";
import { ConfigSubNav } from "@/components/config/config-sub-nav";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent, CardList, CardListItem } from "@repo/ui/card";

const LINKS = [
  { href: "/configuracion/organizacion", label: "Organización", description: "Datos comerciales, contacto y SEO" },
  { href: "/configuracion/usuarios", label: "Usuarios", description: "Equipo, roles y acceso" },
  { href: "/configuracion/roles", label: "Roles y permisos", description: "Matriz de roles predefinidos" },
  { href: "/configuracion/perfil", label: "Perfil", description: "Tu información personal" },
  { href: "/configuracion/preferencias", label: "Preferencias", description: "Ajustes de experiencia" },
] as const;

export default function ConfiguracionPage() {
  return (
    <PageShell
      title="Configuración"
      description="Administración del tenant y preferencias personales."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Configuración" },
      ]}
      subNav={<ConfigSubNav />}
    >
      <Card>
        <CardContent className="py-0">
          <CardList>
            {LINKS.map((link) => (
              <CardListItem key={link.href}>
                <Link
                  href={link.href}
                  className="flex w-full items-center justify-between gap-4 py-1 text-sm"
                >
                  <span>
                    <span className="font-medium text-foreground">{link.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{link.description}</span>
                  </span>
                  <span aria-hidden className="text-muted">›</span>
                </Link>
              </CardListItem>
            ))}
          </CardList>
        </CardContent>
      </Card>
    </PageShell>
  );
}

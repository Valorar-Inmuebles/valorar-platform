import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Button } from "@repo/ui/button";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          Autenticación pendiente. Esta pantalla es un placeholder del route
          group <code className="text-xs">(auth)</code>.
        </p>
      </CardContent>
      <CardFooter>
        <Link href="/" className="w-full">
          <Button variant="secondary" className="w-full">
            Volver al dashboard
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { cn } from "@/lib/cn";

type LoginFormProps = {
  className?: string;
};

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = "No se pudo iniciar sesión.";

        try {
          const body = (await response.json()) as { message?: string | string[] };
          if (Array.isArray(body.message)) {
            message = body.message.join(". ");
          } else if (body.message) {
            message = body.message;
          }
        } catch {
          // keep default message
        }

        setError(message);
        return;
      }

      const nextPath = searchParams.get("next") || "/";
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Error de conexión. Verificá que la API esté corriendo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Contraseña"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      <div className="border-t border-border pt-5 text-center">
        <p className="text-sm text-muted">¿Necesitás ayuda?</p>
        <a
          href="mailto:contacto@valorar.com.ar"
          className="mt-1 inline-block text-sm font-medium text-brand-green underline-offset-4 transition hover:underline"
        >
          contacto@valorar.com.ar
        </a>
      </div>
    </div>
  );
}

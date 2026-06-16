"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";

export function LoginForm() {
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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}

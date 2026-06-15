"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordResetAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

const initialState = { error: "", success: false };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction as any,
    initialState,
  );

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-zinc-600">
          Si existe una cuenta con ese email, vas a recibir un enlace para
          restablecer tu contraseña. Revisá tu bandeja de entrada y el correo no
          deseado.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-900"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-zinc-500">
        Ingresá el email de tu cuenta. Te enviaremos un enlace para elegir una
        nueva contraseña.
      </p>

      <Input
        name="email"
        type="email"
        label="Email"
        placeholder="tu@empresa.com"
        autoFocus
        required
        autoComplete="email"
        state={state?.error ? "error" : "default"}
      />

      {state?.error ? <ErrorMessage>{state.error}</ErrorMessage> : null}

      <Button
        type="submit"
        size="lg"
        loading={isPending}
        className="mt-1 w-full"
      >
        Enviar enlace
      </Button>

      <p className="text-center">
        <Link
          href="/login"
          className="text-xs text-zinc-400 transition-colors duration-100 hover:text-zinc-600"
        >
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}

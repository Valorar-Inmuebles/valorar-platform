"use client";

import Link from "next/link";
import { useActionState } from "react";

import { updatePasswordAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

const initialState = { error: "" };

type Props = {
  token: string;
};

export function UpdatePasswordForm({ token }: Props) {
  const [state, formAction, isPending] = useActionState(
    updatePasswordAction as any,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <p className="text-sm text-zinc-500">
        Elegí una contraseña nueva para tu cuenta.
      </p>

      <Input
        name="password"
        type="password"
        label="Nueva contraseña"
        placeholder="••••••••"
        autoFocus
        required
        minLength={8}
        autoComplete="new-password"
        state={state?.error ? "error" : "default"}
      />

      <Input
        name="confirmPassword"
        type="password"
        label="Confirmar contraseña"
        placeholder="••••••••"
        required
        minLength={8}
        autoComplete="new-password"
        state={state?.error ? "error" : "default"}
      />

      {state?.error ? <ErrorMessage>{state.error}</ErrorMessage> : null}

      <Button
        type="submit"
        size="lg"
        loading={isPending}
        className="mt-1 w-full"
      >
        Guardar contraseña
      </Button>

      <p className="text-center">
        <Link
          href="/login/recuperar"
          className="text-xs text-zinc-400 transition-colors duration-100 hover:text-zinc-600"
        >
          Solicitar un nuevo enlace
        </Link>
      </p>
    </form>
  );
}

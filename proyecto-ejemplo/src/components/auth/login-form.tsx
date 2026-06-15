"use client"

import Link from "next/link"
import { useActionState } from "react"
import { loginAction } from "@/app/(auth)/login/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ErrorMessage } from "@/components/ui/form-field"

const initialState = { error: "" }

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction as any,
    initialState
  )

  return (
    <form action={formAction} className="space-y-4">
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

      <Input
        name="password"
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        required
        autoComplete="current-password"
        state={state?.error ? "error" : "default"}
      />

      {state?.error && (
        <ErrorMessage>{state.error}</ErrorMessage>
      )}

      <Button
        type="submit"
        size="lg"
        loading={isPending}
        className="mt-1 w-full"
      >
        Ingresar
      </Button>

      <div className="flex items-center justify-between pt-1">
        <Link
          href="/login/recuperar"
          className="text-xs text-zinc-400 transition-colors duration-100 hover:text-zinc-600"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        <button
          type="button"
          className="text-xs text-zinc-400 transition-colors duration-100 hover:text-zinc-600"
        >
          Necesitás ayuda?
        </button>
      </div>
    </form>
  )
}

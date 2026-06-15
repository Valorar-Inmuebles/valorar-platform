"use client";

import { useTransition } from "react";

import { logoutAction } from "@/app/(auth)/login/actions";
import { useToast } from "@/components/ui/toast";

export function useSignOut() {
  const { toast } = useToast();
  const [isSigningOut, startSignOut] = useTransition();

  const signOut = () => {
    startSignOut(async () => {
      const result = await logoutAction();
      if (result?.error) {
        toast.error(result.error, {
          title: "No se pudo cerrar la sesión",
        });
      }
    });
  };

  return { signOut, isSigningOut };
}

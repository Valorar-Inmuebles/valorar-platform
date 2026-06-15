"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

type Props = {
  success?: string;
  error?: string;
};

export function ToastrFeedback({ success, error }: Props) {
  const { toast } = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;

    if (success === "create") {
      toast.success("Tenant creado");
      shownRef.current = true;
      return;
    }

    if (success === "update") {
      toast.success("Tenant actualizado");
      shownRef.current = true;
      return;
    }

    if (success === "delete") {
      toast.success("Tenant eliminado");
      shownRef.current = true;
      return;
    }

    if (error) {
      toast.error("Ocurrió un error");
      shownRef.current = true;
    }
  }, [success, error, toast]);

  return null;
}
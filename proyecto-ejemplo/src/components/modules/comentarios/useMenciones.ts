"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ComentarioUsuarioMencionDto } from "@/lib/types/comentario";

import {
  focusTextareaAt,
  insertTextAtCursor,
} from "./insert-text-at-cursor";
import {
  fetchUsuariosMencionCached,
  getCachedUsuariosMencion,
} from "./usuarios-mencion-cache";

type UseMencionesOptions = {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  mentionTriggerRef: React.RefObject<HTMLElement | null>;
};

export function useMenciones({
  value,
  onChange,
  textareaRef,
  mentionTriggerRef,
}: UseMencionesOptions) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [candidatos, setCandidatos] = useState<ComentarioUsuarioMencionDto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupRef = useRef<HTMLUListElement>(null);
  const requestIdRef = useRef(0);

  const detectMentionQuery = useCallback((text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const atIndex = before.lastIndexOf("@");
    if (atIndex === -1) return null;
    const fragment = before.slice(atIndex + 1);
    if (fragment.includes("\n") || fragment.includes("  ")) return null;
    return { atIndex, fragment };
  }, []);

  const applyCandidatos = useCallback((data: ComentarioUsuarioMencionDto[]) => {
    setCandidatos(data);
    setActiveIndex(0);
  }, []);

  const loadCandidatos = useCallback(async (q: string) => {
    const cached = getCachedUsuariosMencion(q);
    if (cached) {
      applyCandidatos(cached);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setCandidatos([]);

    try {
      const data = await fetchUsuariosMencionCached(q);
      if (requestId !== requestIdRef.current) return;
      applyCandidatos(data);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setCandidatos([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applyCandidatos]);

  useEffect(() => {
    if (!open) return;

    const cached = getCachedUsuariosMencion(query);
    if (cached) {
      applyCandidatos(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadCandidatos(query);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query, loadCandidatos, applyCandidatos]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target)) return;
      if (mentionTriggerRef.current?.contains(target)) return;
      setOpen(false);
      setLoading(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, mentionTriggerRef]);

  const handleChange = useCallback(
    (next: string) => {
      onChange(next);
      const el = textareaRef.current;
      if (!el) return;

      const detected = detectMentionQuery(next, el.selectionStart);
      if (detected) {
        setOpen(true);
        setQuery(detected.fragment);
      } else {
        setOpen(false);
        setQuery("");
        setLoading(false);
      }
    },
    [detectMentionQuery, onChange, textareaRef],
  );

  const openMentionPicker = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      const cursor = el.selectionStart;
      const detected = detectMentionQuery(value, cursor);
      if (!detected) {
        const { next, cursor: nextCursor } = insertTextAtCursor(el, value, "@");
        onChange(next);
        requestAnimationFrame(() => focusTextareaAt(el, nextCursor));
      }
    }

    setOpen(true);
    setQuery("");

    const cached = getCachedUsuariosMencion("");
    if (cached) {
      applyCandidatos(cached);
      setLoading(false);
    } else {
      setLoading(true);
      setCandidatos([]);
    }

    el?.focus();
  }, [
    applyCandidatos,
    detectMentionQuery,
    onChange,
    textareaRef,
    value,
  ]);

  const selectUsuario = useCallback(
    (usuario: ComentarioUsuarioMencionDto) => {
      const el = textareaRef.current;
      if (!el) return;

      const cursor = el.selectionStart;
      const detected = detectMentionQuery(value, cursor);
      const token = `@${usuario.nombre} `;

      if (detected) {
        const next =
          value.slice(0, detected.atIndex) + token + value.slice(cursor);
        onChange(next);
      } else {
        onChange(
          `${value}${value.endsWith(" ") || value.length === 0 ? "" : " "}${token}`,
        );
      }

      setOpen(false);
      setQuery("");
      setLoading(false);
    },
    [detectMentionQuery, onChange, textareaRef, value],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setLoading(false);
        return;
      }

      if (loading || candidatos.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % candidatos.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + candidatos.length) % candidatos.length);
      } else if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        selectUsuario(candidatos[activeIndex]);
      }
    },
    [activeIndex, candidatos, loading, open, selectUsuario],
  );

  return {
    open,
    loading,
    query,
    candidatos,
    activeIndex,
    popupRef,
    handleChange,
    handleKeyDown,
    openMentionPicker,
    selectUsuario,
    setOpen,
  };
}

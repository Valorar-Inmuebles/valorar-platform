"use client";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { useFormFieldCtx } from "./form-field";
import { cn } from "./lib/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, id, ...props }, ref) {
  const ctx = useFormFieldCtx();
  return (
    <textarea
      ref={ref}
      id={id ?? ctx?.id}
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 disabled:bg-zinc-50 disabled:text-zinc-400",
        className,
      )}
      {...props}
    />
  );
});

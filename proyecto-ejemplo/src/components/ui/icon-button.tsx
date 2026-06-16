import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Visually muted until hover/focus */
  variant?: "ghost" | "subtle";
};

export function IconButton({
  children,
  className = "",
  variant = "ghost",
  type = "button",
  ...props
}: IconButtonProps) {
  const base =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 outline-none transition-all duration-200 ease-out hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-indigo-500/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
  const styles =
    variant === "subtle"
      ? "bg-zinc-100/90 text-zinc-600 shadow-sm shadow-zinc-900/5 hover:bg-zinc-200/80 hover:text-zinc-900"
      : "hover:bg-zinc-100/90";

  return (
    <button type={type} className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

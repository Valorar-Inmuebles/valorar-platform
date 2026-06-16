import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "destructive";
  size?: "sm" | "md";
};

export function ActionIconButton({
  children,
  className = "",
  variant = "default",
  size = "sm",
  ...props
}: Props) {

  const sizeClass =
    size === "md"
      ? "size-7"
      : "size-6";

  const variantClass =
    variant === "destructive"
      ? "text-zinc-400 hover:bg-red-50 hover:text-red-500"
      : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700";

  return (
    <button
      type="button"
      className={`
        flex
        ${sizeClass}
        cursor-pointer
        items-center
        justify-center
        rounded
        transition-colors
        disabled:cursor-not-allowed
        ${variantClass}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
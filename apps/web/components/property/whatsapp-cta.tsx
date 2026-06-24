import { WhatsappIcon } from "@/components/icons";

type WhatsAppCTAProps = {
  href: string;
  variant?: "primary" | "outline";
  className?: string;
  label?: string;
};

export function WhatsAppCTA({
  href,
  variant = "outline",
  className = "",
  label = "Consultar por WhatsApp",
}: WhatsAppCTAProps) {
  const variantClasses =
    variant === "primary"
      ? "border border-brand-green bg-brand-green text-white hover:brightness-110"
      : "border border-border-default bg-surface-card text-brand-green hover:border-brand-green/40 hover:bg-surface-alt";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${variantClasses} ${className}`}
    >
      <WhatsappIcon size={20} className="shrink-0" />
      {label}
    </a>
  );
}

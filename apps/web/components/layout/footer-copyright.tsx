type FooterCopyrightProps = {
  companyName: string;
};

export function FooterCopyright({ companyName }: FooterCopyrightProps) {
  const year = new Date().getFullYear();

  return (
    <p className="mt-10 border-t border-white/10 pt-8 text-center text-sm text-white/60">
      © {year} {companyName}. Todos los derechos reservados.
    </p>
  );
}

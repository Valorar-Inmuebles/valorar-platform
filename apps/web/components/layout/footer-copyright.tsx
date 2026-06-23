type FooterCopyrightProps = {
  companyName: string;
};

export function FooterCopyright({ companyName }: FooterCopyrightProps) {
  const year = new Date().getFullYear();

  return (
    <p className="mt-10 border-t border-border-default pt-8 text-center text-sm text-text-secondary">
      © {year} {companyName}. Todos los derechos reservados.
    </p>
  );
}

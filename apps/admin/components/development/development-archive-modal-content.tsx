type DevelopmentArchiveModalContentProps = {
  developmentTitle: string;
};

export function DevelopmentArchiveModalContent({
  developmentTitle,
}: DevelopmentArchiveModalContentProps) {
  return (
    <>
      ¿Archivar <strong>{developmentTitle}</strong>? Dejará de estar activo en el
      inventario y no podrá publicarse en la web.
    </>
  );
}

type PropertyArchiveModalContentProps = {
  propertyTitle: string;
  activeListingsCount: number;
};

export function PropertyArchiveModalContent({
  propertyTitle,
  activeListingsCount,
}: PropertyArchiveModalContentProps) {
  return (
    <>
      ¿Archivar <strong>{propertyTitle}</strong>? Dejará de estar activa en el
      inventario y no podrá publicarse en la web.
      {activeListingsCount > 0 ? (
        <>
          {" "}
          Tiene{" "}
          <strong>
            {activeListingsCount}{" "}
            {activeListingsCount === 1
              ? "publicación activa"
              : "publicaciones activas"}
          </strong>
          : se pausarán automáticamente y dejarán de verse en el sitio web.
        </>
      ) : null}
    </>
  );
}

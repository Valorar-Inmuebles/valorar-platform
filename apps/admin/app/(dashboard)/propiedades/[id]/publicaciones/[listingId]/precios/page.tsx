import { redirect } from "next/navigation";

type PropiedadPreciosRedirectPageProps = {
  params: Promise<{ id: string; listingId: string }>;
};

export default async function PropiedadPreciosRedirectPage({
  params,
}: PropiedadPreciosRedirectPageProps) {
  const { id, listingId } = await params;
  redirect(`/propiedades/${id}/publicaciones?edit=${listingId}`);
}

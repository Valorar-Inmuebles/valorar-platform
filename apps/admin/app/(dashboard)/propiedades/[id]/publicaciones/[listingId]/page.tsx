import { redirect } from "next/navigation";

type PropiedadListingRedirectPageProps = {
  params: Promise<{ id: string; listingId: string }>;
};

export default async function PropiedadListingRedirectPage({
  params,
}: PropiedadListingRedirectPageProps) {
  const { id, listingId } = await params;
  redirect(`/propiedades/${id}/publicaciones?edit=${listingId}`);
}

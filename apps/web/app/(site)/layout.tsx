import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { BrandingVariables } from "@/components/layout/site-container";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { primaryColor, secondaryColor } = getPublicSiteConfig();

  return (
    <BrandingVariables primaryColor={primaryColor} secondaryColor={secondaryColor}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </BrandingVariables>
  );
}

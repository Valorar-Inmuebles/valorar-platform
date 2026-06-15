import { HeaderLogo } from "./header-logo";
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { SiteContainer } from "./site-container";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <SiteContainer>
        <div className="flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
          <HeaderLogo />
          <MainNav className="hidden lg:block" />
          <MobileNav className="lg:hidden" />
        </div>
      </SiteContainer>
    </header>
  );
}

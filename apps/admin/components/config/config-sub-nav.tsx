import { isNavItemVisible, navigation } from "@/components/layout/nav-config";
import { sessionToNavContext } from "@/lib/auth/nav-context";
import { getSession } from "@/lib/auth/session";
import { ConfigSubNavLinks } from "./config-sub-nav-links";

export async function ConfigSubNav() {
  const session = await getSession();
  if (!session) return null;

  const context = sessionToNavContext(session.user);
  const items = navigation
    .find((section) => section.id === "configuracion")!
    .items.filter((item) => item.href && isNavItemVisible(item, context))
    .map((item) => ({ href: item.href!, label: item.label }));

  return <ConfigSubNavLinks items={items} />;
}

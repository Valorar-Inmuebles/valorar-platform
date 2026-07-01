import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export async function requireSuperAdminSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return session;
}

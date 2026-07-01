"use server";

/**
 * Invalidates Next.js ISR cache on the public web app after commercial data changes.
 */
export async function revalidatePublicWeb(slug?: string): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  const baseUrl =
    process.env.PUBLIC_WEB_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";

  if (!secret) {
    return;
  }

  const url = new URL("/api/revalidate", baseUrl.replace(/\/$/, ""));
  url.searchParams.set("secret", secret);

  try {
    await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      cache: "no-store",
    });
  } catch {
    // Web may be offline in local dev; admin mutation still succeeds.
  }
}

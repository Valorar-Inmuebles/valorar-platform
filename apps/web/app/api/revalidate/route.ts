import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Revalidation is not configured" },
      { status: 503 },
    );
  }

  const querySecret = request.nextUrl.searchParams.get("secret");

  if (querySecret !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let slug: string | undefined;

  try {
    const body = (await request.json()) as { slug?: string };
    slug = body.slug?.trim() || undefined;
  } catch {
    slug = undefined;
  }

  revalidatePath("/");
  revalidatePath("/propiedades");

  if (slug) {
    revalidatePath(`/propiedades/${encodeURIComponent(slug)}`);
  }

  return NextResponse.json({
    revalidated: true,
    slug: slug ?? null,
  });
}

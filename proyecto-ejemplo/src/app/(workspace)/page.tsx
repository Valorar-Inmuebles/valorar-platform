import { requireAuth } from "@/lib/auth/require-auth";

export default async function MainPage() {
  const ctx = await requireAuth();

  const { user, usuario, tenant_id, roles } = ctx;

  return (
    <div className="p-6 space-y-1">
      <p className="text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">Email:</span>{" "}
        {user?.email ?? "—"}
      </p>

      <p className="text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">Usuario ID:</span>{" "}
        {usuario?.id ?? "—"}
      </p>

      <p className="text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">Tenant ID:</span>{" "}
        {tenant_id ?? "—"}
      </p>

      <p className="text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">Roles:</span>{" "}
        {roles?.join(", ") || "—"}
      </p>
    </div>
  );
}
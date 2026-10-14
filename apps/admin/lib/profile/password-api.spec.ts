import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changePasswordAction } from "@/lib/api/password-actions";
import { updateProfileAction } from "@/lib/api/user-actions";
// Runtime-only test import: do not compile API sources with Next's tsconfig.
const realdataModulePath = "../../../api/src/common/safety/realdata-safety.ts";
const { realdataAllowsRequest } = (await import(realdataModulePath)) as {
  realdataAllowsRequest: (method: string, path: string) => boolean;
};

const cookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_URL", "http://api.example.invalid");
  fetchMock.mockReset();
  cookieStore.get.mockImplementation((key: string) =>
    key === "access_token" ? { value: "existing-jwt" } : undefined,
  );
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("password Server Action + actual HTTP client", () => {
  it("handles 204, forwards exactly two unchanged values, preserves cookie and needs no tenant", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const payload = {
      currentPassword: " old  ",
      newPassword: " new password  ",
      confirmation: "client-only",
      tenantId: "not-allowed",
    };
    expect(await changePasswordAction(payload)).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("http://api.example.invalid/users/me/password");
    expect(options.method).toBe("PATCH");
    expect(options.body).toBe(
      JSON.stringify({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      }),
    );
    expect(options.headers).toMatchObject({
      Cookie: "access_token=existing-jwt",
    });
    expect(options.headers).not.toHaveProperty("X-Tenant-Id");
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });
  it("does not send credentials even if excess runtime properties reach the profile action", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "user" }));
    const payload = {
      firstName: "Ana",
      lastName: "Pérez",
      password: "SECRET",
      newPassword: "SECRET",
    };
    expect(await updateProfileAction(payload)).toEqual({ ok: true });
    const [url, options] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toContain("/users/me/profile");
    expect(JSON.parse(String(options.body))).toEqual({
      firstName: "Ana",
      lastName: "Pérez",
    });
  });
  it("preserves rate-limit timing through the Server Action", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { code: "PASSWORD_CHANGE_RATE_LIMITED", retryAfterSeconds: 61 },
        { status: 429 },
      ),
    );
    expect(
      await changePasswordAction({
        currentPassword: "old",
        newPassword: "new",
      }),
    ).toMatchObject({
      ok: false,
      retryAfterSeconds: 61,
      code: "PASSWORD_CHANGE_RATE_LIMITED",
    });
  });
  it("sanitizes transport errors without logging or mutating session", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("SECRET_SENTINEL"));
    try {
      const result = await changePasswordAction({
        currentPassword: "old",
        newPassword: "new",
      });
      expect(result).toMatchObject({
        ok: false,
        code: "PASSWORD_CHANGE_UNAVAILABLE",
      });
      expect(JSON.stringify(result)).not.toContain("SECRET_SENTINEL");
      expect(log).not.toHaveBeenCalled();
      expect(cookieStore.set).not.toHaveBeenCalled();
      expect(cookieStore.delete).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
  it("surfaces the existing RealData mutation block for both forms", async () => {
    const mutate = vi.fn();
    fetchMock.mockImplementation(async (url: string, options: RequestInit) => {
      if (!realdataAllowsRequest(options.method!, new URL(url).pathname)) {
        return Response.json(
          { message: "RealData es un entorno visual de sólo lectura." },
          { status: 403 },
        );
      }
      mutate();
      return new Response(null, { status: 204 });
    });
    expect(
      await changePasswordAction({
        currentPassword: "old",
        newPassword: "new",
      }),
    ).toMatchObject({ ok: false, code: "READ_ONLY" });
    expect(await updateProfileAction({ firstName: "Ana" })).toMatchObject({
      ok: false,
      message: "RealData es un entorno visual de sólo lectura.",
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});

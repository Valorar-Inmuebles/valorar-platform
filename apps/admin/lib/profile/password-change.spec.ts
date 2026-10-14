import { describe, expect, it } from "vitest";
import {
  mapPasswordChangeError,
  passwordPolicy,
  passwordStrength,
  validatePasswordChange,
} from "./password-change";

describe("password UX policy and strength", () => {
  it("counts code points and UTF-8 bytes without trimming", () => {
    expect(passwordPolicy("😀".repeat(12))).toEqual({
      characters: 12,
      bytes: 48,
      hasContent: true,
    });
    expect(passwordPolicy("  abc  ").characters).toBe(7);
  });
  it.each([
    "a".repeat(11),
    "😀".repeat(11),
    "a".repeat(73),
    "😀".repeat(19),
    " ".repeat(12),
  ])("rejects invalid new policy", (newPassword) => {
    expect(
      validatePasswordChange({
        currentPassword: "old",
        newPassword,
        confirmation: newPassword,
      }).newPassword,
    ).toBeTruthy();
  });
  it("accepts 72 UTF-8 bytes and preserves exact confirmation", () => {
    const value = "😀".repeat(18);
    expect(
      validatePasswordChange({
        currentPassword: "old",
        newPassword: value,
        confirmation: value,
      }),
    ).toEqual({});
    expect(
      validatePasswordChange({
        currentPassword: "old",
        newPassword: "  nueva clave  ",
        confirmation: "nueva clave",
      }).confirmation,
    ).toBeTruthy();
  });
  it("requires current password, confirmation and a different password", () => {
    expect(
      validatePasswordChange({
        currentPassword: "",
        newPassword: "",
        confirmation: "",
      }),
    ).toHaveProperty("currentPassword");
    expect(
      validatePasswordChange({
        currentPassword: "clave repetida",
        newPassword: "clave repetida",
        confirmation: "",
      }),
    ).toHaveProperty("newPassword");
  });
  it("has four advisory levels independently of policy compliance", () => {
    expect(passwordStrength("1234567890123456")).toBe(1);
    expect(passwordStrength("abczefghij")).toBe(2);
    expect(passwordStrength("Luna rio sol!")).toBe(3);
    expect(passwordStrength("Una frase larga y singular!")).toBe(4);
    const repeated = "a".repeat(12);
    expect(passwordStrength(repeated)).toBe(1);
    expect(
      validatePasswordChange({
        currentPassword: "old",
        newPassword: repeated,
        confirmation: repeated,
      }),
    ).toEqual({});
  });
  it.each([
    [400, "CURRENT_PASSWORD_INVALID", "currentPassword"],
    [422, "PASSWORD_POLICY_VIOLATION", "newPassword"],
    [422, "PASSWORD_REUSED", "newPassword"],
    [503, "PASSWORD_CHANGE_UNAVAILABLE", undefined],
    [409, "CREDENTIALS_CHANGED", "currentPassword"],
    [403, "REQUEST_ORIGIN_NOT_ALLOWED", undefined],
  ] as const)(
    "maps %s %s without leaking raw messages",
    (status, code, field) => {
      const result = mapPasswordChangeError(status, {
        code,
        message: "SECRET_SENTINEL",
      });
      expect(result.code).toBe(code);
      expect(result.field).toBe(field);
      expect(result.message).not.toContain("SECRET_SENTINEL");
      expect(result.message).not.toContain("sesión expiró");
    },
  );
  it("uses retryAfterSeconds and rejects invalid timing", () => {
    expect(
      mapPasswordChangeError(429, { retryAfterSeconds: 42.5 })
        .retryAfterSeconds,
    ).toBe(43);
    for (const value of [null, "5", -1, NaN, Infinity])
      expect(
        mapPasswordChangeError(429, { retryAfterSeconds: value })
          .retryAfterSeconds,
      ).toBe(900);
  });
  it("distinguishes expired session and unknown errors", () => {
    expect(mapPasswordChangeError(401, null).code).toBe("UNAUTHENTICATED");
    expect(
      mapPasswordChangeError(500, { message: "SECRET" }).message,
    ).not.toContain("SECRET");
  });
});

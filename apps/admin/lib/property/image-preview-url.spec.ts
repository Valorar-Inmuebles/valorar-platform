import { describe, expect, it } from "vitest";
import { resolveImagePreviewUrl } from "./image-preview-url";

const localDevelopment = { isDevelopment: true, hostname: "localhost" };

describe("Admin property image preview URLs", () => {
  it("uses local Web for demo seed images only on localhost in development", () => {
    const demo = "/seed/properties/venta-casa-olivos-01/cover.webp";
    expect(resolveImagePreviewUrl(demo, localDevelopment)).toBe(
      `http://localhost:3000${demo}`,
    );
    expect(
      resolveImagePreviewUrl(demo, { ...localDevelopment, hostname: null }),
    ).toBeNull();
    expect(
      resolveImagePreviewUrl(demo, {
        ...localDevelopment,
        hostname: "admin.example",
      }),
    ).toBe(demo);
    expect(
      resolveImagePreviewUrl(demo, {
        ...localDevelopment,
        hostname: "127.0.0.1",
      }),
    ).toBe(demo);
    expect(
      resolveImagePreviewUrl(demo, {
        ...localDevelopment,
        isDevelopment: false,
      }),
    ).toBe(demo);
  });

  it("preserves absolute image URLs and unrelated relative paths", () => {
    for (const url of [
      "https://images.example.com/tenants/a/properties/cover.webp",
      "https://cdn.example.com/seed/properties/casa/cover.webp",
      "http://images.example.com/photo.jpg",
      "/uploads/properties/cover.webp",
      "/seed/developments/cover.webp",
      "/seed/properties-other/cover.webp",
    ]) {
      expect(resolveImagePreviewUrl(url, localDevelopment)).toBe(url);
    }
    expect(resolveImagePreviewUrl(null, localDevelopment)).toBeNull();
  });
});

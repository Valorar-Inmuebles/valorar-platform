import { useEffect, useState } from "react";

const DEMO_IMAGE_PREFIX = "/seed/properties/";

export function resolveImagePreviewUrl(
  url: string | null,
  {
    isDevelopment,
    hostname,
  }: { isDevelopment: boolean; hostname: string | null },
): string | null {
  if (!url || !isDevelopment || !url.startsWith(DEMO_IMAGE_PREFIX)) {
    return url;
  }

  // Wait for hydration before choosing the browser's local origin. Other
  // development hosts retain the original URL, as do production deployments.
  if (hostname === null) return null;
  return hostname === "localhost" ? `http://localhost:3000${url}` : url;
}

export function useImagePreviewUrl(url: string | null): string | null {
  const [hostname, setHostname] = useState<string | null>(null);

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      !url?.startsWith(DEMO_IMAGE_PREFIX)
    ) {
      return;
    }
    setHostname(window.location.hostname);
  }, [url]);

  return resolveImagePreviewUrl(url, {
    isDevelopment: process.env.NODE_ENV === "development",
    hostname,
  });
}

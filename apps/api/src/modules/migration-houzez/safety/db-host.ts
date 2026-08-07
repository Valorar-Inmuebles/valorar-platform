/** Shared hostname helpers for Houzez staging gates (cleanup + migrate). */

/** Mask a DB hostname for logs/manifests (never print credentials or full URL). */
export function maskDbHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) return '(empty)';
  if (trimmed.length <= 12) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }
  const parts = trimmed.split('.');
  const first = parts[0];
  if (parts.length >= 2 && first) {
    const maskedFirst =
      first.length <= 6
        ? `${first.slice(0, 2)}***`
        : `${first.slice(0, 4)}***${first.slice(-2)}`;
    return [maskedFirst, '***', ...parts.slice(-2)].join('.');
  }
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
}

export function extractHostnameFromDatabaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname || null;
  } catch {
    // URL() may reject some postgres schemes in older engines; fallback.
    const match = url.match(/@([^/?#]+)/);
    if (!match?.[1]) return null;
    const hostPort = match[1];
    const host = hostPort.includes(':')
      ? hostPort.slice(0, hostPort.lastIndexOf(':'))
      : hostPort;
    return host || null;
  }
}

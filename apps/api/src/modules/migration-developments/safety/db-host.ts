/** Mask a hostname for logs. Never print credentials or full URLs. */
export function maskHost(host: string | null | undefined): string {
  const trimmed = host?.trim() ?? '';
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

export function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname || null;
  } catch {
    const match = url.match(/@([^/?#]+)/);
    if (!match?.[1]) return null;
    const hostPort = match[1];
    const host = hostPort.includes(':')
      ? hostPort.slice(0, hostPort.lastIndexOf(':'))
      : hostPort;
    return host || null;
  }
}

export function extractDatabaseName(url: string): string | null {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.replace(/^\//, '').split('/')[0];
    return name || null;
  } catch {
    const match = url.match(/\/([^/?#]+)(?:\?|#|$)/);
    return match?.[1] ?? null;
  }
}

export function hasForbiddenEnvironmentToken(value: string): boolean {
  return /(?:^|[^a-z0-9])(?:production|prod|staging|preview)(?:[^a-z0-9]|$)/i.test(
    value,
  );
}

export function hasDevelopmentToken(value: string): boolean {
  return /(?:^|[^a-z0-9])(?:development|dev)(?:[^a-z0-9]|$)/i.test(value);
}

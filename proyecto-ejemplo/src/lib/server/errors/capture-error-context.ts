export type StackFrame = {
  functionName: string;
  file?: string;
  line?: number;
  column?: number;
  raw: string;
};

export type ErrorDiagnostics = {
  thrown_at: {
    fn: string;
    file?: string;
    line?: number;
  } | null;
  call_chain: Array<{
    fn: string;
    file?: string;
    line?: number;
  }>;
  cause: unknown;
};

function simplifyPath(file: string): string {
  const normalized = file.replace(/\\/g, "/");
  const srcIdx = normalized.indexOf("/src/");
  if (srcIdx >= 0) return normalized.slice(srcIdx + 1);

  const nextIdx = normalized.indexOf("/.next/");
  if (nextIdx >= 0) return normalized.slice(nextIdx + 1);

  const parts = normalized.split("/");
  return parts.slice(-4).join("/");
}

export function parseStackTrace(error: unknown): StackFrame[] {
  const stack = error instanceof Error ? error.stack : undefined;
  if (!stack) return [];

  const frames: StackFrame[] = [];

  for (const line of stack.split("\n").slice(1)) {
    const trimmed = line.trim();

    const withLocation = trimmed.match(
      /^at async (.+?) \((.+):(\d+):(\d+)\)$/,
    ) ?? trimmed.match(/^at (.+?) \((.+):(\d+):(\d+)\)$/);

    if (withLocation) {
      frames.push({
        functionName: withLocation[1],
        file: withLocation[2],
        line: Number(withLocation[3]),
        column: Number(withLocation[4]),
        raw: trimmed,
      });
      continue;
    }

    const direct = trimmed.match(/^at (.+):(\d+):(\d+)$/);
    if (direct) {
      frames.push({
        functionName: "?",
        file: direct[1],
        line: Number(direct[2]),
        column: Number(direct[3]),
        raw: trimmed,
      });
    }
  }

  return frames;
}

export function buildErrorDiagnostics(error: unknown): ErrorDiagnostics {
  const frames = parseStackTrace(error);
  const srcFrame = frames.find((frame) => {
    const file = frame.file ?? "";
    return file.includes("/src/") || file.includes("\\src\\");
  });

  const thrownFrame = srcFrame ?? frames[0] ?? null;
  const callChain = frames.slice(0, 10).map((frame) => ({
    fn: frame.functionName,
    file: frame.file ? simplifyPath(frame.file) : undefined,
    line: frame.line,
  }));

  let cause: unknown = null;
  if (error instanceof Error && error.cause !== undefined) {
    cause = error.cause;
  }

  return {
    thrown_at: thrownFrame
      ? {
          fn: thrownFrame.functionName,
          file: thrownFrame.file ? simplifyPath(thrownFrame.file) : undefined,
          line: thrownFrame.line,
        }
      : null,
    call_chain: callChain,
    cause,
  };
}

import { COMENTARIO_EMOJIS } from "./comentario-emojis";

const STORAGE_PREFIX = "jurilexia:comentarios:emojis-recientes";
const MAX_STORED = 24;
const DEFAULT_RECENT_LIMIT = 8;

const ALLOWED = new Set<string>(COMENTARIO_EMOJIS);

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readRecent(userId: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (emoji): emoji is string =>
          typeof emoji === "string" && ALLOWED.has(emoji),
      );
    }

    return [];
  } catch {
    return [];
  }
}

function writeRecent(userId: string, emojis: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    storageKey(userId),
    JSON.stringify(emojis.slice(0, MAX_STORED)),
  );
}

/** Registra uso: el más reciente queda primero (izquierda en el picker). */
export function recordComentarioEmojiUse(
  emoji: string,
  userId: string | undefined,
): void {
  if (!userId || !ALLOWED.has(emoji)) return;

  const recent = readRecent(userId).filter((item) => item !== emoji);
  recent.unshift(emoji);
  writeRecent(userId, recent);
}

export function getFrequentComentarioEmojis(
  userId: string | undefined,
  limit = DEFAULT_RECENT_LIMIT,
): string[] {
  if (!userId) return [];
  return readRecent(userId).slice(0, limit);
}

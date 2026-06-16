import type { ComentarioMencionDto } from "@/lib/types/comentario";

type Props = {
  contenido: string;
  menciones: ComentarioMencionDto[];
};

export function ComentarioContenido({ contenido, menciones }: Props) {
  if (menciones.length === 0) {
    return (
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
        {contenido}
      </p>
    );
  }

  const names = [...menciones]
    .map((m) => m.nombre)
    .sort((a, b) => b.length - a.length);

  const parts: Array<{ text: string; mention: boolean }> = [];
  let cursor = 0;

  while (cursor < contenido.length) {
    let matched: string | null = null;
    let matchIndex = -1;

    for (const name of names) {
      const token = `@${name}`;
      const idx = contenido.indexOf(token, cursor);
      if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
        matchIndex = idx;
        matched = token;
      }
    }

    if (matched == null || matchIndex === -1) {
      parts.push({ text: contenido.slice(cursor), mention: false });
      break;
    }

    if (matchIndex > cursor) {
      parts.push({ text: contenido.slice(cursor, matchIndex), mention: false });
    }

    parts.push({ text: matched, mention: true });
    cursor = matchIndex + matched.length;
  }

  return (
    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
      {parts.map((part, index) =>
        part.mention ? (
          <span key={index} className="font-medium text-blue-600">
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </p>
  );
}

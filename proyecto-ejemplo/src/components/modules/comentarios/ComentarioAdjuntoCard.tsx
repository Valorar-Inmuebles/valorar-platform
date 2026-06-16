import { Icon } from "@/components/ui/icons";
import type { ComentarioAdjuntoDto } from "@/lib/types/comentario";

type Props = {
  adjunto: ComentarioAdjuntoDto;
};

export function ComentarioAdjuntoCard({ adjunto }: Props) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
      <Icon.File className="size-4 shrink-0 text-red-500" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-900">{adjunto.nombre}</p>
        {adjunto.tamanoBytes != null && (
          <p className="text-[11px] text-gray-500">
            {Math.round(adjunto.tamanoBytes / 1024)} KB
          </p>
        )}
      </div>
    </div>
  );
}

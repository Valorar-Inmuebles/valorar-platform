import { cn } from "@/lib/cn";

type SkeletonBarProps = {
  className?: string;
};

export function SkeletonBar({ className }: SkeletonBarProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-zinc-200/80",
        className ?? "h-4",
      )}
    />
  );
}

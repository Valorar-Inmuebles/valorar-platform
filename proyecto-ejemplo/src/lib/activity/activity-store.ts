type ActivityListener = () => void;

let pendingCount = 0;
const listeners = new Set<ActivityListener>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Stable primitive snapshot for useSyncExternalStore (client). */
export function getActivitySnapshot(): number {
  return pendingCount;
}

/** Stable server snapshot — no activity during SSR. */
export function getServerActivitySnapshot(): number {
  return 0;
}

export function subscribeActivity(listener: ActivityListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startActivity(): void {
  pendingCount += 1;
  emit();
}

export function finishActivity(): void {
  if (pendingCount > 0) {
    pendingCount -= 1;
  }
  emit();
}

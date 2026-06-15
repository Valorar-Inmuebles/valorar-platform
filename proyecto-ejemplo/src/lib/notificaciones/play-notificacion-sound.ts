let audioContext: AudioContext | null = null;

/** Tono corto y discreto para avisar una notificación nueva. */
export function playNotificacionSound() {
  if (typeof window === "undefined") return;

  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.22);
  } catch {
    // Navegador sin soporte o política de autoplay: ignorar silenciosamente.
  }
}

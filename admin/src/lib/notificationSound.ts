let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as typeof window & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctx = win.AudioContext ?? win.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

/** Desbloqueia áudio após gesto do usuário (ativar alertas / testar). */
export async function primeNotificationSound(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

/**
 * Som curto de conclusão — tom ascendente suave, inspirado no "task done" do Cursor.
 */
export function playNotificationChime(options?: { urgent?: boolean }): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(options?.urgent ? 0.22 : 0.16, now + 0.015);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (options?.urgent ? 0.55 : 0.42));

  const tone = (freq: number, start: number, duration: number, volume = 1) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  if (options?.urgent) {
    tone(880, now, 0.14, 1);
    tone(1174.66, now + 0.11, 0.16, 0.85);
    tone(1318.51, now + 0.22, 0.2, 0.7);
  } else {
    tone(523.25, now, 0.14, 1);
    tone(659.25, now + 0.07, 0.18, 0.9);
    tone(783.99, now + 0.14, 0.22, 0.75);
  }
}

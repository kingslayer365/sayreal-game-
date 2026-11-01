import type { SoundName } from "./types";

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;
  private lastHit = 0;

  unlock() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.8;
      this.master.gain.value = this.muted ? 0.0001 : 0.9;
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0.0001 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  play(name: SoundName) {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ctx;
    const bus = this.sfx;
    if (!ctx || !bus) return;
    const now = ctx.currentTime;
    const jitter = 0.94 + Math.random() * 0.12;
    if (name === "hit" && now - this.lastHit < 0.045) return;
    if (name === "hit") this.lastHit = now;

    const tone = (freq: number, dur: number, type: OscillatorType, gain: number, slide?: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(40, freq * jitter), now);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), now + dur);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g);
      g.connect(bus);
      o.start(now);
      o.stop(now + dur + 0.02);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    };

    switch (name) {
      case "summon":
        tone(320, 0.18, "triangle", 0.07, 640);
        tone(480, 0.22, "sine", 0.04, 720);
        break;
      case "link":
        tone(520, 0.08, "square", 0.03);
        tone(780, 0.1, "triangle", 0.04);
        break;
      case "fuse":
        tone(220, 0.28, "sawtooth", 0.035, 440);
        tone(330, 0.32, "triangle", 0.05, 660);
        break;
      case "hit":
        tone(180 + Math.random() * 40, 0.07, "square", 0.04, 90);
        break;
      case "die":
        tone(360, 0.28, "triangle", 0.06, 80);
        break;
      case "explode":
        this.burstNoise(0.28, 0.12);
        tone(90, 0.3, "sine", 0.08, 40);
        break;
      case "heal":
        tone(520, 0.12, "sine", 0.04, 760);
        break;
      case "deny":
        tone(140, 0.12, "square", 0.03);
        break;
      case "throw":
        tone(240, 0.08, "triangle", 0.03, 180);
        break;
      case "land":
        tone(110, 0.09, "sine", 0.04);
        break;
      default:
        break;
    }
  }

  private burstNoise(dur: number, gain: number) {
    const ctx = this.ctx;
    const bus = this.sfx;
    if (!ctx || !bus) return;
    if (!this.noise) {
      const len = Math.floor(ctx.sampleRate * 0.4);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      this.noise = buf;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    src.connect(filter);
    filter.connect(g);
    g.connect(bus);
    src.start(now);
    src.stop(now + dur);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
}

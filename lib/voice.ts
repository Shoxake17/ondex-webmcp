"use client";

/**
 * Ovoz quvuri: mikrofondan olish va javobni eshittirish.
 *
 * Gemini Live 16 kHz PCM16 kutadi va 24 kHz PCM16 qaytaradi — ikkita
 * har xil chastota, shuning uchun ikkita alohida `AudioContext`.
 */

export const INPUT_RATE = 16000;
export const OUTPUT_RATE = 24000;

// ── Mikrofon ────────────────────────────────────────────────────────

export class MicStream {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;

  /**
   * Mikrofonni ochadi va har bo'lakni `onChunk` ga beradi.
   *
   * `AudioContext` ni 16 kHz da yaratamiz — qayta chastotalashni
   * brauzerning o'zi bajaradi va bu qo'lda yozilgan har qanday
   * variantdan aniqroq.
   */
  async start(onChunk: (pcm16: Int16Array) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Aks-sado o'chirilmasa model O'Z ovozini eshitib, o'zini
        // bo'lib tashlayveradi.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    this.ctx = new AudioContext({ sampleRate: INPUT_RATE });
    await this.ctx.audioWorklet.addModule("/pcm-worklet.js");

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "pcm-capture");
    this.node.port.onmessage = (e) => onChunk(e.data as Int16Array);
    source.connect(this.node);
    // Worklet chiqishga ULANMAYDI: ulansa foydalanuvchi o'z ovozini
    // karnaydan eshitardi.
  }

  stop() {
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.node = null;
    this.stream = null;
    this.ctx = null;
  }
}

// ── Eshittirish ─────────────────────────────────────────────────────

/**
 * Kelgan bo'laklarni UZLUKSIZ qilib navbatga qo'yadi.
 *
 * ┌─ NEGA NAVBAT KERAK ────────────────────────────────────────────────┐
 * Har bo'lakni kelishi bilan `start()` qilish eng oson yo'l, lekin
 * bo'laklar orasida sezilarli jimlik paydo bo'ladi va ovoz uzuq-yuluq
 * eshitiladi.
 *
 * Shuning uchun keyingi bo'lak aniq VAQTGA rejalashtiriladi: har
 * biri oldingisi tugagan lahzadan boshlanadi.
 * └────────────────────────────────────────────────────────────────────┘
 */
export class PcmPlayer {
  private ctx: AudioContext | null = null;
  private playhead = 0;
  private sources = new Set<AudioBufferSourceNode>();

  /** Brauzer avtomatik ovozni bloklaydi — bosish ichida chaqiring. */
  async resume(): Promise<void> {
    this.ctx ??= new AudioContext({ sampleRate: OUTPUT_RATE });
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  play(pcm16: Int16Array) {
    const ctx = this.ctx;
    if (!ctx) return;

    const buffer = ctx.createBuffer(1, pcm16.length, OUTPUT_RATE);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) ch[i] = pcm16[i] / 0x8000;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    // Navbat orqada qolgan bo'lsa (tarmoq kechikkan) hozirgi vaqtdan
    // boshlaymiz, aks holda bo'laklar o'tmishga rejalashtirilib,
    // hammasi birdan yangrardi.
    const now = ctx.currentTime;
    if (this.playhead < now) this.playhead = now + 0.04;

    src.start(this.playhead);
    this.playhead += buffer.duration;

    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  /**
   * Model gapini bo'lish.
   *
   * Foydalanuvchi gapira boshlaganda Gemini `interrupted` yuboradi.
   * Rejalashtirilgan bo'laklarni to'xtatmasak, model allaqachon
   * bekor qilingan gapini oxirigacha aytib berardi.
   */
  stopAll() {
    for (const s of this.sources) {
      try {
        s.stop();
      } catch {
        // Hali boshlanmagan yoki tugagan — ahamiyatsiz.
      }
    }
    this.sources.clear();
    this.playhead = 0;
  }

  close() {
    this.stopAll();
    void this.ctx?.close();
    this.ctx = null;
  }
}

// ── base64 ──────────────────────────────────────────────────────────

export function toBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let s = "";
  // Bo'laklab: bitta chaqiruvga o'n minglab argument berilsa
  // `String.fromCharCode` stekni to'ldirib yuboradi.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function fromBase64(b64: string): Int16Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  // Toq uzunlik bo'lsa oxirgi yarim namunani tashlaymiz: `Int16Array`
  // juft baytlar talab qiladi va aks holda istisno tashlanadi.
  const usable = bytes.byteLength - (bytes.byteLength % 2);
  return new Int16Array(bytes.buffer, 0, usable / 2);
}

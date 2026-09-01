/**
 * Mikrofondan PCM16 oqimi.
 *
 * ┌─ NEGA ALOHIDA FAYL ────────────────────────────────────────────────┐
 * AudioWorklet modulini `blob:` URL'dan ham yuklash mumkin edi, lekin
 * unda CSP'ga `blob:` qo'shishga to'g'ri kelardi — ya'ni sahifaga
 * ixtiyoriy skript yuklash yo'li ochilardi. Statik fayl `'self'`
 * doirasida qoladi va CSP qattiq turaveradi.
 * └────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ NEGA WORKLET, `ScriptProcessor` EMAS ─────────────────────────────┐
 * `ScriptProcessor` asosiy oqimda ishlaydi: sahifa qayta chizilayotgan
 * paytda ovoz uzilib qoladi. Worklet audio oqimida ishlaydi va bunga
 * bog'liq emas.
 * └────────────────────────────────────────────────────────────────────┘
 */
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    // ~40 ms bo'laklar (16 kHz da 640 namuna). Kichikroq bo'lsa xabar
    // ko'p bo'lib kechikish oshadi, kattaroq bo'lsa javob sekinlashadi.
    this._chunk = 640;
    this._buf = new Int16Array(this._chunk);
    this._n = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0];
    if (!ch) return true;

    for (let i = 0; i < ch.length; i++) {
      // Float32 [-1, 1] -> Int16. Chegaralash SHART: chegaradan
      // chiqqan qiymat butun sonda "aylanib" ketib, ovoz o'rniga
      // qattiq shitirlash beradi.
      let s = ch[i];
      if (s > 1) s = 1;
      else if (s < -1) s = -1;
      this._buf[this._n++] = s < 0 ? s * 0x8000 : s * 0x7fff;

      if (this._n === this._chunk) {
        // Nusxa yuboriladi: `transfer` qilinsa buferni qayta
        // ishlatib bo'lmasdi.
        this.port.postMessage(this._buf.slice(0));
        this._n = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture", PcmCapture);

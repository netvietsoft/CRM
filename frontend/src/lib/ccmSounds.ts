'use client';

/* ccmSounds — ÂM THÔNG BÁO tổng hợp bằng Web Audio API (không cần file ngoài, chạy offline).
 * Dùng bởi: trang Cài đặt chung (nghe thử) + useMessengerChat (phát khi có tin/hội thoại mới). */

export interface SoundDef { id: string; label: string; play: (c: AudioContext) => void }

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

// Mở khoá audio (gọi trong 1 cử chỉ người dùng — click/keydown) để âm realtime kêu được về sau.
export async function primeAudio(): Promise<void> {
  const c = getCtx();
  if (c && c.state === 'suspended') { try { await c.resume(); } catch { /* ignore */ } }
}

// 1 nốt: tần số freq, bắt đầu sau startOffset giây, kéo dài dur, dạng sóng + âm lượng.
function tone(c: AudioContext, freq: number, startOffset: number, dur: number, type: OscillatorType = 'sine', gain = 0.2) {
  const t0 = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(c.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}

export const SOUNDS: SoundDef[] = [
  { id: 'ding', label: 'Ding (chuông ngắn)', play: (c) => tone(c, 880, 0, 0.2) },
  { id: 'chime', label: 'Chime (2 nốt)', play: (c) => { tone(c, 660, 0, 0.16); tone(c, 988, 0.12, 0.24); } },
  { id: 'pop', label: 'Pop (blip)', play: (c) => tone(c, 520, 0, 0.09, 'triangle', 0.28) },
  { id: 'bell', label: 'Bell (leng keng)', play: (c) => { tone(c, 1318, 0, 0.5, 'sine', 0.14); tone(c, 1760, 0.02, 0.45, 'sine', 0.07); } },
  { id: 'triad', label: 'Triad (3 nốt vui)', play: (c) => { tone(c, 523, 0, 0.14); tone(c, 659, 0.1, 0.14); tone(c, 784, 0.2, 0.26); } },
  { id: 'none', label: 'Không phát', play: () => { /* im lặng */ } },
];

// Phát 1 âm theo id. Await resume trước khi phát để lần đầu (ngay sau cử chỉ) vẫn kêu.
export async function playSound(id: string) {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') { try { await c.resume(); } catch { /* ignore */ } }
  (SOUNDS.find((s) => s.id === id) || SOUNDS[0]).play(c);
}

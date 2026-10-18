import type { Post } from "@/lib/xuong";

export type MusicId = "tinh" | "dinh" | "khong";

export const MUSIC: { id: MusicId; label: string }[] = [
  { id: "tinh", label: "Tĩnh lặng" },
  { id: "dinh", label: "Đĩnh đạc" },
  { id: "khong", label: "Không tiếng" },
];

export const W = 1080;
export const H = 1920;

export interface Frame {
  images: HTMLImageElement[];
  time: number;
  post: Post;
  cover: boolean;
  sample?: boolean;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh"));
    image.src = url;
  });
}

function parseAt(at: string): number {
  const [m, s] = at.split(":").map(Number);
  return m * 60 + s;
}

function ease(p: number): number {
  const x = Math.min(1, Math.max(0, p));
  return x * x * (3 - 2 * x);
}

function segments(post: Post) {
  return post.beats.map((beat, index) => ({
    start: parseAt(beat.at),
    end: post.beats[index + 1] ? parseAt(post.beats[index + 1].at) : post.length,
    line: beat.line,
  }));
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, w: number, h: number, p: number, mode: number) {
  const zoomIn = mode % 2 === 0;
  const zoom = zoomIn ? 1.08 + 0.14 * ease(p) : 1.22 - 0.12 * ease(p);
  const ir = image.width / image.height;
  const cr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;
  if (ir > cr) {
    sh = image.height;
    sw = sh * cr;
    sx = (image.width - sw) * (0.5 + (mode % 2 === 0 ? 1 : -1) * (p - 0.5) * 0.55);
  } else {
    sw = image.width;
    sh = sw / cr;
    sy = Math.max(0, image.height - sh) * (0.42 + (p - 0.5) * 0.35);
  }
  const dw = w * zoom;
  const dh = h * zoom;
  const drift = (mode % 2 === 0 ? -1 : 1) * (p - 0.5) * w * 0.04;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((mode % 2 === 0 ? -1 : 1) * 0.015 * (p - 0.4));
  ctx.drawImage(image, sx, sy, sw, sh, -dw / 2 + drift, -dh / 2, dw, dh);
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function themeOf(post: Post) {
  if (post.brandId === "spa") {
    return { accent: "#e4c79a", plate: "rgba(22,14,10,0.72)", cream: "#f7f1e8", leak: "rgba(228,190,140,0.22)" };
  }
  return { accent: "#d5dae2", plate: "rgba(10,12,16,0.74)", cream: "#f4f6f8", leak: "rgba(180,196,214,0.16)" };
}

function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + gap;
  }
}

function plate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, radius);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

export function paint(ctx: CanvasRenderingContext2D, w: number, h: number, frame: Frame) {
  const { images, time, post, cover, sample } = frame;
  const theme = themeOf(post);
  const parts = segments(post);
  const index = parts.findIndex((part) => time < part.end);
  const safeIndex = index < 0 ? parts.length - 1 : index;
  const part = parts[safeIndex] ?? { start: 0, end: post.length, line: post.hook };
  const span = Math.max(0.2, part.end - part.start);
  const local = ease((time - part.start) / span);
  const endAt = cover ? post.length : post.length - 2.6;
  const opener = cover || time < Math.min(parts[0]?.end ?? 2.5, endAt);
  const ending = !cover && time >= endAt;
  const s = h / 1920;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#100e0c";
  ctx.fillRect(0, 0, w, h);

  if (images.length) {
    const current = images[Math.max(0, safeIndex) % images.length];
    const previous = safeIndex > 0 ? images[(safeIndex - 1) % images.length] : null;
    const fade = !cover && safeIndex > 0 && time - part.start < 0.55;
    if (fade && previous) {
      drawCover(ctx, previous, w, h, 1, safeIndex - 1);
      ctx.save();
      ctx.globalAlpha = ease((time - part.start) / 0.55);
      drawCover(ctx, current, w, h, local, safeIndex);
      ctx.restore();
    } else {
      drawCover(ctx, current, w, h, cover ? 0.25 : local, safeIndex);
    }
  }

  const leak = ctx.createRadialGradient(w * 0.82, h * 0.08, 0, w * 0.7, h * 0.2, w * 0.85);
  leak.addColorStop(0, theme.leak);
  leak.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = leak;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.2, w * 0.5, h * 0.5, h * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, ending ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.45)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const wash = ctx.createLinearGradient(0, h * 0.42, 0, h);
  wash.addColorStop(0, "rgba(8,6,5,0)");
  wash.addColorStop(1, ending ? "rgba(8,6,5,0.88)" : "rgba(8,6,5,0.78)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, h * 0.42, w, h * 0.58);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = theme.accent;
  ctx.fillRect(72 * s, 78 * s, 56 * s, 4 * s);
  ctx.fillStyle = theme.cream;
  ctx.font = `600 ${Math.round(26 * s)}px Outfit, sans-serif`;
  tracked(ctx, post.brand.toUpperCase(), 72 * s, 96 * s, 3.2 * s);

  if (sample) {
    ctx.fillStyle = "rgba(12,10,8,0.7)";
    plate(ctx, w - 250 * s, 70 * s, 176 * s, 48 * s, 24 * s);
    ctx.fillStyle = theme.accent;
    ctx.font = `600 ${Math.round(22 * s)}px Outfit, sans-serif`;
    ctx.fillText("ẢNH MẪU", w - 228 * s, 82 * s);
  }

  if (ending) {
    const bits = post.footer.split("·").map((bit) => bit.trim());
    const site = bits[0] || post.site;
    const phone = (bits[1] || "").replace(/hotline/i, "").trim();
    const rise = ease(Math.min(1, (time - endAt) / 0.45));
    ctx.save();
    ctx.globalAlpha = rise;
    ctx.fillStyle = theme.accent;
    ctx.fillRect(72 * s, h * 0.58, 84 * s, 4 * s);
    ctx.fillStyle = theme.cream;
    ctx.font = `600 ${Math.round(78 * s)}px Newsreader, Georgia, serif`;
    const name = wrap(ctx, post.brand, w - 144 * s);
    name.forEach((row, i) => ctx.fillText(row, 72 * s, h * 0.61 + i * 88 * s));
    const base = h * 0.61 + name.length * 88 * s + 18 * s;
    ctx.font = `500 ${Math.round(34 * s)}px Outfit, sans-serif`;
    ctx.fillStyle = "rgba(247,241,232,0.9)";
    ctx.fillText(site, 72 * s, base);
    ctx.fillStyle = theme.accent;
    ctx.font = `600 ${Math.round(40 * s)}px Outfit, sans-serif`;
    ctx.fillText(phone, 72 * s, base + 52 * s);
    ctx.restore();
    return;
  }

  const spoken = opener ? post.hook : part.line;
  const appear = cover ? 1 : Math.min(1, (time - (opener ? 0.15 : part.start)) / 0.35);
  ctx.save();
  ctx.globalAlpha = appear;
  const size = opener ? 86 : 64;
  ctx.font = `600 ${Math.round(size * s)}px Newsreader, Georgia, serif`;
  const rows = wrap(ctx, spoken, w - 180 * s).slice(0, opener ? 3 : 2);
  const lineH = (opener ? 96 : 74) * s;
  const blockH = rows.length * lineH;
  const widest = Math.max(...rows.map((row) => ctx.measureText(row).width), 120 * s);
  const plateW = Math.min(w - 112 * s, widest + 72 * s);
  const y0 = (opener ? h * 0.6 : h * 0.68) - (1 - appear) * 28 * s;
  ctx.fillStyle = theme.plate;
  plate(ctx, 56 * s, y0 - 26 * s, plateW, blockH + 52 * s, 16 * s);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(56 * s, y0 - 26 * s, 5 * s, blockH + 52 * s);
  ctx.fillStyle = theme.cream;
  rows.forEach((row, i) => ctx.fillText(row, 84 * s, y0 + i * lineH));
  ctx.restore();
}

export async function makeBed(id: MusicId, seconds: number): Promise<AudioBuffer | null> {
  if (id === "khong" || seconds <= 0) return null;
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate);
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  const noise = ctx.createBuffer(1, Math.ceil(rate * seconds), rate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const air = ctx.createBufferSource();
  air.buffer = noise;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = id === "tinh" ? 520 : 280;
  const airGain = ctx.createGain();
  airGain.gain.setValueAtTime(0, 0);
  airGain.gain.linearRampToValueAtTime(id === "tinh" ? 0.045 : 0.03, 0.6);
  airGain.gain.linearRampToValueAtTime(0, seconds);
  air.connect(low);
  low.connect(airGain);
  airGain.connect(master);
  air.start(0);
  const pulse = id === "tinh" ? [392, 494, 587] : [196, 247, 294];
  const step = id === "tinh" ? 2.4 : 1.6;
  for (let t = 0.35; t < seconds - 0.4; t += step) {
    const freq = pulse[Math.floor(t / step) % pulse.length];
    const osc = ctx.createOscillator();
    osc.type = id === "tinh" ? "triangle" : "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(id === "tinh" ? 0.07 : 0.09, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (id === "tinh" ? 1.8 : 1.1));
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.floor(t / step) % 2 === 0 ? -0.25 : 0.25;
    osc.connect(gain);
    gain.connect(pan);
    pan.connect(master);
    osc.start(t);
    osc.stop(t + 2);
  }
  return ctx.startRendering();
}

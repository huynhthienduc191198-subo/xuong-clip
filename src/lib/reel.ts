import type { Post } from "@/lib/xuong";
import { H, W, makeBed, paint, type Frame, type MusicId } from "@/lib/reel-draw";

export { H, MUSIC, W, loadImage, makeBed, paint } from "@/lib/reel-draw";
export type { Frame, MusicId } from "@/lib/reel-draw";

export async function coverBlob(frame: Omit<Frame, "cover" | "time">): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không vẽ được ảnh bìa.");
  paint(ctx, W, H, { ...frame, time: 0.4, cover: true });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Không ra ảnh bìa.");
  return blob;
}

export function outputSize(): { width: number; height: number; label: string } {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 900;
  if (coarse || narrow) return { width: 720, height: 1280, label: "720×1280" };
  return { width: 1080, height: 1920, label: "1080×1920" };
}

function mimeChoice(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const list = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return list.find((item) => MediaRecorder.isTypeSupported(item)) ?? "";
}

async function packMp4(blob: Blob): Promise<Blob | null> {
  try {
    const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } = await import("mediabunny");
    const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const conversion = await Conversion.init({ input, output, showWarnings: false });
    if (!conversion.isValid) return null;
    await conversion.execute();
    if (!target.buffer) return null;
    return new Blob([target.buffer], { type: "video/mp4" });
  } catch {
    return null;
  }
}

export interface Take {
  blob: Blob;
  ext: "mp4" | "webm";
  label: string;
}

export function recordClip(
  images: HTMLImageElement[],
  post: Post,
  music: MusicId,
  sample: boolean,
  onProgress: (ratio: number) => void,
): Promise<Take> {
  return new Promise((resolve, reject) => {
    void (async () => {
      if (!images.length) {
        reject(new Error("Chưa có ảnh."));
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        reject(new Error("Trình duyệt này chưa quay được. Hãy mở Chrome hoặc Safari bản mới."));
        return;
      }
      const size = outputSize();
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx || typeof canvas.captureStream !== "function") {
        reject(new Error("Máy này không quay được khung hình."));
        return;
      }
      await document.fonts.ready;
      const stream = canvas.captureStream(30);
      let audio: AudioContext | null = null;
      if (music !== "khong") {
        try {
          const bed = await makeBed(music, post.length);
          if (bed) {
            audio = new AudioContext();
            const dest = audio.createMediaStreamDestination();
            const source = audio.createBufferSource();
            source.buffer = bed;
            source.connect(dest);
            source.start();
            for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
          }
        } catch {
          await audio?.close();
          audio = null;
        }
      }
      const mime = mimeChoice();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: size.width >= 1080 ? 4_000_000 : 2_200_000 } : undefined);
      } catch {
        for (const track of stream.getAudioTracks()) stream.removeTrack(track);
        try {
          recorder = new MediaRecorder(stream);
        } catch (error) {
          await audio?.close();
          reject(error instanceof Error ? error : new Error("Không mở được máy quay."));
          return;
        }
      }
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        void audio?.close();
        reject(new Error("Quay bị dừng giữa chừng."));
      };
      recorder.onstop = () => {
        void (async () => {
          await audio?.close();
          for (const track of stream.getTracks()) track.stop();
          const type = recorder.mimeType || mime || "video/webm";
          let blob = new Blob(chunks, { type });
          let ext: "mp4" | "webm" = type.includes("mp4") ? "mp4" : "webm";
          if (ext === "webm") {
            const packed = await packMp4(blob);
            if (packed) {
              blob = packed;
              ext = "mp4";
            }
          }
          resolve({ blob, ext, label: size.label });
        })();
      };
      try {
        recorder.start(250);
      } catch (error) {
        await audio?.close();
        reject(error instanceof Error ? error : new Error("Không bắt đầu quay được."));
        return;
      }
      const started = performance.now();
      const tick = (now: number) => {
        const elapsed = (now - started) / 1000;
        paint(ctx, size.width, size.height, { images, time: Math.min(post.length, elapsed), post, cover: false, sample });
        onProgress(Math.min(1, elapsed / post.length));
        if (elapsed < post.length) requestAnimationFrame(tick);
        else recorder.stop();
      };
      requestAnimationFrame(tick);
    })();
  });
}

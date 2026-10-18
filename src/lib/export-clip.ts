export type ExportHeight = 720 | 1080 | 2160;

const SIZE: Record<ExportHeight, { width: number; height: number }> = {
  720: { width: 720, height: 1280 },
  1080: { width: 1080, height: 1920 },
  2160: { width: 2160, height: 3840 },
};

export function canUpscale(): boolean {
  return typeof VideoEncoder !== "undefined";
}

export async function exportClip(url: string, height: ExportHeight): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không tải được hình gốc.");
  const source = await response.blob();
  if (height === 720) return source;
  if (!canUpscale()) throw new Error("Máy này không xuất được nét cao. Tải bản 720.");

  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } = await import(
    "mediabunny"
  );
  const { width, height: pixels } = SIZE[height];
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const conversion = await Conversion.init({
    input,
    output,
    showWarnings: false,
    video: {
      width,
      height: pixels,
      fit: "cover",
      bitrate: height === 2160 ? 12_000_000 : 6_000_000,
    },
  });
  if (!conversion.isValid) throw new Error("Không xuất được nét này trên máy hiện tại.");
  await conversion.execute();
  if (!target.buffer) throw new Error("Xuất xong nhưng không có file.");
  return new Blob([target.buffer], { type: "video/mp4" });
}

export function saveBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const href = URL.createObjectURL(blob);
  link.href = href;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

export function saveText(text: string, filename: string, type: string) {
  saveBlob(new Blob([text], { type }), filename);
}

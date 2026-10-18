import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { saveBlob, saveText } from "@/lib/export-clip";
import { coverBlob, loadImage, makeBed, MUSIC, paint, recordClip, type MusicId } from "@/lib/reel";
import { BRANDS, LENGTHS, SAMPLES, makePost, postPack, toSrt, type BrandId, type LengthSec } from "@/lib/xuong";

interface Photo {
  id: string;
  url: string;
  owned: boolean;
}

function samplePhotos(brand: BrandId): Photo[] {
  return SAMPLES[brand].map((url, index) => ({ id: `sample-${brand}-${index}`, url, owned: false }));
}

interface Ready {
  url: string;
  blob: Blob;
  ext: string;
  label: string;
}

export function Bench() {
  const [brandId, setBrandId] = useState<BrandId>("spa");
  const [goalId, setGoalId] = useState("khong-gian");
  const [length, setLength] = useState<LengthSec>(12);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>(() => samplePhotos("spa"));
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [music, setMusic] = useState<MusicId>("tinh");
  const [ready, setReady] = useState<Ready | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bedRef = useRef<AudioContext | null>(null);
  const post = useMemo(() => makePost(brandId, goalId, note, length), [brandId, goalId, note, length]);
  const brand = BRANDS.find((item) => item.id === brandId) ?? BRANDS[0];

  useEffect(() => {
    setMusic(brandId === "spa" ? "tinh" : "dinh");
  }, [brandId]);

  useEffect(() => {
    setReady((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }, [brandId, goalId, length, note]);

  useEffect(() => {
    let cancel = false;
    if (!photos.length) {
      setImages([]);
      return;
    }
    Promise.all(photos.map((photo) => loadImage(photo.url)))
      .then((loaded) => {
        if (!cancel) setImages(loaded);
      })
      .catch(() => {
        if (!cancel) toast("Một ảnh không đọc được.");
      });
    return () => {
      cancel = true;
    };
  }, [photos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !images.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const time = ((now - started) / 1000) % post.length;
      paint(ctx, canvas.width, canvas.height, {
        images,
        time,
        post,
        cover: false,
        sample: photos.every((photo) => !photo.owned),
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [images, post, photos]);

  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;
  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (photo.owned) URL.revokeObjectURL(photo.url);
      });
      void bedRef.current?.close();
    };
  }, []);

  function chooseBrand(next: BrandId) {
    setBrandId(next);
    const first = BRANDS.find((item) => item.id === next)?.goals[0];
    if (first) setGoalId(first.id);
    setPhotos((current) => (current.some((photo) => photo.owned) ? current : samplePhotos(next)));
    setReady((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  function addFiles(list: FileList | File[]) {
    const incoming = [...list].filter((file) => /image\/(jpeg|png|webp)/.test(file.type));
    const owned = photos.filter((photo) => photo.owned);
    const room = 4 - owned.length;
    if (!incoming.length || room <= 0) {
      toast(room <= 0 ? "Đủ 4 ảnh." : "Chỉ nhận JPG, PNG hoặc WEBP.");
      return;
    }
    const next = incoming.slice(0, room).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      owned: true,
    }));
    setPhotos([...owned, ...next]);
    setReady((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    if (incoming.length > room) toast("Chỉ lấy đủ 4 ảnh.");
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const hit = current.find((photo) => photo.id === id);
      if (hit?.owned) URL.revokeObjectURL(hit.url);
      const next = current.filter((photo) => photo.id !== id);
      return next.length ? next : samplePhotos(brandId);
    });
    setReady((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  function movePhoto(id: string, dir: -1 | 1) {
    setPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === id);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = current.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function listen() {
    const synth = window.speechSynthesis;
    if (!synth) {
      toast("Máy này không đọc được tiếng.");
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(post.spoken);
    utter.lang = "vi-VN";
    synth.speak(utter);
  }

  async function hearMusic() {
    if (music === "khong") {
      toast("Đang chọn không tiếng.");
      return;
    }
    await bedRef.current?.close();
    const bed = await makeBed(music, 6);
    if (!bed) return;
    const ctx = new AudioContext();
    bedRef.current = ctx;
    const source = ctx.createBufferSource();
    source.buffer = bed;
    source.connect(ctx.destination);
    source.start();
    source.onended = () => void ctx.close();
  }

  async function downloadVideo() {
    if (!images.length) {
      toast("Chưa có ảnh để quay.");
      return;
    }
    setExporting("mp4");
    setProgress(0);
    try {
      const take = await recordClip(images, post, music, photos.every((photo) => !photo.owned), setProgress);
      const url = URL.createObjectURL(take.blob);
      setReady((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return { url, blob: take.blob, ext: take.ext, label: take.label };
      });
      toast(`Đã quay xong ${take.label}. Bấm tải để lưu .${take.ext}.`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không quay được.");
    } finally {
      setExporting(null);
    }
  }

  function saveVideo() {
    if (!ready) return;
    saveBlob(ready.blob, `${post.brandId}-${post.goalId}.${ready.ext}`);
  }

  async function downloadCover() {
    setExporting("cover");
    try {
      const blob = await coverBlob({ images, post, sample: photos.every((photo) => !photo.owned) });
      saveBlob(blob, `${post.brandId}-${post.goalId}-bia.jpg`);
      toast("Đã tải ảnh bìa.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Không ra ảnh bìa.");
    } finally {
      setExporting(null);
    }
  }

  async function copyPack() {
    try {
      await navigator.clipboard.writeText(postPack(post));
      toast("Đã chép tiêu đề, lời và hashtag.");
    } catch {
      toast("Không chép được. Giữ chữ và sao chép tay.");
    }
  }

  function downloadSrt() {
    saveText(toSrt(post.beats, post.length), `${post.brandId}-${post.goalId}-${post.length}s.srt`, "application/x-subrip");
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-10 lg:py-12">
      <section className="order-2 grid gap-6 lg:order-1">
        <header className="grid gap-2">
          <p className="text-sm font-medium text-muted">Xưởng</p>
          <h1 className="font-display text-4xl leading-tight tracking-tight text-fg">Quay một clip dọc.</h1>
          <p className="text-sm leading-normal text-muted">10 hoặc 12 giây, ngay trên trình duyệt. Ảnh mẫu để thử. Thay ảnh thật trước khi đăng.</p>
        </header>
        <div className="grid grid-cols-2 gap-2">
          {BRANDS.map((item) => {
            const on = item.id === brandId;
            return (
              <button key={item.id} type="button" aria-pressed={on} onClick={() => chooseBrand(item.id)} className={on ? "press min-h-11 rounded-lg border border-accent bg-surface px-3 text-left text-sm font-medium text-fg" : "press min-h-11 rounded-lg border border-border bg-elevated px-3 text-left text-sm text-muted"}>
                <span className="block">{item.name}</span>
                <span className="block text-xs text-subtle">{item.site}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium text-muted">Việc của clip</p>
          <div className="flex flex-wrap gap-2">
            {brand.goals.map((goal) => {
              const on = goal.id === goalId;
              return (
                <button key={goal.id} type="button" aria-pressed={on} onClick={() => setGoalId(goal.id)} className={on ? "press min-h-11 rounded-full border border-accent bg-surface px-4 text-sm font-medium text-fg" : "press min-h-11 rounded-full border border-border bg-elevated px-4 text-sm text-muted"}>
                  {goal.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium text-muted">Độ dài</p>
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((item) => {
              const on = item === length;
              return (
                <button key={item} type="button" aria-pressed={on} onClick={() => setLength(item)} className={on ? "press min-h-11 rounded-full border border-accent bg-surface px-4 text-sm font-medium text-fg" : "press min-h-11 rounded-full border border-border bg-elevated px-4 text-sm text-muted"}>
                  {item} giây
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium text-muted">Ảnh thật, tối đa 4</p>
          <div className="grid gap-3 rounded-lg border border-dashed border-border bg-elevated p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>Chọn ảnh từ máy</Button>
            {photos.length ? (
              <ul className="grid grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <li key={photo.id} className="grid gap-1">
                    <img src={photo.url} alt="" className="aspect-square w-full rounded-md object-cover" />
                    <div className="grid grid-cols-3">
                      <button type="button" className="min-h-11 text-xs text-muted" disabled={index === 0} onClick={() => movePhoto(photo.id, -1)}>Trước</button>
                      <button type="button" className="min-h-11 text-xs text-muted" disabled={index === photos.length - 1} onClick={() => movePhoto(photo.id, 1)}>Sau</button>
                      <button type="button" className="min-h-11 text-xs text-muted" onClick={() => removePhoto(photo.id)}>Bỏ</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs leading-normal text-subtle">Kéo ảnh phòng hoặc mặt bằng vào đây. Không dùng ảnh AI thay cơ sở.</p>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-medium text-muted">Nhạc nền, không bản quyền</p>
          <div className="flex flex-wrap gap-2">
            {MUSIC.map((item) => {
              const on = item.id === music;
              return (
                <button key={item.id} type="button" aria-pressed={on} onClick={() => setMusic(item.id)} className={on ? "press min-h-11 rounded-full border border-accent bg-surface px-4 text-sm font-medium text-fg" : "press min-h-11 rounded-full border border-border bg-elevated px-4 text-sm text-muted"}>
                  {item.label}
                </button>
              );
            })}
          </div>
          <button type="button" className="w-fit text-sm text-muted underline-offset-2 hover:underline" onClick={hearMusic}>Nghe thử nhạc</button>
        </div>
        <Field label="Thêm một ý, nếu có">
          <TextArea value={note} maxLength={140} placeholder="Một câu ngắn, không giá, không hứa suất." onChange={(event) => setNote(event.target.value)} />
        </Field>
        <p className="text-xs leading-normal text-subtle">Video {post.length} giây, 9:16. Chân hình ghi {brand.footer}. Không ghi giá, không hứa lợi nhuận.</p>
      </section>
      <article className="order-1 grid justify-items-center gap-4 lg:order-2" aria-busy={exporting !== null}>
        <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-elevated">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-fg">{post.brand}</p>
              <p className="text-xs text-subtle">{post.site}</p>
            </div>
            <p className="text-xs font-medium text-muted">{post.goalLabel} · {post.length}s</p>
          </div>
          <div className="ratio-story relative overflow-hidden bg-bg">
            {ready ? (
              <video key={ready.url} className="absolute inset-0 h-full w-full object-cover" src={ready.url} controls playsInline />
            ) : (
              <canvas ref={canvasRef} width={540} height={960} className="absolute inset-0 h-full w-full" />
            )}
          </div>
          <div className="grid gap-3 px-4 py-4">
            <p className="font-display text-xl leading-snug text-fg">{post.hook}</p>
            <p className="whitespace-pre-line text-sm leading-normal text-muted">{post.caption}</p>
            <p className="text-xs leading-normal text-subtle">{post.tags}</p>
            <p className="text-xs leading-normal text-subtle">
              {photos.every((photo) => !photo.owned)
                ? "Đang dùng 3 ảnh mẫu. Ảnh mẫu không phải cơ sở. Hãy thay trước khi đăng."
                : `${photos.filter((photo) => photo.owned).length} ảnh của bạn.`}
            </p>
          </div>
        </div>
        {exporting ? (
          <div className="grid w-full max-w-sm gap-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="text-xs text-subtle">Đang quay {Math.round(progress * 100)}%</p>
          </div>
        ) : null}
        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button type="button" disabled={exporting !== null} onClick={downloadVideo}>{exporting ? "Đang quay…" : "Tạo video"}</Button>
          {ready ? <Button type="button" variant="secondary" onClick={saveVideo}>Tải video về máy (.{ready.ext})</Button> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" className="flex-1" disabled={exporting !== null} onClick={downloadCover}>{exporting === "cover" ? "Đang làm bìa…" : "Tải ảnh bìa"}</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={copyPack}>Sao chép bài đăng</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={listen}>Nghe lời</Button>
            <Button type="button" variant="secondary" size="sm" onClick={downloadSrt}>Phụ đề</Button>
          </div>
        </div>
      </article>
    </main>
  );
}

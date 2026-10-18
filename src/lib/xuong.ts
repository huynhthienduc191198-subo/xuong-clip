export type BrandId = "spa" | "dat";
export type LengthSec = 10 | 12;

export interface Beat {
  at: string;
  line: string;
}

export interface Post {
  brandId: BrandId;
  brand: string;
  site: string;
  footer: string;
  goalId: string;
  goalLabel: string;
  length: LengthSec;
  hook: string;
  spoken: string;
  caption: string;
  tags: string;
  beats: Beat[];
  voiceUrl: string | null;
  pictureNote: string;
}

interface Goal {
  id: string;
  label: string;
  hook: string;
  lines: string[];
  spoken: string;
  caption: string;
}

interface Brand {
  id: BrandId;
  name: string;
  site: string;
  footer: string;
  tags: string;
  goals: Goal[];
}

export const LENGTHS: LengthSec[] = [10, 12];

export const SAMPLES: Record<BrandId, string[]> = {
  spa: ["/samples/spa-1.jpg", "/samples/spa-2.jpg", "/samples/spa-3.jpg"],
  dat: ["/samples/dat-1.jpg", "/samples/dat-2.jpg", "/samples/dat-3.jpg"],
};

export const BRANDS: Brand[] = [
  {
    id: "spa",
    name: "Như Đăng Spa",
    site: "nhudangspa.com",
    footer: "nhudangspa.com  ·  Hotline 0862 061 606",
    tags: "#NhuDangSpa #SpaCanTho #GoiDauDuongSinh #CanTho #DatLichSpa #NhuDang",
    goals: [
      {
        id: "khong-gian",
        label: "Không gian & phòng ốc",
        hook: "Phòng im. Đèn thấp.",
        lines: ["Cửa khép", "Khăn đã xếp", "Một góc yên"],
        spoken: "Phòng im. Ánh sáng thấp. Như Đăng Spa, Cần Thơ. Đặt lịch trên nhudangspa.com. Hotline 0862 061 606.",
        caption: "Không gian Như Đăng Spa tại Cần Thơ.\nẢnh trong clip là ảnh đưa vào máy.\nĐặt lịch trên nhudangspa.com\nHotline 0862 061 606",
      },
      {
        id: "sau-gio",
        label: "Thư giãn sau giờ làm",
        hook: "Tan làm. Ngồi xuống.",
        lines: ["Vào phòng", "Đèn ấm", "Phố ở ngoài"],
        spoken: "Tan làm. Vào một chỗ im. Như Đăng Spa. Giữ chỗ trên nhudangspa.com hoặc gọi 0862 061 606.",
        caption: "Sau giờ làm, cần một chỗ im.\nNhư Đăng Spa, Cần Thơ.\nnhudangspa.com · Hotline 0862 061 606",
      },
      {
        id: "hoi-vien",
        label: "Hội viên & giữ chỗ",
        hook: "Giữ chỗ trước cuối tuần.",
        lines: ["Vào trước", "Lịch kín sớm", "Hỏi tại quầy"],
        spoken: "Hội viên giữ chỗ trên nhudangspa.com. Clip không ghi mức ưu đãi. Hỏi quầy hoặc hotline 0862 061 606.",
        caption: "Hội viên giữ chỗ trên nhudangspa.com.\nClip không ghi số tiền giảm.\nHotline 0862 061 606",
      },
    ],
  },
  {
    id: "dat",
    name: "Phát Đạt",
    site: "congtyphatdat.com",
    footer: "congtyphatdat.com  ·  Hotline 0366.79.39.39",
    tags: "#CongTyPhatDat #NhaNghiPhatDat #BatDongSan #CanTho #KyGuiNhaDat #ChoThue",
    goals: [
      {
        id: "phong-nghi",
        label: "Phòng nghỉ",
        hook: "Đúng phòng trong ảnh.",
        lines: ["Từng góc phòng", "Không phải ảnh vẽ", "Xem tận nơi"],
        spoken: "Phòng nghỉ Phát Đạt. Xem hiện trạng trong ảnh. Không chốt giá trên clip. Hotline 0366.79.39.39. congtyphatdat.com.",
        caption: "Phòng nghỉ Phát Đạt.\nXem hiện trạng trong ảnh, không đọc giá trên clip.\nHotline 0366.79.39.39\ncongtyphatdat.com",
      },
      {
        id: "mat-bang",
        label: "Mặt bằng cho thuê",
        hook: "Mặt bằng thật.",
        lines: ["Đúng hiện trạng", "Không phối cảnh", "Đứng tại chỗ"],
        spoken: "Mặt bằng cho thuê theo ảnh thật. Không phối cảnh, không chốt giá trên clip. congtyphatdat.com. Hotline 0366.79.39.39.",
        caption: "Mặt bằng cho thuê theo hiện trạng trong ảnh.\nKhông chốt giá trên clip.\ncongtyphatdat.com · 0366.79.39.39",
      },
      {
        id: "ky-gui",
        label: "Ký gửi nhà đất",
        hook: "Ký gửi. Hỏi giấy trước.",
        lines: ["Giấy tờ rõ", "Phí hỏi trực tiếp", "Không hứa lời"],
        spoken: "Ký gửi nhà đất. Phí và giấy tờ không chốt trong clip. Xem trên congtyphatdat.com hoặc gọi 0366.79.39.39.",
        caption: "Ký gửi nhà đất.\nPhí và giấy tờ hỏi trực tiếp, clip không chốt phí, không hứa lợi nhuận.\ncongtyphatdat.com · 0366.79.39.39",
      },
    ],
  },
];

export function brandById(id: BrandId): Brand {
  const brand = BRANDS.find((item) => item.id === id);
  if (!brand) throw new Error("Không có thương hiệu");
  return brand;
}

function clipNote(note: string): string {
  return note.trim().replace(/\s+/g, " ").slice(0, 140);
}

function stamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function beatsFor(lines: string[], seconds: LengthSec): Beat[] {
  const used = lines.slice(0, 3);
  const marks = seconds === 10 ? [0, 3, 5] : [0, 3, 6];
  return used.map((line, index) => ({ at: stamp(marks[index] ?? 0), line }));
}

export function toSrt(beats: Beat[], seconds: number): string {
  const points = beats.map((beat) => {
    const [m, s] = beat.at.split(":").map(Number);
    return { start: m * 60 + s, line: beat.line };
  });
  return points
    .map((point, index) => {
      const end = points[index + 1]?.start ?? seconds;
      return `${index + 1}\n${srtTime(point.start)} --> ${srtTime(end)}\n${point.line}\n`;
    })
    .join("\n");
}

function srtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},000`;
}

export function makePost(brandId: BrandId, goalId: string, note: string, length: LengthSec): Post {
  const brand = brandById(brandId);
  const goal = brand.goals.find((item) => item.id === goalId) ?? brand.goals[0];
  const extra = clipNote(note);
  return {
    brandId: brand.id,
    brand: brand.name,
    site: brand.site,
    footer: brand.footer,
    goalId: goal.id,
    goalLabel: goal.label,
    length,
    hook: extra || goal.hook,
    spoken: extra ? `${extra}. ${goal.spoken}` : goal.spoken,
    caption: extra ? `${extra}\n${goal.caption}` : goal.caption,
    tags: brand.tags,
    beats: beatsFor(goal.lines, length),
    voiceUrl: null,
    pictureNote: "Thay ảnh mẫu bằng ảnh thật trước khi đăng. Clip không ghi giá và không hứa lợi nhuận.",
  };
}

export function postPack(post: Post): string {
  return `${post.hook}\n\n${post.caption}\n\n${post.tags}`;
}

export const OPENING_POST = makePost("spa", "khong-gian", "", 12);

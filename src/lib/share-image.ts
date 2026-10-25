import type { shareModel } from "../domain/tracking/share.ts";

type Model = ReturnType<typeof shareModel>;
const W = 1080,
  H = 1440;
// Identity palette: deep brown, cream, gold, terracotta, olive.
const ink = "#231f1c",
  cream = "#f4efe6",
  gold = "#c8913a",
  goldDeep = "#8e6420",
  terracotta = "#b5532a",
  terracottaLight = "#e07a4a",
  oliveLight = "#93a45a",
  creamMuted = "#cfc4b4",
  inkMuted = "#4d4339";

function families() {
  const css = getComputedStyle(document.documentElement);
  return {
    latin: css.getPropertyValue("--font-archivo").trim() || "Arial",
    arabic: css.getPropertyValue("--font-readex").trim() || "Tahoma",
    display: css.getPropertyValue("--font-cormorant").trim() || "Georgia",
  };
}
const missing = (v: string) => (v === "—" ? "–" : v);
async function loadMark() {
  const img = new Image();
  img.src = "/brand/mark.png";
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

/** Renders the privacy-safe share model only: no coordinates, names or IDs. */
export async function createShareImage(model: Model): Promise<Blob> {
  await document.fonts.ready;
  const mark = await loadMark();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas unavailable");
  const ar = model.locale === "ar";
  const { latin, arabic, display } = families();
  const text = ar ? `${arabic}, ${latin}` : `${latin}, ${arabic}`;
  const font = (weight: number, size: number, family = text) => {
    c.font = `${weight} ${size}px ${family}`;
  };
  const light = model.template === "performance";
  const fg = light ? ink : cream,
    muted = light ? inkMuted : creamMuted,
    route = light ? terracotta : terracottaLight,
    accent = light ? goldDeep : gold;
  // Ground: the icon's warm radial light on deep brown, or warm cream.
  c.fillStyle = light ? cream : ink;
  c.fillRect(0, 0, W, H);
  if (!light) {
    const glow = c.createRadialGradient(300, 160, 40, 300, 160, 900);
    glow.addColorStop(0, "rgba(244,239,230,0.07)");
    glow.addColorStop(1, "rgba(244,239,230,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
  }
  // Cross-stitch band, as on the icon: zig-zag row, olive/terracotta row, gold row.
  const stitchBand = (top: number, size: number) => {
    const step = size * 2.2;
    const cross = (x: number, y: number, color: string) => {
      c.strokeStyle = color;
      c.lineWidth = size * 0.28;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x - size / 2, y - size / 2);
      c.lineTo(x + size / 2, y + size / 2);
      c.moveTo(x + size / 2, y - size / 2);
      c.lineTo(x - size / 2, y + size / 2);
      c.stroke();
    };
    const count = Math.floor((W - size * 2) / step) + 1,
      start = (W - (count - 1) * step) / 2;
    for (let i = 0; i < count; i++) {
      const x = start + i * step;
      cross(x, top + (i % 2 ? 0 : size * 0.45), light ? ink : cream);
      cross(x, top + size * 1.6, i % 2 ? terracottaLight : oliveLight);
      cross(x, top + size * 2.7, gold);
    }
  };

  // Header: the icon, the tracked serif wordmark, activity and date.
  const pad = 88;
  if (mark) c.drawImage(mark, pad, 84, 92, 92);
  c.textAlign = "left";
  c.direction = "ltr";
  c.fillStyle = fg;
  font(600, 46, display);
  c.fillText("V A E L O R A", pad + (mark ? 118 : 0), 146);
  c.textAlign = "right";
  c.direction = ar ? "rtl" : "ltr";
  font(700, 32);
  c.fillStyle = accent;
  c.fillText(model.activity, W - pad, 120);
  font(500, 26);
  c.fillStyle = muted;
  c.fillText(model.date, W - pad, 160);
  c.direction = "ltr";

  const drawRoute = (left: number, top: number, size: number) => {
    c.lineJoin = "round";
    c.lineCap = "round";
    for (const [color, width] of [
      [light ? cream : ink, 26],
      [route, 12],
    ] as const) {
      c.strokeStyle = color;
      c.lineWidth = width;
      for (const path of model.route) {
        c.beginPath();
        path.forEach(([x, y], i) => {
          if (i === 0) c.moveTo(left + x * size, top + y * size);
          else c.lineTo(left + x * size, top + y * size);
        });
        c.stroke();
      }
    }
  };
  // Route withheld for privacy: an honest stitched frame, never a stand-in shape.
  const drawHidden = (top: number, height: number) => {
    c.strokeStyle = muted;
    c.globalAlpha = 0.55;
    c.lineWidth = 3;
    c.setLineDash([14, 12]);
    c.beginPath();
    c.roundRect(pad, top, W - pad * 2, height, 28);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    c.textAlign = "center";
    c.direction = ar ? "rtl" : "ltr";
    c.fillStyle = muted;
    font(500, 30);
    c.fillText(ar ? "المسار مخفي لحماية الخصوصية" : "Route hidden for privacy", W / 2, top + height / 2 + 10);
    c.direction = "ltr";
  };
  const metric = (value: string, label: string, x: number, y: number, size: number, align: CanvasTextAlign) => {
    c.textAlign = align;
    c.direction = "ltr";
    c.fillStyle = fg;
    font(700, size, latin);
    c.fillText(missing(value), x, y);
    c.direction = ar ? "rtl" : "ltr";
    c.fillStyle = muted;
    font(600, 28);
    c.fillText(label, x, y + 46);
    c.direction = "ltr";
  };
  const labels = {
    km: ar ? "كيلومتر" : "KILOMETRES",
    time: ar ? "الوقت النشط" : "ACTIVE TIME",
    pace: ar ? "متوسط الوتيرة /كم" : "AVG PACE /KM",
  };

  if (model.template === "map") {
    if (model.routeUseful) drawRoute(150, 230, 760);
    else drawHidden(250, 610);
    c.fillStyle = "rgba(244,239,230,0.12)";
    c.fillRect(pad, 960, W - pad * 2, 2);
    metric(model.distance, labels.km, pad, 1110, 150, "left");
    metric(model.duration, labels.time, W - pad, 1060, 62, "right");
    if (model.pace !== "—") metric(model.pace, labels.pace, W - pad, 1180, 62, "right");
  } else if (model.template === "performance") {
    metric(model.distance, labels.km, pad, 470, 250, "left");
    c.fillStyle = "#d9cfbf";
    c.fillRect(pad, 600, W - pad * 2, 2);
    metric(model.duration, labels.time, pad, 740, 92, "left");
    metric(model.pace, labels.pace, W - pad, 740, 92, "right");
    if (model.routeUseful) drawRoute(340, 850, 400);
    else drawHidden(860, 300);
  } else {
    c.textAlign = "center";
    c.direction = "ltr";
    c.fillStyle = cream;
    font(700, 300, latin);
    c.fillText(missing(model.distance), W / 2, 720);
    c.direction = ar ? "rtl" : "ltr";
    c.fillStyle = gold;
    font(600, 36);
    c.fillText(labels.km, W / 2, 790);
    c.direction = "ltr";
    metric(model.duration, labels.time, W / 2, 1010, 78, "center");
  }

  if (model.template !== "minimal" && (model.temperature != null || model.score != null)) {
    const parts = [
      model.temperature != null ? `${model.temperature}°C` : "",
      model.score != null ? `VAELORA ${model.score}/100` : "",
    ].filter(Boolean);
    c.textAlign = "left";
    c.direction = "ltr";
    c.fillStyle = accent;
    font(600, 30, latin);
    c.fillText(parts.join("   "), pad, 1256);
  }
  stitchBand(1300, 20);
  c.textAlign = "center";
  c.direction = ar ? "rtl" : "ltr";
  c.fillStyle = muted;
  font(500, 22);
  c.fillText(
    ar ? "خصوصيتك أولًا: منطقتا البداية والنهاية مخفيتان" : "PRIVACY FIRST: START AND END ZONES HIDDEN",
    W / 2,
    1408,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image unavailable"))),
      "image/png",
    ),
  );
}
export function saveShareImage(blob: Blob) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "vaelora-activity.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function nativeShareImage(blob: Blob) {
  const file = new File([blob], "vaelora-activity.png", { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "VAELORA" });
    return "shared";
  }
  saveShareImage(blob);
  return "downloaded";
}

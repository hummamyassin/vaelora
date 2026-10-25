import type { shareModel } from "../domain/tracking/share.ts";

type Model = ReturnType<typeof shareModel>;
const W = 1080,
  H = 1440;
// Card palette mirrors the app tokens: synoptic ink, chart paper, course ink.
const ink = "#0d1724",
  paper = "#eceff1",
  paperText = "#0d1724",
  bandText = "#eef2f5",
  bandMuted = "#a9b6c3",
  paperMuted = "#3f4b58",
  course = "#ff4d7a",
  courseDeep = "#9b1c3c";

function families() {
  const css = getComputedStyle(document.documentElement);
  const latin = css.getPropertyValue("--font-archivo").trim() || "Arial";
  const arabic = css.getPropertyValue("--font-readex").trim() || "Tahoma";
  return { latin, arabic };
}
const missing = (v: string) => (v === "—" ? "–" : v);

/** Renders the privacy-safe share model only: no coordinates, names or IDs. */
export async function createShareImage(model: Model): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas unavailable");
  const ar = model.locale === "ar";
  const { latin, arabic } = families();
  const text = ar ? `${arabic}, ${latin}` : `${latin}, ${arabic}`;
  const stretch = (value: "condensed" | "normal" | "expanded") => {
    if ("fontStretch" in c) (c as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = value;
  };
  const font = (weight: number, size: number, family = text, width: "condensed" | "normal" | "expanded" = "normal") => {
    stretch(width);
    c.font = `${weight} ${size}px ${family}`;
  };
  const light = model.template === "performance";
  const fg = light ? paperText : bandText,
    muted = light ? paperMuted : bandMuted,
    accent = light ? courseDeep : course;
  c.fillStyle = light ? paper : ink;
  c.fillRect(0, 0, W, H);

  // Header: mark, expanded wordmark, activity and date.
  const pad = 88;
  c.fillStyle = fg;
  [
    [pad, 118, 22, 44],
    [pad + 34, 96, 22, 66],
    [pad + 68, 106, 22, 56],
  ].forEach(([x, y, w, h], i) => {
    c.globalAlpha = i === 2 ? 0.55 : 1;
    c.fillRect(x, y, w, h);
  });
  c.globalAlpha = 1;
  c.strokeStyle = accent;
  c.lineWidth = 9;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(pad + 22, 80);
  c.lineTo(pad + 22, 66);
  c.lineTo(pad + 66, 66);
  c.lineTo(pad + 66, 80);
  c.stroke();
  c.textAlign = "left";
  c.direction = "ltr";
  font(800, 40, latin, "expanded");
  c.fillText("VAELORA", pad + 118, 146);
  c.textAlign = "right";
  c.direction = ar ? "rtl" : "ltr";
  font(700, 34);
  c.fillStyle = accent;
  c.fillText(model.activity, W - pad, 120);
  font(500, 28);
  c.fillStyle = muted;
  c.fillText(model.date, W - pad, 160);
  c.direction = "ltr";

  const drawRoute = (left: number, top: number, size: number) => {
    c.lineJoin = "round";
    c.lineCap = "round";
    for (const [color, width] of [
      [light ? paper : ink, 26],
      [accent, 12],
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
  // Route withheld for privacy: an honest empty frame, never a stand-in shape.
  const drawHidden = (top: number, height: number) => {
    c.strokeStyle = muted;
    c.globalAlpha = 0.6;
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
    font(780, size, latin, "condensed");
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
    if (model.routeUseful) drawRoute(150, 230, 780);
    else drawHidden(260, 640);
    c.fillStyle = "rgba(255,255,255,0.08)";
    c.fillRect(pad, 1000, W - pad * 2, 2);
    metric(model.distance, labels.km, pad, 1150, 150, "left");
    metric(model.duration, labels.time, W - pad, 1100, 64, "right");
    if (model.pace !== "—") metric(model.pace, labels.pace, W - pad, 1230, 64, "right");
  } else if (model.template === "performance") {
    metric(model.distance, labels.km, pad, 470, 260, "left");
    c.fillStyle = "#cbd3d9";
    c.fillRect(pad, 600, W - pad * 2, 2);
    metric(model.duration, labels.time, pad, 740, 96, "left");
    metric(model.pace, labels.pace, W - pad, 740, 96, "right");
    if (model.routeUseful) drawRoute(330, 860, 420);
    else drawHidden(880, 320);
  } else {
    c.fillStyle = accent;
    c.fillRect(0, 380, W, 520);
    c.textAlign = "center";
    c.direction = "ltr";
    c.fillStyle = light ? paper : ink;
    font(800, 300, latin, "condensed");
    c.fillText(missing(model.distance), W / 2, 720);
    c.direction = ar ? "rtl" : "ltr";
    font(650, 34);
    c.fillText(labels.km, W / 2, 790);
    c.direction = "ltr";
    metric(model.duration, labels.time, W / 2, 1080, 80, "center");
  }

  if (model.template !== "minimal" && (model.temperature != null || model.score != null)) {
    const parts = [
      model.temperature != null ? `${model.temperature}°C` : "",
      model.score != null ? `VAELORA ${model.score}/100` : "",
    ].filter(Boolean);
    c.textAlign = "left";
    c.direction = "ltr";
    c.fillStyle = muted;
    font(600, 30, latin);
    c.fillText(parts.join("   "), pad, model.template === "map" ? 1300 : 1290);
  }
  c.textAlign = "center";
  c.direction = ar ? "rtl" : "ltr";
  c.fillStyle = muted;
  font(500, 24);
  c.fillText(
    ar ? "خصوصيتك أولًا: منطقتا البداية والنهاية مخفيتان" : "PRIVACY FIRST: START AND END ZONES HIDDEN",
    W / 2,
    1384,
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

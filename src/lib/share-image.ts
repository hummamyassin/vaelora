import type { shareModel } from "../domain/tracking/share.ts";

type Model = ReturnType<typeof shareModel>;
const W = 1080,
  H = 1440;
// V2.5 palette (tokens.css): instrument black or warm white, ember, leaf, gold.
const dark = { bg: "#08090b", fg: "#f4f5f2", muted: "#a9adb4", rule: "rgba(244,245,242,0.14)", accent: "#ff6a2e", gold: "#f5c35c", good: "#6ee79a" },
  light = { bg: "#f6f6f3", fg: "#0e1013", muted: "#464a51", rule: "rgba(14,16,19,0.14)", accent: "#e9520f", gold: "#7a5000", good: "#136f37" };

function families() {
  const css = getComputedStyle(document.documentElement);
  return {
    latin: css.getPropertyValue("--font-archivo").trim() || "Arial",
    arabic: css.getPropertyValue("--font-readex").trim() || "Tahoma",
    brand: css.getPropertyValue("--font-cormorant").trim() || "Georgia",
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
  const { latin, arabic, brand } = families();
  const text = ar ? `${arabic}, ${latin}` : `${latin}, ${arabic}`;
  const font = (weight: number, size: number, family = text) => {
    c.font = `${weight} ${size}px ${family}`;
  };
  const p = model.template === "performance" ? light : dark;

  // Ground: instrument black with a faint ember glow at the top corner, or warm white.
  c.fillStyle = p.bg;
  c.fillRect(0, 0, W, H);
  if (p === dark) {
    const glow = c.createRadialGradient(W, 0, 40, W, 0, 900);
    glow.addColorStop(0, "rgba(255,106,46,0.2)");
    glow.addColorStop(1, "rgba(255,106,46,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
  }

  // Header: the V icon, the tracked wordmark, the activity and date.
  const pad = 88;
  if (mark) c.drawImage(mark, pad, 84, 92, 92);
  c.textAlign = "left";
  c.direction = "ltr";
  c.fillStyle = p.fg;
  font(600, 44, brand);
  c.fillText("V A E L O R A", pad + (mark ? 118 : 0), 146);
  c.textAlign = "right";
  c.direction = ar ? "rtl" : "ltr";
  font(800, 32);
  c.fillStyle = p.accent;
  c.fillText(model.activity, W - pad, 120);
  font(500, 26);
  c.fillStyle = p.muted;
  c.fillText(model.date, W - pad, 160);
  c.direction = "ltr";

  // The route: an ember line on a ground-coloured outline.
  const drawRoute = (left: number, top: number, size: number) => {
    c.lineJoin = "round";
    c.lineCap = "round";
    for (const [color, width] of [
      [p.bg, 30],
      [p.accent, 14],
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
  // Route withheld for privacy: an honest dashed frame, never a stand-in shape.
  const drawHidden = (top: number, height: number) => {
    c.strokeStyle = p.muted;
    c.globalAlpha = 0.55;
    c.lineWidth = 3;
    c.setLineDash([14, 12]);
    c.beginPath();
    c.roundRect(pad, top, W - pad * 2, height, 36);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    c.textAlign = "center";
    c.direction = ar ? "rtl" : "ltr";
    c.fillStyle = p.muted;
    font(500, 30);
    c.fillText(ar ? "المسار مخفي لحماية الخصوصية" : "Route hidden for privacy", W / 2, top + height / 2 + 10);
    c.direction = "ltr";
  };
  // Watch-style figures: heavy, condensed, tabular.
  const metric = (value: string, label: string, x: number, y: number, size: number, align: CanvasTextAlign) => {
    c.textAlign = align;
    c.direction = "ltr";
    c.fillStyle = p.fg;
    c.fontStretch = "condensed";
    font(800, size, latin);
    c.fillText(missing(value), x, y);
    c.fontStretch = "normal";
    c.direction = ar ? "rtl" : "ltr";
    c.fillStyle = p.muted;
    font(650, 28);
    c.fillText(label, x, y + 46);
    c.direction = "ltr";
  };
  const rule = (y: number) => {
    c.fillStyle = p.rule;
    c.fillRect(pad, y, W - pad * 2, 2);
  };
  const labels = {
    km: ar ? "كيلومتر" : "KILOMETRES",
    time: ar ? "الوقت النشط" : "ACTIVE TIME",
    pace: ar ? "متوسط الوتيرة /كم" : "AVG PACE /KM",
  };

  if (model.template === "map") {
    if (model.routeUseful) drawRoute(150, 230, 760);
    else drawHidden(250, 610);
    rule(960);
    metric(model.distance, labels.km, pad, 1110, 160, "left");
    metric(model.duration, labels.time, W - pad, 1060, 64, "right");
    if (model.pace !== "—") metric(model.pace, labels.pace, W - pad, 1180, 64, "right");
  } else if (model.template === "performance") {
    metric(model.distance, labels.km, pad, 470, 260, "left");
    rule(600);
    metric(model.duration, labels.time, pad, 740, 96, "left");
    metric(model.pace, labels.pace, W - pad, 740, 96, "right");
    if (model.routeUseful) drawRoute(340, 850, 400);
    else drawHidden(860, 300);
  } else {
    // Minimal: the distance on an ember plate, the card's one action colour.
    c.fillStyle = p.accent;
    c.fillRect(0, 440, W, 420);
    c.textAlign = "center";
    c.direction = "ltr";
    c.fillStyle = "#120802";
    c.fontStretch = "condensed";
    font(800, 300, latin);
    c.fillText(missing(model.distance), W / 2, 720);
    c.fontStretch = "normal";
    c.direction = ar ? "rtl" : "ltr";
    font(700, 36);
    c.fillText(labels.km, W / 2, 800);
    c.direction = "ltr";
    metric(model.duration, labels.time, W / 2, 1010, 80, "center");
  }

  // Conditions: temperature in gold; the score in leaf when comfortable.
  if (model.template !== "minimal" && (model.temperature != null || model.score != null)) {
    c.textAlign = "left";
    c.direction = "ltr";
    font(750, 30, latin);
    let x = pad;
    if (model.temperature != null) {
      const t = `${model.temperature}°C`;
      c.fillStyle = p.gold;
      c.fillText(t, x, 1256);
      x += c.measureText(`${t}   `).width;
    }
    if (model.score != null) {
      c.fillStyle = model.score >= 80 ? p.good : model.score >= 60 ? p.gold : p.muted;
      c.fillText(`VAELORA ${model.score}/100`, x, 1256);
    }
  }
  rule(1320);
  c.textAlign = "center";
  c.direction = ar ? "rtl" : "ltr";
  c.fillStyle = p.muted;
  font(600, 22);
  c.fillText(
    ar ? "خصوصيتك أولًا: منطقتا البداية والنهاية مخفيتان" : "PRIVACY FIRST: START AND END ZONES HIDDEN",
    W / 2,
    1392,
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

import type { shareModel } from "../domain/tracking/share.ts";

type Model = ReturnType<typeof shareModel>;
const W = 1080,
  H = 1440;
// Material reference stops (tokens.css): black chrome, platinum, gold, copper, green metal.
const platinumText = ["#ffffff", "#f4f6f8", "#c7cbcf", "#e6e9ec", "#9aa0a6"] as const,
  chromeText = ["#5e6268", "#1c1d20", "#050506", "#3a3d42", "#1c1d20"] as const,
  goldText = ["#fff6d8", "#f3d27e", "#e9c065", "#c8952f", "#c08a2c"] as const,
  oliveText = ["#f2f8cf", "#c9d986", "#a3b552", "#d3e08f", "#86993a"] as const,
  steelText = ["#e6e9ec", "#a9aeb4", "#8e949a"] as const,
  chromeBand = ["#2f3136", "#1f2024", "#17181b", "#111214", "#0b0b0d"] as const,
  platinumBand = ["#ffffff", "#f8f9fa", "#eceef0", "#dcdfe2"] as const,
  thread = { dark: ["#eef0f2", "#c7cbcf", "#8e949a", "#5e6268"], light: ["#c7cbcf", "#8e949a", "#5e6268", "#3a3d42"] },
  copper = { edge: "#5a200c", body: "#a44a22", core: "#dc7b48", glint: "#ffc7a2" },
  goldInk = "#6e4508",
  platinumMuted = "#c9c6c0",
  chromeMuted = "#4b4f55";

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
  // Polished metal fill, lit from above: evenly spaced stops between top and bottom.
  const metal = (top: number, bottom: number, stops: readonly string[], x0 = 0, x1 = 0) => {
    const g = c.createLinearGradient(x0, top, x1, bottom);
    stops.forEach((color, i) => g.addColorStop(i / (stops.length - 1), color));
    return g;
  };
  const light = model.template === "performance";
  const muted = light ? chromeMuted : platinumMuted,
    figure = light ? chromeText : platinumText;

  // Ground: a black chrome slab (or brushed platinum), lit from the top left,
  // with fine horizontal grain like the interface surfaces.
  c.fillStyle = metal(0, H, light ? platinumBand : chromeBand, 0, H * 0.14);
  c.fillRect(0, 0, W, H);
  const glint = c.createRadialGradient(150, 0, 40, 150, 0, 1100);
  glint.addColorStop(0, light ? "rgba(255,255,255,0.7)" : "rgba(201,205,210,0.16)");
  glint.addColorStop(1, "rgba(201,205,210,0)");
  c.fillStyle = glint;
  c.fillRect(0, 0, W, H);
  // Brushed grain: one-pixel streaks of uneven strength (a fixed hash, so the
  // same activity always renders the same card).
  for (let y = 0; y < H; y += 2) {
    const n = Math.abs(Math.sin(y * 12.9898) * 43758.5453) % 1;
    c.fillStyle = n > 0.5
      ? `rgba(255,255,255,${(light ? 0.5 : 0.03) * (n - 0.5)})`
      : `rgba(0,0,0,${(light ? 0.05 : 0.07) * n})`;
    c.fillRect(0, y, W, 1);
  }
  // Reflective top edge.
  c.fillStyle = light ? "rgba(255,255,255,0.9)" : "rgba(201,205,210,0.35)";
  c.fillRect(0, 0, W, 2);

  // Cross-stitch band from the icon, in platinum thread: shade, lit stroke, edge.
  const stitchBand = (top: number, size: number) => {
    const step = size * 2.2;
    const stops = light ? thread.light : thread.dark;
    const cross = (x: number, y: number, depth = 1) => {
      c.globalAlpha = depth;
      const h = size / 2;
      const path = (dy: number) => {
        c.beginPath();
        c.moveTo(x - h, y - h + dy);
        c.lineTo(x + h, y + h + dy);
        c.moveTo(x + h, y - h + dy);
        c.lineTo(x - h, y + h + dy);
        c.stroke();
      };
      c.lineCap = "round";
      c.lineWidth = size * 0.26;
      c.strokeStyle = light ? "rgba(28,29,32,0.18)" : "rgba(0,0,0,0.55)";
      path(size * 0.1);
      c.strokeStyle = metal(y - h, y + h, stops, x - h * 0.4, x + h * 0.4);
      path(0);
      c.lineWidth = size * 0.1;
      c.strokeStyle = "rgba(255,255,255,0.32)";
      path(-size * 0.06);
    };
    const count = Math.floor((W - size * 2) / step) + 1,
      start = (W - (count - 1) * step) / 2;
    for (let i = 0; i < count; i++) {
      const x = start + i * step;
      cross(x, top + (i % 2 ? 0 : size * 0.45));
      cross(x, top + size * 1.6, 0.8);
      cross(x, top + size * 2.7, 0.62);
    }
    c.globalAlpha = 1;
  };

  // Header: the icon, the tracked serif wordmark in metal, activity and date.
  const pad = 88;
  if (mark) c.drawImage(mark, pad, 84, 92, 92);
  c.textAlign = "left";
  c.direction = "ltr";
  c.fillStyle = metal(110, 150, figure);
  font(600, 46, display);
  c.fillText("V A E L O R A", pad + (mark ? 118 : 0), 146);
  c.textAlign = "right";
  c.direction = ar ? "rtl" : "ltr";
  font(700, 32);
  c.fillStyle = light ? goldInk : metal(94, 122, goldText);
  c.fillText(model.activity, W - pad, 120);
  font(500, 26);
  c.fillStyle = muted;
  c.fillText(model.date, W - pad, 160);
  c.direction = "ltr";

  // The route is a copper metal thread: outline, edge shade, body, core, glint.
  const drawRoute = (left: number, top: number, size: number) => {
    c.lineJoin = "round";
    c.lineCap = "round";
    for (const [color, width, alpha] of [
      [light ? "#ffffff" : "#0b0b0d", 28, 1],
      [copper.edge, 17, 1],
      [copper.body, 12, 1],
      [copper.core, 5, 1],
      [copper.glint, 2, 0.8],
    ] as const) {
      c.strokeStyle = color;
      c.globalAlpha = alpha;
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
    c.globalAlpha = 1;
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
    c.fillStyle = metal(y - size * 0.74, y, figure);
    // Canvas cannot request lining figures, so metrics stay in the lining sans.
    font(700, size, latin);
    c.fillText(missing(value), x, y);
    c.direction = ar ? "rtl" : "ltr";
    c.fillStyle = muted;
    font(600, 28);
    c.fillText(label, x, y + 46);
    c.direction = "ltr";
  };
  // A fine reflective rule, brightest toward the light.
  const rule = (y: number) => {
    const g = c.createLinearGradient(pad, 0, W - pad, 0);
    g.addColorStop(0, light ? "rgba(94,98,104,0.2)" : "rgba(201,205,210,0.08)");
    g.addColorStop(0.32, light ? "rgba(94,98,104,0.6)" : "rgba(201,205,210,0.45)");
    g.addColorStop(1, light ? "rgba(94,98,104,0.15)" : "rgba(201,205,210,0.08)");
    c.fillStyle = g;
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
    metric(model.distance, labels.km, pad, 1110, 150, "left");
    metric(model.duration, labels.time, W - pad, 1060, 62, "right");
    if (model.pace !== "—") metric(model.pace, labels.pace, W - pad, 1180, 62, "right");
  } else if (model.template === "performance") {
    metric(model.distance, labels.km, pad, 470, 250, "left");
    rule(600);
    metric(model.duration, labels.time, pad, 740, 92, "left");
    metric(model.pace, labels.pace, W - pad, 740, 92, "right");
    if (model.routeUseful) drawRoute(340, 850, 400);
    else drawHidden(860, 300);
  } else {
    // Minimal: the distance on a copper plate, the card's one action colour.
    c.fillStyle = metal(440, 860, ["#f2ad84", "#dc7b48", "#b9572a", "#a44a22", "#8f3c19", "#73300f", "#5a200c"], 0, 470);
    c.fillRect(0, 440, W, 420);
    c.fillStyle = "rgba(255,214,186,0.7)";
    c.fillRect(0, 440, W, 2);
    c.textAlign = "center";
    c.direction = "ltr";
    c.fillStyle = "rgba(58,18,6,0.45)";
    font(700, 300, latin);
    c.fillText(missing(model.distance), W / 2, 724);
    c.fillStyle = "#fff6ee";
    c.fillText(missing(model.distance), W / 2, 720);
    c.direction = ar ? "rtl" : "ltr";
    c.fillStyle = "#ffc7a2";
    font(600, 36);
    c.fillText(labels.km, W / 2, 800);
    c.direction = "ltr";
    metric(model.duration, labels.time, W / 2, 1010, 78, "center");
  }

  // Conditions: temperature in gold; the score in green metal when comfortable.
  if (model.template !== "minimal" && (model.temperature != null || model.score != null)) {
    c.textAlign = "left";
    c.direction = "ltr";
    font(600, 30, latin);
    let x = pad;
    if (model.temperature != null) {
      const t = `${model.temperature}°C`;
      c.fillStyle = light ? goldInk : metal(1232, 1258, goldText);
      c.fillText(t, x, 1256);
      x += c.measureText(`${t}   `).width;
    }
    if (model.score != null) {
      const stops = model.score >= 80 ? oliveText : model.score >= 60 ? goldText : steelText;
      c.fillStyle = light ? (model.score >= 80 ? "#46531a" : model.score >= 60 ? goldInk : chromeMuted) : metal(1232, 1258, stops);
      c.fillText(`VAELORA ${model.score}/100`, x, 1256);
    }
  }
  stitchBand(1306, 16);
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

import { STORY, storyLayout, type StoryModel, type StoryPosition } from "../domain/tracking/share-story.ts";

type Img = CanvasImageSource & { width: number; height: number };
export interface StoryAssets {
  /** The user's own photo, decoded locally; null draws the dark VAELORA ground. */
  photo: Img | null;
  /** The approved V, keyed to white/platinum (public/brand/v-mark.png). */
  mark: Img | null;
  /** Activity figure, clock, lightning and mountain glyphs from the app's icon set. */
  icons: { activity: Img | null; duration: Img | null; pace: Img | null; elevation: Img | null };
}

function family() {
  const css = getComputedStyle(document.documentElement);
  return css.getPropertyValue("--font-archivo").trim() || "Arial";
}

/** Cover-fit: fills 9:16 without stretching; the crop stays centred. */
function drawPhoto(c: CanvasRenderingContext2D, photo: Img) {
  const scale = Math.max(STORY.width / photo.width, STORY.height / photo.height);
  const w = photo.width * scale,
    h = photo.height * scale;
  c.drawImage(photo, (STORY.width - w) / 2, (STORY.height - h) / 2, w, h);
}
function drawGround(c: CanvasRenderingContext2D) {
  const g = c.createLinearGradient(0, 0, 0, STORY.height);
  g.addColorStop(0, "#14161b");
  g.addColorStop(1, "#08090b");
  c.fillStyle = g;
  c.fillRect(0, 0, STORY.width, STORY.height);
  const v = c.createRadialGradient(STORY.width * 0.7, STORY.height * 0.25, 60, STORY.width * 0.5, STORY.height * 0.5, STORY.height * 0.8);
  v.addColorStop(0, "rgba(255,255,255,0.05)");
  v.addColorStop(1, "rgba(0,0,0,0.35)");
  c.fillStyle = v;
  c.fillRect(0, 0, STORY.width, STORY.height);
}
/** Average brightness (0–1) of the canvas under a box, sampled coarsely. */
function brightness(c: CanvasRenderingContext2D, box: { x: number; y: number; width: number; height: number }) {
  try {
    const t = c.getTransform();
    const sx = Math.max(0, Math.round(box.x * t.a)),
      sy = Math.max(0, Math.round(box.y * t.d)),
      sw = Math.max(1, Math.round(box.width * t.a)),
      sh = Math.max(1, Math.round(box.height * t.d));
    const data = c.getImageData(sx, sy, sw, sh).data;
    let sum = 0,
      n = 0;
    for (let i = 0; i < data.length; i += 4 * 37) {
      sum += (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255;
      n++;
    }
    return n ? sum / n : 0.3;
  } catch {
    return 0.5;
  }
}

/**
 * Draws the whole story in 1080 × 1920 units onto `c`. A preview canvas
 * pre-scales the context, so the preview and the export are one drawing.
 */
export function drawStory(c: CanvasRenderingContext2D, model: StoryModel, assets: StoryAssets, position: StoryPosition, scale = 1) {
  const L = storyLayout(model, position, scale);
  const latin = family();
  const p = model.palette;
  if (assets.photo) drawPhoto(c, assets.photo);
  else drawGround(c);

  // Readability: a soft, local scrim behind the overlay only, stronger on bright photos.
  const light = assets.photo ? brightness(c, L.box) : 0;
  const strength = assets.photo ? 0.08 + 0.2 * Math.min(1, Math.max(0, (light - 0.3) / 0.45)) : 0;
  if (strength > 0) {
    const cx = L.box.x + L.box.width / 2,
      cy = L.box.y + L.box.height / 2;
    const r = Math.max(L.box.width, L.box.height) * 0.62;
    c.save();
    c.translate(cx, cy);
    c.scale(L.box.width / Math.max(L.box.width, L.box.height), L.box.height / Math.max(L.box.width, L.box.height));
    const g = c.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
    g.addColorStop(0, `rgba(6,7,9,${strength})`);
    g.addColorStop(0.6, `rgba(6,7,9,${strength * 0.45})`);
    g.addColorStop(1, "rgba(6,7,9,0)");
    c.fillStyle = g;
    c.fillRect(-r, -r, r * 2, r * 2);
    c.restore();
  }

  // Route: halo, glow, metallic body, bright core. Never a map.
  let startAnchor: { x: number; y: number; dx: number; dy: number } | null = null;
  if (model.route && L.route) {
    const { paths } = model.route;
    const flat = paths.flat();
    const wN = Math.max(...flat.map((q) => q[0])),
      hN = Math.max(...flat.map((q) => q[1]));
    const k = Math.min(L.route.w / Math.max(wN, 1e-6), L.route.h / Math.max(hN, 1e-6));
    const ox = L.route.x + (L.route.w - wN * k) / 2,
      oy = L.route.y + (L.route.h - hN * k) / 2;
    const trace = () => {
      c.beginPath();
      for (const path of paths)
        path.forEach(([x, y], i) => (i ? c.lineTo(ox + x * k, oy + y * k) : c.moveTo(ox + x * k, oy + y * k)));
    };
    c.save();
    c.lineJoin = "round";
    c.lineCap = "round";
    const s = L.scale;
    if (light > 0.55) {
      c.strokeStyle = "rgba(10,12,16,0.28)";
      c.lineWidth = 12 * s;
      c.shadowColor = "rgba(10,12,16,0.35)";
      c.shadowBlur = 10 * s;
      trace();
      c.stroke();
    }
    for (const [color, width, blur] of [
      [p.halo, 26 * s, 28 * s],
      [p.glow, 14 * s, 16 * s],
      [p.deep, 9 * s, 0],
      [p.body, 6.5 * s, 4 * s],
      [p.core, 2.4 * s, 6 * s],
    ] as const) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.shadowColor = color;
      c.shadowBlur = blur;
      trace();
      c.stroke();
    }
    c.restore();
    // Start: a filled dot; end: a ring.
    const first = paths[0][0],
      last = paths.at(-1)!.at(-1)!;
    const cx = flat.reduce((a, q) => a + q[0], 0) / flat.length,
      cy = flat.reduce((a, q) => a + q[1], 0) / flat.length;
    let dx = first[0] - cx,
      dy = first[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    [dx, dy] = len < 1e-6 ? [-0.7, -0.7] : [dx / len, dy / len];
    startAnchor = { x: ox + first[0] * k, y: oy + first[1] * k, dx, dy };
    c.save();
    c.shadowColor = "rgba(0,0,0,0.45)";
    c.shadowBlur = 8 * s;
    c.fillStyle = p.core;
    c.beginPath();
    c.arc(ox + first[0] * k, oy + first[1] * k, 7 * s, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = p.core;
    c.lineWidth = 3.5 * s;
    c.beginPath();
    c.arc(ox + last[0] * k, oy + last[1] * k, 8 * s, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // Shadowed drawing for text and glyphs over any photo.
  // Two shadows: a tight edge for crispness and a soft lift for busy photos.
  const shadowed = (draw: () => void) => {
    c.save();
    c.shadowColor = "rgba(0,0,0,0.45)";
    c.shadowBlur = 18 * L.scale;
    c.shadowOffsetY = 2 * L.scale;
    draw();
    c.shadowColor = "rgba(0,0,0,0.35)";
    c.shadowBlur = 3 * L.scale;
    c.shadowOffsetY = 1 * L.scale;
    draw();
    c.restore();
  };
  const icon = L.icon.size;
  const edge = 36;
  let iconX = L.align === "right" ? L.box.x + L.box.width - icon : L.box.x,
    iconY = L.distance.baseline - L.distance.size * 0.8 - icon - 12 * L.scale;
  if (startAnchor) {
    const gap = 14 * L.scale;
    const side = startAnchor.dx < 0 ? -1 : 1;
    iconX = side < 0 ? startAnchor.x - gap - icon : startAnchor.x + gap;
    if (iconX < edge || iconX + icon > STORY.width - edge) iconX = side < 0 ? startAnchor.x + gap : startAnchor.x - gap - icon;
    iconX = Math.min(STORY.width - edge - icon, Math.max(edge, iconX));
    const textTop = L.distance.baseline - L.distance.size * 0.8 - 8 * L.scale;
    iconY = Math.max(edge, Math.min(startAnchor.y - icon / 2, textTop - icon));
  }
  if (assets.icons.activity) shadowed(() => c.drawImage(assets.icons.activity!, iconX, iconY, icon, icon));

  // Distance, the hero figure. Latin digits and LTR in every language.
  c.direction = "ltr";
  c.textBaseline = "alphabetic";
  c.fontStretch = "condensed";
  c.font = `800 ${L.distance.size}px ${latin}`;
  const value = model.distance;
  const valueW = c.measureText(value).width;
  c.font = `700 ${L.distance.unit}px ${latin}`;
  const unitW = c.measureText(" km").width;
  const total = valueW + unitW;
  const startX = L.align === "left" ? L.box.x : L.align === "right" ? L.box.x + L.box.width - total : L.box.x + (L.box.width - total) / 2;
  shadowed(() => {
    c.fillStyle = "#ffffff";
    c.textAlign = "left";
    c.font = `800 ${L.distance.size}px ${latin}`;
    c.fillText(value, startX, L.distance.baseline);
    c.fillStyle = "#e7eaee";
    c.font = `700 ${L.distance.unit}px ${latin}`;
    c.fillText(" km", startX + valueW, L.distance.baseline);
  });
  c.fontStretch = "normal";

  // Compact metrics: glyph + value only, no labels.
  const items = [
    [assets.icons.duration, model.duration],
    [assets.icons.pace, model.pace],
    [assets.icons.elevation, model.elevationM === null ? null : `${model.elevationM} m`],
  ].filter((i): i is [Img | null, string] => i[1] !== null);
  const size = L.metrics.size,
    glyph = size * 0.95,
    gap = 10 * L.scale,
    spacing = 34 * L.scale;
  c.font = `650 ${size}px ${latin}`;
  const widths = items.map(([, text]) => glyph + gap + c.measureText(text).width);
  const rowW = widths.reduce((a, b) => a + b, 0) + spacing * (items.length - 1);
  const rowX = L.align === "left" ? L.box.x : L.align === "right" ? L.box.x + L.box.width - rowW : L.box.x + (L.box.width - rowW) / 2;
  shadowed(() => {
    let x = rowX;
    items.forEach(([img, text], i) => {
      if (img) c.drawImage(img, x, L.metrics.baseline - glyph * 0.84, glyph, glyph);
      c.fillStyle = "#f2f4f6";
      c.fillText(text, x + glyph + gap, L.metrics.baseline);
      x += widths[i] + spacing;
    });
  });

  // The V alone is the signature: no wordmark.
  if (assets.mark) {
    const h = L.mark.height,
      w = (assets.mark.width / assets.mark.height) * h;
    const mx = L.align === "left" ? L.box.x : L.align === "right" ? L.box.x + L.box.width - w : L.box.x + (L.box.width - w) / 2;
    shadowed(() => c.drawImage(assets.mark!, mx, L.mark.top, w, h));
  }
}

/** Renders the full-resolution story to a PNG blob, entirely in the browser. */
export async function exportStory(model: StoryModel, assets: StoryAssets, position: StoryPosition, scale: number) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = STORY.width;
  canvas.height = STORY.height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas unavailable");
  drawStory(c, model, assets, position, scale);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image unavailable"))), "image/png"),
  );
}

/** Loads an image from a URL (object URL for photos, same-origin assets otherwise). */
export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

/** An SVG icon element as an image, recoloured from currentColor. */
export function svgImage(svg: SVGSVGElement | null, color: string) {
  if (!svg) return Promise.resolve(null);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "96");
  clone.setAttribute("height", "96");
  const markup = new XMLSerializer().serializeToString(clone).replaceAll("currentColor", color);
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`).catch(() => null);
}

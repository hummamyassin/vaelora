import type { shareModel } from "../domain/tracking/share.ts";
export async function createShareImage(
  model: ReturnType<typeof shareModel>,
): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas unavailable");
  const ar = model.locale === "ar";
  c.fillStyle = "#25161d";
  c.fillRect(0, 0, 1080, 1440);
  c.strokeStyle = "#a34757";
  c.lineWidth = 3;
  // Original small diamond/check motif, generated locally, no external artwork.
  for (let x = 20; x < 1080; x += 40) {
    c.beginPath();
    c.moveTo(x, 28);
    c.lineTo(x + 12, 40);
    c.lineTo(x, 52);
    c.lineTo(x - 12, 40);
    c.closePath();
    c.stroke();
  }
  c.textAlign = "center";
  c.fillStyle = "#fbf4e9";
  c.font = "700 38px Arial";
  c.fillText("VAELORA", 540, 128);
  c.direction = ar ? "rtl" : "ltr";
  c.font = "28px Arial";
  c.fillText(model.activity, 540, 183);
  const routeY = model.template === "performance" ? 610 : 230,
    routeSize = model.template === "minimal" ? 650 : 740;
  c.strokeStyle = "#efabac";
  c.lineWidth = 10;
  c.lineJoin = "round";
  c.lineCap = "round";
  for (const path of model.route) {
    c.beginPath();
    path.forEach(([x, y], i) => {
      if (i === 0) c.moveTo(170 + x * routeSize, routeY + y * routeSize);
      else c.lineTo(170 + x * routeSize, routeY + y * routeSize);
    });
    c.stroke();
  }
  if (!model.route.length) {
    c.fillStyle = "#cfc0c3";
    c.font = "26px Arial";
    c.fillText(
      ar ? "المسار مخفي لحماية الخصوصية" : "Route hidden for privacy",
      540,
      routeY + routeSize / 2,
    );
  }
  const metricY = model.template === "performance" ? 340 : 1080;
  c.fillStyle = "#fbf4e9";
  c.font = "bold 100px Arial";
  c.fillText(`${model.distance} ${ar ? "كم" : "km"}`, 540, metricY);
  if (model.template !== "minimal") {
    c.font = "38px Arial";
    c.fillText(
      `${model.duration}   ·   ${model.pace} ${ar ? "/كم" : "/km"}`,
      540,
      metricY + 88,
    );
    c.font = "24px Arial";
    c.fillText(
      ar ? "الوقت النشط · متوسط الوتيرة" : "ACTIVE TIME · AVERAGE PACE",
      540,
      metricY + 132,
    );
  }
  c.fillStyle = "#cfc0c3";
  c.font = "24px Arial";
  c.fillText(
    ar
      ? "مناطق البداية والنهاية مخفية · رسم توضيحي للمسار"
      : "Start & end zones hidden · route sketch",
    540,
    1380,
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

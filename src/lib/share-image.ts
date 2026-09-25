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
  const dark = model.template !== "performance";
  c.fillStyle = dark ? "#25161d" : "#f5eee6";
  c.fillRect(0, 0, 1080, 1440);
  c.strokeStyle = model.template === "performance" ? "#8c2945" : "#a34757";
  c.lineWidth = 3;
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
  c.direction = "ltr";
  c.fillStyle = dark ? "#fbf4e9" : "#4c2131";
  c.font = "700 38px Arial";
  c.fillText("VAELORA", 540, 128);
  c.font = "28px Arial";
  c.fillText(model.activity, 540, 183);
  const drawRoute = (left: number, top: number, size: number) => {
    c.strokeStyle = "#efabac";
    c.lineWidth = 11;
    c.lineJoin = "round";
    c.lineCap = "round";
    for (const path of model.route) {
      c.beginPath();
      path.forEach(([x, y], i) => {
        if (i === 0) c.moveTo(left + x * size, top + y * size);
        else c.lineTo(left + x * size, top + y * size);
      });
      c.stroke();
    }
  };
  const drawMotif = (top: number) => {
    c.strokeStyle = model.template === "performance" ? "#8c2945" : "#efabac";
    c.globalAlpha = 0.42;
    c.lineWidth = 7;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(150, top + i * 52);
      c.bezierCurveTo(350, top - 110 + i * 48, 670, top + 180 + i * 44, 930, top - 30 + i * 48);
      c.stroke();
    }
    c.globalAlpha = 1;
  };
  if (model.template === "map") {
    if (model.routeUseful) drawRoute(140, 230, 800);
    else drawMotif(420);
    c.fillStyle = "#fbf4e9";
    c.font = "bold 104px Arial";
    c.fillText(model.distance, 500, 1110);
    c.font = "bold 48px Arial";
    c.fillText(ar ? "كم" : "km", 720, 1110);
  } else if (model.template === "performance") {
    c.fillStyle = "#4c2131";
    c.font = "bold 150px Arial";
    c.fillText(model.distance, 540, 420);
    c.font = "34px Arial";
    c.fillText(ar ? "كيلومتر" : "KILOMETRES", 540, 475);
    c.fillStyle = "#fffaf3";
    c.strokeStyle = "#dbcac8";
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(100, 560, 880, 360, 36);
    c.fill();
    c.stroke();
    c.fillStyle = "#4c2131";
    c.font = "bold 62px Arial";
    c.fillText(model.duration, 320, 720);
    c.fillText(model.pace, 760, 720);
    c.font = "22px Arial";
    c.fillText(ar ? "الوقت النشط" : "ACTIVE TIME", 320, 770);
    c.fillText(ar ? "متوسط الوتيرة /كم" : "AVERAGE PACE /KM", 760, 770);
    if (model.routeUseful) drawRoute(350, 950, 380);
    else drawMotif(920);
  } else {
    c.fillStyle = "#8c2945";
    c.beginPath();
    c.moveTo(0, 330);
    c.lineTo(1080, 170);
    c.lineTo(1080, 760);
    c.lineTo(0, 920);
    c.closePath();
    c.fill();
    c.fillStyle = "#fbf4e9";
    c.font = "bold 190px Arial";
    c.fillText(model.distance, 540, 650);
    c.font = "35px Arial";
    c.fillText(ar ? "كيلومتر" : "KILOMETRES", 540, 710);
    c.font = "bold 48px Arial";
    c.fillText(model.duration, 540, 1050);
    c.font = "22px Arial";
    c.fillText(ar ? "الوقت النشط" : "ACTIVE TIME", 540, 1095);
  }
  if (model.template === "map" && !model.routeUseful) {
    c.fillStyle = "#cfc0c3";
    c.font = "25px Arial";
    c.fillText(ar ? "تُعرض المقاييس · المسار مخفي لحماية الخصوصية" : "Metrics shown · route hidden for privacy", 540, 880);
  }
  if (model.template === "map" || model.template === "performance") {
    c.fillStyle = dark ? "#fbf4e9" : "#4c2131";
    c.font = "36px Arial";
    c.direction = "ltr";
    const supporting = model.template === "map"
      ? [model.duration, model.pace !== "—" ? `${model.pace} /km` : "", model.temperature != null ? `${model.temperature}°C` : "", model.score != null ? `VAELORA ${model.score}/100` : ""]
      : [model.temperature != null ? `${model.temperature}°C` : "", model.score != null ? `VAELORA ${model.score}/100` : ""];
    const conditions = supporting.filter(Boolean).join("   ·   ");
    if (conditions) c.fillText(conditions, 540, model.template === "map" ? 1190 : 1310);
  }
  c.direction = ar ? "rtl" : "ltr";
  c.fillStyle = dark ? "#cfc0c3" : "#705d65";
  c.font = "24px Arial";
  c.fillText(
    ar
      ? "خصوصيتك أولًا · مناطق البداية والنهاية مخفية"
      : "PRIVACY FIRST · START & END ZONES HIDDEN",
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

// Synthetic browser QA for Jordan-wide discovery, route details, Follow Route
// and the Share Studio. Synthetic forecasts, GPS and photos only.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import sharp from "sharp";
import { createDiscovery } from "../src/server/recommendations/discovery.ts";
import { distanceKm } from "../src/lib/geography.ts";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.VAELORA_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.VAELORA_QA_URL || "http://localhost:3001",
  out = process.env.VAELORA_QA_OUT || ".playwright-cli/v26-jordan";
mkdirSync(`${out}/share`, { recursive: true });

const clock = new Date("2026-11-01T16:00:00+03:00");
const hourly = ["2026-11-01", "2026-11-02"].flatMap((day) =>
  Array.from({ length: 24 }, (_, h) => ({
    time: `${day}T${String(h).padStart(2, "0")}:00`,
    temperatureC: 18 + Math.round(5 * Math.sin((h - 9) / 4)),
    apparentTemperatureC: 18,
    relativeHumidityPercent: 45,
    windKmh: h >= 13 && h <= 15 ? 26 : 6,
    precipitationProbabilityPercent: 0,
    uvIndex: 1,
  })),
);
const run = createDiscovery({
  clock: () => clock,
  provider: {
    getForecast: async (point) => ({
      ok: true,
      hourly,
      issues: [],
      metadata: { provider: "open-meteo", attribution: "Synthetic", requested: point, returned: { ...point, elevation: 800 }, timezone: "Asia/Amman", utcOffsetSeconds: 10800, retrievedAt: clock.toISOString(), requestUrl: "https://example.test", units: {}, cache: "miss" },
    }),
  },
});

// Synthetic photos: bright daylight, dark night, and a wide landscape.
const photos = {
  light: `${out}/photo-light.jpg`,
  dark: `${out}/photo-dark.jpg`,
  wide: `${out}/photo-wide.jpg`,
};
const svgPhoto = (w, h, top, bottom, sun) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.7}" cy="${h * 0.22}" r="${w * 0.12}" fill="${sun}"/><path d="M0 ${h * 0.78} Q ${w * 0.3} ${h * 0.6} ${w * 0.55} ${h * 0.74} T ${w} ${h * 0.7} V ${h} H 0 Z" fill="#3d4a2c" opacity="0.85"/></svg>`);
await sharp(svgPhoto(1200, 1600, "#bfe3ff", "#f4efe2", "#fffbe8")).jpeg({ quality: 88 }).toFile(photos.light);
await sharp(svgPhoto(1200, 1600, "#05070d", "#1b2030", "#e8e2c8")).jpeg({ quality: 88 }).toFile(photos.dark);
await sharp(svgPhoto(4000, 2250, "#7fb6e8", "#e9dcc2", "#fff3c4")).jpeg({ quality: 85 }).toFile(photos.wide);

// Synthetic finished activities that pass the app's own validation.
function activity(id, kind, shape, totalKm, activeMs, { altitude = false, step = 10000 } = {}) {
  const n = Math.max(2, Math.round(activeMs / step));
  const points = [];
  for (let i = 0; i < n; i++) {
    const [lat, lon] = shape(i / (n - 1));
    points.push({ latitude: lat, longitude: lon, accuracy: 6, timestamp: 1000 + i * step, speed: null, segment: 0, ...(altitude ? { altitude: 780 + 60 * Math.sin((i / n) * Math.PI * 2) + i * 0.15 } : {}) });
  }
  let d = 0;
  for (let i = 1; i < n; i++) d += distanceKm(points[i - 1], points[i]) * 1000;
  // Scale the shape so the recorded distance matches the target.
  const k = (totalKm * 1000) / d,
    [lat0, lon0] = shape(0);
  for (const p of points) {
    p.latitude = lat0 + (p.latitude - lat0) * k;
    p.longitude = lon0 + (p.longitude - lon0) * k;
  }
  d = 0;
  for (let i = 1; i < n; i++) d += distanceKm(points[i - 1], points[i]) * 1000;
  const startedAt = Date.parse("2026-11-01T06:00:00+03:00");
  for (const p of points) p.timestamp += startedAt;
  const end = points.at(-1).timestamp + 1000;
  return { version: 1, id, activity: kind, state: "finished", startedAt, endedAt: end, updatedAt: end, activeMs: Math.min(activeMs, end - startedAt), distanceM: d, points, segment: 0, conditions: null };
}
const loop = (t) => [29.55 + 0.012 * Math.sin(t * Math.PI * 2) + 0.003 * Math.sin(t * 13), 35.0 + 0.016 * (1 - Math.cos(t * Math.PI * 2)) + 0.002 * Math.cos(t * 9)];
const line = (t) => [32.33 + 0.05 * t + 0.002 * Math.sin(t * 20), 35.75 + 0.01 * t];
const wide = (t) => [31.95 + 0.0015 * Math.sin(t * 6), 35.9 + 0.08 * t];
const activities = [
  activity("qa-run-601", "running", loop, 6.01, 2029000, { altitude: true }),
  activity("qa-walk-090", "walking", line, 0.9, 720000),
  activity("qa-run-1242", "running", line, 12.42, 4210000, { step: 12000 }),
  activity("qa-walk-slow", "walking", wide, 7.2, 6300000, { step: 12000 }),
];
for (const a of activities) assert.ok(a.points.length > 1, a.id);

const browser = await chromium.launch({ headless: true, channel: process.env.VAELORA_BROWSER_CHANNEL || "msedge" });
const checks = [];
const gps = { amman: [31.981234, 35.901234], aqaba: [29.5322, 35.0061], irbid: [32.5556, 35.85], damascus: [33.51, 36.29] };
try {
  for (const [locale, width, theme] of [
    ["en", 390, "light"],
    ["ar", 390, "dark"],
    ["en", 320, "dark"],
    ["ar", 430, "light"],
    ["en", 1440, "dark"],
    ["ar", 1440, "light"],
  ]) {
    if (process.env.VAELORA_QA_ONLY && !process.env.VAELORA_QA_ONLY.split(",").includes(`${locale}-${width}`)) continue;
    const ctx = await browser.newContext({
      viewport: { width, height: width <= 430 ? 844 : 900 },
      colorScheme: theme,
      reducedMotion: "reduce",
      acceptDownloads: true,
      serviceWorkers: "block",
    });
    const p = await ctx.newPage(),
      errors = [],
      posts = [];
    await p.clock.install({ time: clock });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (r.method() === "POST") posts.push({ url: r.url(), body: r.postData() ?? "" });
    });
    await p.addInitScript(([g]) => {
      window.__gps = { at: g.amman, ok: null };
      window.__gpsTable = g;
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition(ok) {
            ok({ coords: { latitude: window.__gps.at[0], longitude: window.__gps.at[1], accuracy: 5 } });
          },
          watchPosition(ok) {
            window.__gps.ok = ok;
            return 1;
          },
          clearWatch() {
            window.__gps.ok = null;
          },
        },
      });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
    }, [gps]);
    await p.route("**/api/discovery", async (route) => route.fulfill({ json: await run(route.request().postDataJSON()) }));
    const snap = async (name, full = false) => {
      await p.screenshot({ path: `${out}/${locale}-${width}-${name}.png`, fullPage: full });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} overflow`);
    };
    // Profile set as an onboarded guest in the chosen language and theme.
    await p.goto(base);
    await p.evaluate(([l, t]) => {
      localStorage.setItem("vaelora:guest-profile", JSON.stringify({ version: 1, name: "QA", activity: "walking", minutes: 60, locale: l, theme: t, onboarding: true }));
    }, [locale, theme]);
    await p.goto(`${base}/#/home`);
    await p.locator(".plan").waitFor();
    await p.waitForFunction((d) => document.documentElement.dir === d, locale === "ar" ? "rtl" : "ltr");

    // Home: plan for Irbid from the area list; Featured follows Irbid.
    await p.locator(".reference-picker summary").click();
    await p.locator(".reference-picker .chip", { hasText: locale === "ar" ? "إربد" : "Irbid" }).first().click();
    await p.locator(".plan-score").waitFor();
    const featured = await p.locator(".featured-card").allInnerTexts();
    assert.ok(featured.length > 0, "featured near Irbid");
    for (const amman of ["Sports City", "Rainbow", "Abdali", "المدينة الرياضية", "الرينبو", "العبدلي"])
      assert.ok(!featured.join(" ").includes(amman), `Amman place featured for Irbid: ${amman}`);
    await snap("home-irbid", true);

    // Place details for a trail, with route facts, weather fit and figures.
    await p.goto(`${base}/#/home?place=dana-shaq-al-reesh-trail`);
    await p.locator(".place-sheet .route-facts").waitFor();
    await p.locator(".place-sheet .place-now-row").waitFor();
    await p.locator(".place-sheet .elevation-profile").waitFor();
    assert.match(await p.locator(".place-sheet .route-facts").innerText(), /km|كم/);
    await p.locator(".place-actions button[aria-pressed]").click();
    assert.equal(await p.locator(".place-actions button[aria-pressed]").getAttribute("aria-pressed"), "true");
    await snap("place-trail");
    await p.locator(".place-sheet .icon-btn").click();

    // Explore near Aqaba: Near Me Now and filters.
    await p.evaluate(() => (window.__gps.at = window.__gpsTable.aqaba));
    await p.goto(`${base}/#/explore`);
    await p.locator(".explore-list").waitFor();
    const count = await p.locator(".explore-list > li").count();
    assert.ok(count >= 30, `library ${count}`);
    await p.locator(".explore-near .btn").first().click();
    await p.locator(".near-now-list").waitFor();
    const near = await p.locator(".near-now-list").innerText();
    assert.match(near, locale === "ar" ? /العقبة|الدرب|طيور/ : /Aqaba|Darb|Bird/);
    await snap("explore-aqaba", true);
    await p.locator(".explore-filters .chips").nth(1).locator(".chip").nth(2).click(); // Trails
    const trails = await p.locator(".explore-list .place-kind").evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")));
    assert.ok(trails.length && trails.every((k) => k === "trail"));
    await p.locator(".explore-filters .chips").nth(1).locator(".chip").nth(0).click();
    await p.locator(".explore-filters .chip", { hasText: locale === "ar" ? "المحفوظة" : "Saved" }).click();
    assert.equal(await p.locator(".explore-list > li").count(), 1, "saved filter");
    await p.locator(".explore-filters .chip", { hasText: locale === "ar" ? "المحفوظة" : "Saved" }).click();
    // Outside Jordan nothing is substituted.
    await p.evaluate(() => (window.__gps.at = window.__gpsTable.damascus));
    await p.locator(".explore-near .btn").first().click();
    await p.locator(".explore-near .notice").waitFor();
    assert.match(await p.locator(".explore-near .notice").innerText(), locale === "ar" ? /داخل الأردن/ : /inside Jordan/);
    await snap("explore-outside");

    // Ask opens with the current plan context.
    await p.goto(`${base}/#/home?sheet=ask`);
    await p.locator(".sheet").waitFor();
    await snap("ask");

    // Follow Route: planned line, live status and a recap linked to the route.
    await p.goto(`${base}/#/track?follow=dana-shaq-al-reesh-trail`);
    await p.locator(".track-follow-ready").waitFor();
    await p.locator(".track-start").click();
    const geometry = JSON.parse(readFileSync("public/routes/dana-shaq-al-reesh-trail.json", "utf8")).geometry;
    for (let i = 0; i < 14; i++) {
      await p.clock.runFor(4000);
      const t = await p.evaluate(() => Date.now());
      await p.evaluate(([lon, lat, at]) => window.__gps.ok?.({ timestamp: at, coords: { latitude: lat, longitude: lon, accuracy: 5, speed: null, altitude: 1200 } }), [geometry[0][0] + i * 0.00004, geometry[0][1] + i * 0.00002, t]);
    }
    await p.locator(".track-follow-status").waitFor();
    assert.match(await p.locator(".track-follow-status").innerText(), locale === "ar" ? /المسار/ : /route/);
    assert.ok(Number(await p.locator(".track-map").getAttribute("data-planned")) > 10, "planned line drawn");
    await snap("follow-live");
    await p.locator(".track-finish").click();
    await p.locator(".recap-route").waitFor();
    await snap("follow-recap");

    // Share Studio on seeded activities: every edge case, real exports.
    if (width <= 430) {
      await p.evaluate(async (list) => {
        await new Promise((resolve, reject) => {
          const r = indexedDB.open("vaelora-activities", 1);
          r.onsuccess = () => {
            const tx = r.result.transaction("activities", "readwrite");
            for (const a of list) tx.objectStore("activities").put(a);
            tx.oncomplete = () => resolve(null);
            tx.onerror = () => reject(tx.error);
          };
          r.onerror = () => reject(r.error);
        });
      }, activities);
      const cases = [
        ["qa-run-601", photos.light, "upper-left", "run-light"],
        ["qa-run-601", photos.dark, "lower-right", "run-dark"],
        ["qa-walk-090", photos.wide, "upper-center", "walk-short"],
        ["qa-run-1242", null, "upper-right", "run-long-nophoto"],
        ["qa-walk-slow", photos.light, "lower-left", "walk-slow"],
      ];
      for (const [id, photo, position, name] of cases) {
        if (!(locale === "en" && width === 390) && name !== "run-light") continue;
        await p.goto(`${base}/#/track?activity=${id}`);
        await p.reload();
        await p.locator(".share-studio .studio-preview").waitFor();
        if (photo) await p.locator(".studio-photo input[type=file]").setInputFiles(photo);
        await p.locator(`.studio-positions [data-pos="${position}"]`).click();
        await p.waitForTimeout(400);
        const alt = await p.locator(".studio-preview").getAttribute("aria-label");
        // Climb only when measured; never a RUN or WALK label.
        if (id === "qa-run-601") assert.match(alt, /climb|صعود/);
        else assert.doesNotMatch(alt, /climb|صعود/);
        const [download] = await Promise.all([p.waitForEvent("download"), p.locator(".share-studio .share-actions .btn-secondary").click()]);
        const file = `${out}/share/${locale}-${width}-${name}.png`;
        await download.saveAs(file);
        const meta = await sharp(file).metadata();
        assert.equal(meta.width, 1080);
        assert.equal(meta.height, 1920);
        if (name === "run-light") await p.locator(".share-studio").screenshot({ path: `${out}/${locale}-${width}-studio.png` });
      }
      // The photo never left the device: no request carried image data.
      assert.ok(posts.every((r) => !/image\/|data:image|base64/.test(r.body)), "photo stayed local");
    }

    assert.deepEqual(errors, [], `${locale}-${width} page errors`);
    checks.push(`${locale} ${width} ${theme}: Irbid plan + location-aware Featured, trail details + save, Explore Aqaba Near Me + filters + saved, outside-Jordan message, Ask, Follow Route live + recap${width <= 430 ? ", Share Studio exports 1080x1920" : ""}`);
    await ctx.close();
  }
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}

// Synthetic browser QA only. No production fixtures, model calls, or real GPS history.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createDiscovery } from "../src/server/recommendations/discovery.ts";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.VAELORA_PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.VAELORA_QA_URL || "http://localhost:3001",
  out = ".playwright-cli/v23";
mkdirSync(out, { recursive: true });
const clock = new Date("2026-09-23T08:00:00+03:00");
const hourly = Array.from({ length: 24 }, (_, h) => ({
  time: `2026-09-23T${String(h).padStart(2, "0")}:00`,
  temperatureC: 20,
  apparentTemperatureC: 20,
  relativeHumidityPercent: 45,
  windKmh: 5,
  precipitationProbabilityPercent: 0,
  uvIndex: 1,
}));
const run = createDiscovery({
  clock: () => clock,
  provider: {
    getForecast: async (point) => ({
      ok: true,
      hourly,
      issues: [],
      metadata: {
        provider: "open-meteo",
        attribution: "Synthetic browser test",
        requested: point,
        returned: { ...point, elevation: 900 },
        timezone: "Asia/Amman",
        utcOffsetSeconds: 10800,
        retrievedAt: clock.toISOString(),
        requestUrl: "https://example.test",
        units: {},
        cache: "miss",
      },
    }),
  },
});
const browser = await chromium.launch({
  headless: true,
  channel: process.env.VAELORA_BROWSER_CHANNEL || "msedge",
});
const checks = [];
try {
  for (const [locale, width, theme] of [
    ["en", 320, "light"],
    ["ar", 320, "dark"],
    ["en", 390, "dark"],
    ["ar", 390, "dark"],
    ["en", 1440, "light"],
    ["ar", 1440, "dark"],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width, height: width === 320 ? 700 : width === 390 ? 844 : 900 },
      colorScheme: theme,
      reducedMotion: "reduce",
      acceptDownloads: true,
    });
    const p = await ctx.newPage(),
      errors = [],
      requests = [];
    await p.clock.install({ time: clock });
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (r.method() === "POST")
        requests.push({ url: r.url(), body: r.postData() });
    });
    await p.addInitScript(() => {
      window.__gps = { ok: null, mode: "good" };
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition(ok, fail) {
            if (window.__gps.mode === "denied") fail({ code: 1 });
            else if (window.__gps.mode === "outside")
              ok({
                coords: { latitude: 32.55, longitude: 35.85, accuracy: 5 },
              });
            else
              ok({
                coords: {
                  latitude: 31.981234,
                  longitude: 35.901234,
                  accuracy: 5,
                },
              });
          },
          watchPosition(ok, fail) {
            window.__gps.ok = ok;
            window.__gps.fail = fail;
            return 1;
          },
          clearWatch() {
            window.__gps.ok = null;
          },
        },
      });
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: () => false,
      });
    });
    await p.route("**/api/discovery", async (route) =>
      route.fulfill({ json: await run(route.request().postDataJSON()) }),
    );
    await p.route("**/api/search", (route) =>
      route.fulfill({
        json: {
          places: [
            {
              name:
                locale === "ar"
                  ? "مرجع اختبار اصطناعي"
                  : "Synthetic area reference",
              latitude: 31.9678,
              longitude: 35.8789,
            },
          ],
        },
      }),
    );
    await p.goto(base);
    await p.locator(".onboarding").waitFor();
    if (locale === "ar") await p.locator(".onboarding-language").click();
    await p.locator(".onboarding .product-quiet").click();
    const snap = async (name) => {
      await p.screenshot({
        path: `${out}/${locale}-${width}-${name}.png`,
        fullPage: true,
      });
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${name} overflow`,
      );
      const clearance = await p.evaluate(() => {
        const shell = document.querySelector(".v2-shell:not([hidden])")?.getBoundingClientRect();
        const dock = document.querySelector(".v2-dock")?.getBoundingClientRect();
        return shell && dock ? shell.bottom <= dock.top + 1 : false;
      });
      assert.equal(clearance, true, `${name} dock clearance`);
    };
    await snap("first-home");
    assert.equal(
      await p.locator("html").getAttribute("dir"),
      locale === "ar" ? "rtl" : "ltr",
    );
    const locate = p
      .locator(".discovery-location .section-heading button")
      .first();
    await locate.click();
    await p.locator('.daily-plan[aria-busy="false"]').waitFor();
    await p.locator(".nearby-card").first().waitFor();
    await snap("located-home");
    assert.ok(
      requests
        .filter((r) => r.url.endsWith("/api/discovery"))
        .every(
          (r) => !r.body.includes("31.981234") && !r.body.includes("35.901234"),
        ),
    );
    await p.locator(".nearby-card").first().click();
    await p.locator("dialog[open]").waitFor();
    await snap("place");
    await p.keyboard.press("Escape");
    await p
      .getByRole("button", {
        name: locale === "ar" ? "عرض الخريطة" : "View map",
        exact: false,
      })
      .click();
    await p.locator(".discovery-map .score-map").waitFor();
    await p.waitForTimeout(1500);
    assert.equal(await p.locator(".selected-area-marker").count(), 1);
    await snap("map");
    // Invoke the control directly only to bypass Next's development toolbar, which
    // overlaps the bottom-left Home control at 320 px. Production has no such portal.
    await p.locator(".v2-dock button").first().evaluate((button) => button.click());
    await p.locator("#dashboard").waitFor({ state: "visible" });
    await p.locator(".featured-grid button").nth(1).click();
    await p.locator("dialog[open]").waitFor();
    await p.keyboard.press("Escape");
    await p.locator(".quick-start").click();
    await p.locator('.track-live[data-state="recording"]').waitFor();
    const emit = async (i) =>
      p.evaluate(
        (i) =>
          window.__gps.ok?.({
            coords: {
              latitude: 31.981234 + i * 0.00008,
              longitude: 35.901234,
              accuracy: 5,
              speed: null,
            },
            timestamp: Date.now(),
          }),
        i,
      );
    await emit(0);
    for (let i = 1; i <= 100; i++) {
      await p.clock.runFor(5000);
      await emit(i);
    }
    await p.clock.runFor(1000);
    await snap("live");
    console.log(
      "TRACK",
      locale,
      width,
      await p.getByTestId("track-distance").innerText(),
      await p.getByTestId("active-time").innerText(),
      await p.locator(".track-gps").innerText(),
    );
    assert.ok(
      parseFloat(await p.getByTestId("track-distance").innerText()) > 0.8,
    );
    await p.locator(".track-controls button").first().click();
    const elapsed = await p.getByTestId("active-time").innerText();
    await p.clock.fastForward(5000);
    assert.equal(await p.getByTestId("active-time").innerText(), elapsed);
    await snap("paused");
    await p.locator(".track-controls button").first().click();
    await emit(101);
    await p.clock.fastForward(5000);
    await emit(102);
    await p.locator(".track-controls button").last().click();
    await p
      .getByText(
        locale === "ar" ? "محفوظ على هذا الجهاز" : "Saved on this device",
        { exact: true },
      )
      .waitFor();
    await snap("recap");
    assert.equal(await p.locator(".share-preview").getAttribute("data-route"), "metrics");
    assert.equal(await p.locator(".share-preview polyline").count(), 0);
    const shareImages = [];
    for (let i = 0; i < 3; i++) {
      await p.locator(".activity-share .v2-segment button").nth(i).click();
      const download = p.waitForEvent("download");
      await p.locator(".activity-share .track-actions button").first().click();
      const d = await download;
      await d.saveAs(`${out}/${locale}-${width}-share-${i}.png`);
      const bytes = readFileSync(`${out}/${locale}-${width}-share-${i}.png`);
      shareImages.push(bytes);
      assert.equal(bytes.readUInt32BE(16), 1080);
      assert.equal(bytes.readUInt32BE(20), 1440);
    }
    assert.equal(shareImages[0].equals(shareImages[1]), false);
    assert.equal(shareImages[1].equals(shareImages[2]), false);
    const fallback = p.waitForEvent("download");
    await p.locator(".activity-share .track-actions button").last().click();
    await fallback;
    await p.getByRole("button", { name: "GPX ↓", exact: true }).click();
    const gpx = p.waitForEvent("download");
    await p
      .getByRole("button", {
        name: locale === "ar" ? "تصدير المسار الدقيق" : "Export precise route",
        exact: true,
      })
      .click();
    const gpxDownload = await gpx;
    await gpxDownload.saveAs(`${out}/${locale}-${width}-synthetic.gpx`);
    assert.match(
      readFileSync(`${out}/${locale}-${width}-synthetic.gpx`, "utf8"),
      /<trkpt/,
    );
    await p
      .getByRole("button", {
        name: locale === "ar" ? "نشاط جديد" : "New activity",
        exact: true,
      })
      .click();
    await p.locator(".track-heading button").click();
    await p.locator(".track-history button").first().click();
    await p.locator(".recap-title").waitFor();
    await p.locator(".v2-dock button").first().evaluate((button) => button.click());
    await p.locator("#dashboard").waitFor({ state: "visible" });
    await p.locator(".personal-progress .progress-metrics").waitFor();
    await snap("returning-home");
    await p.locator(".profile-entry").click();
    await snap("profile");
    await p.keyboard.press("Escape");
    await p.locator(".ask-dock").evaluate((button) => button.click());
    await p.locator(".v2-ai").waitFor();
    assert.equal(await p.locator("#ai-reference-area").inputValue(), "amman-central");
    assert.equal(await p.locator(".v2-ai").getByText(/near me|بالقرب مني/i).count(), 0);
    await snap("ask");
    await p.keyboard.press("Escape");
    await p
      .locator(".discovery-search input")
      .fill(locale === "ar" ? "منطقة" : "area");
    await p.locator(".discovery-search button").click();
    await p.locator(".search-results button").first().click();
    await p.locator('.daily-plan[aria-busy="false"]').waitFor();
    await snap("manual");
    await p.evaluate(() => (window.__gps.mode = "denied"));
    await locate.click();
    await p.locator(".discovery-location .v21-notice").waitFor();
    await snap("denied");
    await p.evaluate(() => (window.__gps.mode = "outside"));
    await locate.click();
    await snap("outside");
    await p.unroute("**/api/search");
    await p.unroute("**/api/discovery");
    await ctx.setOffline(true);
    await p
      .locator(".discovery-search input")
      .fill(locale === "ar" ? "بحث دون اتصال" : "Offline search");
    await p.locator(".discovery-search button").click();
    await p
      .getByText(
        locale === "ar"
          ? "البحث غير متاح أو مشغول. أعد المحاولة أو اختر منطقة مرجعية أدناه."
          : "Search unavailable or busy. Try again, or use a reference area below.",
        { exact: true },
      )
      .waitFor();
    await p.locator(".reference-picker summary").click();
    await p.locator(".reference-picker button").first().click();
    await p.locator('.daily-plan[aria-busy="false"]').waitFor();
    await p
      .getByText(
        locale === "ar"
          ? "الظروف غير متاحة. أعد المحاولة عند الاتصال."
          : "Conditions unavailable. Try again when online.",
        { exact: true },
      )
      .waitFor();
    await snap("offline");
    assert.deepEqual(errors, []);
    assert.ok(requests.every((r) => !r.body?.includes('"points"')));
    assert.equal(await p.locator(".location-art img").count(), 0);
    checks.push(
      `${locale} ${width} ${theme}: onboarding, GPS/manual/denied/outside, plan, reviewed place, clustered map, quick start, timer/distance, pause/resume, recap, 3 PNG exports, share fallback, history/progress, profile, Ask, no overflow or page errors`,
    );
    await ctx.close();
  }
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await browser.close();
}

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
  out = process.env.VAELORA_QA_OUT || ".playwright-cli/v23";
mkdirSync(out, { recursive: true });
const clock = new Date("2026-09-23T08:00:00+03:00");
const hourly = Array.from({ length: 24 }, (_, h) => ({
  time: `2026-09-23T${String(h).padStart(2, "0")}:00`,
  temperatureC: 20 + Math.round(4 * Math.sin((h - 9) / 4)),
  apparentTemperatureC: 20,
  relativeHumidityPercent: 45,
  windKmh: h >= 15 && h <= 17 ? 24 : 5,
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
const only = process.env.VAELORA_QA_ONLY?.split(",");
const checks = [];
try {
  for (const [locale, width, theme] of [
    ["en", 320, "light"],
    ["ar", 320, "dark"],
    ["en", 390, "light"],
    ["ar", 390, "dark"],
    ["en", 430, "dark"],
    ["en", 1440, "light"],
    ["ar", 1440, "dark"],
  ]) {
    if (only && !only.includes(`${locale}-${width}`)) continue;
    const ctx = await browser.newContext({
      viewport: { width, height: width <= 430 ? (width === 320 ? 700 : 844) : 900 },
      colorScheme: theme,
      reducedMotion: "reduce",
      acceptDownloads: true,
      // Request mocks must not be bypassed by the production service worker.
      serviceWorkers: "block",
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
              ok({ coords: { latitude: 32.55, longitude: 35.85, accuracy: 5 } });
            else
              ok({ coords: { latitude: 31.981234, longitude: 35.901234, accuracy: 5 } });
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
              name: locale === "ar" ? "مرجع اختبار اصطناعي" : "Synthetic area reference",
              latitude: 31.9678,
              longitude: 35.8789,
            },
          ],
        },
      }),
    );
    try {
    await p.goto(base);
    await p.locator(".onboarding").waitFor();
    await snapViewport("onboarding");
    if (locale === "ar") await p.locator(".onboarding-language").click();
    await p.locator(".onboarding .product-quiet").click();
    async function snapViewport(name) {
      await p.screenshot({ path: `${out}/${locale}-${width}-${name}.png` });
    }
    const snap = async (name) => {
      await p.screenshot({ path: `${out}/${locale}-${width}-${name}.png`, fullPage: true });
      assert.equal(
        await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `${name} overflow`,
      );
      // At the bottom of the page, the last content clears the floating dock.
      const clearance = await p.evaluate(async () => {
        const shell = document.querySelector(".v2-shell:not([hidden])");
        const dock = document.querySelector(".v2-dock")?.getBoundingClientRect();
        if (!shell || !dock) return false;
        // On desktop the navigation joins the header, so nothing floats over the content end.
        if (dock.top < innerHeight / 2) return true;
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => requestAnimationFrame(r));
        const pad = parseFloat(getComputedStyle(shell).paddingBottom);
        const content = shell.getBoundingClientRect().bottom - pad;
        window.scrollTo(0, 0);
        return content <= dock.top + 1;
      });
      assert.equal(clearance, true, `${name} dock clearance`);
    };
    await snap("first-home");
    assert.equal(await p.locator("html").getAttribute("dir"), locale === "ar" ? "rtl" : "ltr");
    const locate = p.locator(".near .section-head .btn").first();
    await locate.click();
    await p.locator('.plan[aria-busy="false"]').waitFor();
    await p.locator(".nearby-card").first().waitFor();
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.locator(".home-title").waitFor();
    assert.equal(await p.locator(".meteogram .meteo-col").count() > 0, true, "meteogram columns");
    // Let the recommended-state colour transition settle before capturing.
    await p.waitForTimeout(400);
    await snapViewport("located-home-viewport");
    await snap("located-home");
    // Ask shows the same live plan and meteogram as Home.
    await p.locator(".ask-dock").evaluate((button) => button.click());
    await p.locator(".ask-plan .meteogram").waitFor();
    await snapViewport("ask-plan");
    await p.keyboard.press("Escape");
    await p.locator(".v2-ai").waitFor({ state: "detached" });
    assert.ok(
      requests
        .filter((r) => r.url.endsWith("/api/discovery"))
        .every((r) => !r.body.includes("31.981234") && !r.body.includes("35.901234")),
    );
    // Place profile is a routed overlay: Back closes it without leaving Home.
    await p.locator(".nearby-card").first().click();
    await p.locator("dialog[open]").waitFor();
    assert.match(p.url(), /#\/home\?place=/);
    await snapViewport("place");
    await p.goBack();
    await p.locator("dialog[open]").waitFor({ state: "detached" });
    assert.match(p.url(), /#\/home$/);
    await p.locator(".near-actions .btn").filter({ hasText: locale === "ar" ? "الخريطة" : "Map" }).click();
    await p.locator(".map-screen .score-map").waitFor();
    await p.waitForTimeout(1500);
    assert.equal(await p.locator(".selected-area-marker").count(), 1);
    assert.match(p.url(), /#\/map$/);
    await snap("map");
    // Back from Map returns to Home in-app.
    await p.goBack();
    await p.locator("#dashboard").waitFor({ state: "visible" });
    await p.locator(".featured-rail .featured-card").nth(1).click();
    await p.locator("dialog[open]").waitFor();
    await p.keyboard.press("Escape");
    await p.locator("dialog[open]").waitFor({ state: "detached" });
    await p.locator(".plan-start").click();
    await p.locator('.track-live[data-state="acquiring"]').waitFor();
    await snapViewport("acquiring");
    const emit = async (i) =>
      p.evaluate(
        (i) =>
          window.__gps.ok?.({
            coords: { latitude: 31.981234 + i * 0.00008, longitude: 35.901234, accuracy: 5, speed: null },
            timestamp: Date.now(),
          }),
        i,
      );
    await emit(0);
    await p.locator('.track-live[data-state="recording"]').waitFor();
    for (let i = 1; i <= 100; i++) {
      await p.clock.runFor(5000);
      await emit(i);
    }
    await p.clock.runFor(1000);
    await snapViewport("live");
    await snap("live-full");
    console.log(
      "TRACK",
      locale,
      width,
      await p.getByTestId("track-distance").innerText(),
      await p.getByTestId("active-time").innerText(),
      await p.locator(".track-gps").innerText(),
    );
    assert.ok(parseFloat(await p.getByTestId("track-distance").innerText()) > 0.8);
    // Navigating away during a recording keeps the session alive.
    await p.locator(".v2-dock .dock-item").first().evaluate((b) => b.click());
    await p.locator("#dashboard").waitFor({ state: "visible" });
    await p.clock.runFor(2000);
    await p.goBack();
    await p.locator('.track-live[data-state="recording"]').waitFor();
    await p.locator(".track-controls button").first().click();
    const elapsed = await p.getByTestId("active-time").innerText();
    await p.clock.fastForward(5000);
    assert.equal(await p.getByTestId("active-time").innerText(), elapsed);
    await p.waitForTimeout(400);
    await snapViewport("paused");
    await p.locator(".track-controls button").first().click();
    await emit(101);
    await p.clock.fastForward(5000);
    await emit(102);
    // Going to the background pauses honestly and asks to resume on return.
    await p.evaluate(() => {
      const set = (v) => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
      set("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      set("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await p.locator('.track-interrupt[role="alert"]').waitFor();
    await p.locator('.track-live[data-state="paused"]').waitFor();
    await snapViewport("backgrounded");
    await p.locator(".track-interrupt .btn-course").click();
    await p.locator(".track-interrupt").waitFor({ state: "detached" });
    await emit(103);
    await p.clock.fastForward(5000);
    await emit(104);
    await p.locator(".track-controls button").last().click();
    await p
      .getByText(locale === "ar" ? "محفوظ على هذا الجهاز" : "Saved on this device", { exact: true })
      .waitFor();
    assert.match(p.url(), /#\/track\?activity=/);
    await snapViewport("recap-viewport");
    await snap("recap");
    assert.equal(await p.locator(".share-preview").getAttribute("data-route"), "metrics");
    assert.equal(await p.locator(".share-preview polyline").count(), 0);
    const shareImages = [];
    for (let i = 0; i < 3; i++) {
      await p.locator(".activity-share .seg button").nth(i).click();
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
    await p.getByRole("button", { name: "GPX", exact: true }).click();
    const gpx = p.waitForEvent("download");
    await p
      .getByRole("button", { name: locale === "ar" ? "تصدير المسار الدقيق" : "Export precise route", exact: true })
      .click();
    const gpxDownload = await gpx;
    await gpxDownload.saveAs(`${out}/${locale}-${width}-synthetic.gpx`);
    assert.match(readFileSync(`${out}/${locale}-${width}-synthetic.gpx`, "utf8"), /<trkpt/);
    // Back from the recap returns to the ready screen; Forward restores the recap.
    await p.goBack();
    await p.locator(".track-ready").waitFor();
    await p.goForward();
    await p.locator(".recap-title").waitFor();
    // Refresh keeps the recap route.
    await p.reload();
    await p.locator(".recap-title").waitFor();
    await p
      .getByRole("button", { name: locale === "ar" ? "نشاط جديد" : "New activity", exact: true })
      .click();
    await p.locator(".track-heading button").click();
    await p.locator(".track-history button").first().click();
    await p.locator(".recap-title").waitFor();
    await p.locator(".v2-dock button").first().evaluate((button) => button.click());
    await p.locator("#dashboard").waitFor({ state: "visible" });
    await p.locator(".personal-progress .progress-metrics").waitFor();
    await snap("returning-home");
    await p.locator(".profile-entry").click();
    await p.locator(".profile-panel").waitFor();
    assert.match(p.url(), /sheet=profile/);
    await snapViewport("profile");
    // Backup: export, then re-import the same file; every activity is a duplicate.
    const backupDownload = p.waitForEvent("download");
    await p.locator(".backup-actions button").first().click();
    const backupFile = `${out}/${locale}-${width}-backup.json`;
    await (await backupDownload).saveAs(backupFile);
    const backup = JSON.parse(readFileSync(backupFile, "utf8"));
    assert.equal(backup.format, "vaelora-activity-backup");
    assert.equal(backup.activities.length, 1);
    await p.locator('.backup input[type="file"]').setInputFiles(backupFile);
    await p.locator(".backup .notice").waitFor();
    assert.match(
      await p.locator(".backup .notice").innerText(),
      locale === "ar" ? /لا تحتوي/ : /no activities to add/,
    );
    await p.locator('.backup input[type="file"]').setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{broken"),
    });
    await p.locator('.backup .notice[data-tone="danger"]').waitFor();
    await snap("profile-full");
    await p.goBack();
    await p.locator(".profile-panel").waitFor({ state: "detached" });
    await p.locator(".ask-dock").evaluate((button) => button.click());
    await p.locator(".v2-ai").waitFor();
    assert.equal(await p.locator("#ai-reference-area").inputValue(), "amman-central");
    assert.equal(await p.locator(".v2-ai").getByText(/near me|بالقرب مني/i).count(), 0);
    await snapViewport("ask");
    await p.keyboard.press("Escape");
    await p.locator(".v2-ai").waitFor({ state: "detached" });
    await p.locator(".near-search input").fill(locale === "ar" ? "منطقة" : "area");
    await p.locator(".near-search button").click();
    await p.locator(".search-results button").first().click();
    await p.locator('.plan[aria-busy="false"]').waitFor();
    await snap("manual");
    await p.evaluate(() => (window.__gps.mode = "denied"));
    await locate.click();
    await p.locator(".near .notice").first().waitFor();
    await snap("denied");
    await p.evaluate(() => (window.__gps.mode = "outside"));
    await locate.click();
    await snap("outside");
    await p.unroute("**/api/search");
    await p.unroute("**/api/discovery");
    await ctx.setOffline(true);
    await p.locator(".near-search input").fill(locale === "ar" ? "بحث دون اتصال" : "Offline search");
    await p.locator(".near-search button").click();
    await p
      .getByText(
        locale === "ar"
          ? "البحث غير متاح أو مشغول. حاول مجددًا أو اختر منطقة أدناه."
          : "Search is unavailable or busy. Try again, or choose an area below.",
        { exact: true },
      )
      .waitFor();
    await p.locator(".reference-picker summary").click();
    await p.locator(".reference-picker button").first().click();
    await p.locator('.plan[aria-busy="false"]').waitFor();
    await p
      .locator(".plan-headline")
      .filter({ hasText: locale === "ar" ? "الظروف غير متاحة" : "Conditions unavailable" })
      .waitFor();
    await snap("offline");
    assert.deepEqual(errors, []);
    assert.ok(requests.every((r) => !r.body?.includes('"points"')));
    assert.equal(await p.locator(".location-art img").count(), 0);
    checks.push(
      `${locale} ${width} ${theme}: onboarding, GPS/manual/denied/outside, plan + meteogram, routed place sheet, clustered map, Back navigation, quick start, recording survives navigation, pause/resume, recap route + refresh, 3 PNG exports, share fallback, GPX, history/progress, profile, backup export/import/errors, Ask, no overflow or page errors`,
    );
    } catch (error) {
      await p.screenshot({ path: `${out}/${locale}-${width}-FAILED.png`, fullPage: true }).catch(() => {});
      throw error;
    }
    await ctx.close();
  }
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await browser.close();
}

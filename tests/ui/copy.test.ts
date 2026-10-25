import test from "node:test";
import assert from "node:assert/strict";
import { homeCopy } from "../../src/lib/copy/home.ts";
import { askCopy, shellCopy } from "../../src/lib/copy/shell.ts";
import { gpsQualityCopy, shareCopy, trackCopy } from "../../src/lib/copy/track.ts";
import { onboardingCopy, profileCopy, progressCopy } from "../../src/lib/copy/profile.ts";
import { forecastCopy, toolsCopy } from "../../src/lib/copy/tools.ts";
import { arabicCount, tr, translator } from "../../src/lib/i18n.ts";

const dictionaries = {
  homeCopy,
  shellCopy,
  askCopy,
  trackCopy,
  gpsQualityCopy,
  shareCopy,
  progressCopy,
  profileCopy,
  onboardingCopy,
  toolsCopy,
  forecastCopy,
};
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
// Brand and format tokens that are legitimately identical in both languages.
// The language switch is labelled in the language it switches to.
const sameInBoth = new Set(["gpx", "switchLanguage", "languageName"]);

test("Every UI string has polished English and Arabic with matching placeholders", () => {
  for (const [name, dict] of Object.entries(dictionaries))
    for (const [key, [en, ar]] of Object.entries(dict)) {
      const id = `${name}.${key}`;
      assert.ok(en.trim(), `${id} English missing`);
      assert.ok(ar.trim(), `${id} Arabic missing`);
      if (!sameInBoth.has(key)) assert.match(ar, /[؀-ۿ]/, `${id} Arabic is not Arabic`);
      assert.deepEqual(placeholders(en), placeholders(ar), `${id} placeholders differ`);
      // One numeral system: Arabic copy uses Western digits like the metrics.
      assert.doesNotMatch(ar, /[٠-٩]/, `${id} uses Arabic-Indic digits`);
      // House style: no em dashes in interface copy.
      assert.doesNotMatch(en + ar, /—/, `${id} contains an em dash`);
    }
});

test("Translators interpolate variables and Arabic counts use the right plural", () => {
  assert.equal(tr("en", homeCopy.startWalk, { n: 60 }), "Start 60 min walk");
  assert.equal(tr("ar", homeCopy.startWalk, { n: 60 }), "ابدأ المشي 60 دقيقة");
  assert.equal(translator(homeCopy, "en")("betterLater", { time: "17:00" }), "Better at 17:00");
  assert.equal(tr("en", homeCopy.updated), "Updated {time}");
  const forms = ["نشاط", "نشاطان", "أنشطة", "نشاطًا"] as const;
  assert.deepEqual([1, 2, 3, 10, 11, 25].map((n) => arabicCount(n, forms)), [
    "نشاط",
    "نشاطان",
    "أنشطة",
    "أنشطة",
    "نشاطًا",
    "نشاطًا",
  ]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { statSync, readFileSync } from "node:fs";
import { activityAreas } from "../../src/data/activity-areas.ts";
import { locationPhotos, photoFallbackReasons } from "../../src/lib/location-photos.ts";
import { messages } from "../../src/lib/i18n.ts";

test("Every production area has either verified photo metadata or an explicit fallback, never both", () => {
  const ids = activityAreas.map(a => a.id).sort();
  assert.deepEqual([...Object.keys(locationPhotos), ...Object.keys(photoFallbackReasons)].sort(), ids);
  for (const id of ids) assert.notEqual(Boolean(locationPhotos[id]), Boolean(photoFallbackReasons[id]));
  assert.equal(locationPhotos["invented-location"], undefined);
});

test("Photo assets are local bounded WebP files with exact dimensions and reusable source attribution", () => {
  for (const photo of Object.values(locationPhotos)) {
    assert.match(photo.src, /^\/images\/locations\/[a-z-]+\.webp$/);
    assert.ok(statSync(`public${photo.src}`).size < 450_000);
    const bytes = readFileSync(`public${photo.src}`);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    // Sharp's lossy output uses VP8: the frame dimensions follow its sync code.
    const frame = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
    assert.ok(frame > 0);
    assert.equal(bytes.readUInt16LE(frame + 3) & 0x3fff, photo.width);
    assert.equal(bytes.readUInt16LE(frame + 5) & 0x3fff, photo.height);
    assert.ok(Math.max(photo.width, photo.height) <= 1600);
    assert.match(photo.source, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.match(photo.licenseUrl, /^https:\/\/creativecommons.org\/licenses\/by-sa\/[34]\.0\/$/);
    assert.ok(photo.author.trim() && photo.alt.en.trim());
    assert.match(photo.alt.ar, /[\u0600-\u06ff]/);
  }
});

test("Visible Arabic messages avoid the replaced colloquial UI phrases", () => {
  for (const [, ar] of Object.values(messages)) assert.doesNotMatch(ar, /بكرا|بدي\s|وين |احكيلنا|شو بدك|طلعتك|طلعة أحلى|ليش/);
});

test("Photo placeholders explicitly disclaim location photography in both languages", () => {
  assert.match(messages.photoNeutral[0], /not a photograph/);
  assert.match(messages.photoNeutral[1], /ليست صورة/);
  assert.match(messages.photoHistorical[0], /not a live view/);
  assert.match(messages.photoHistorical[1], /ليست بثًا مباشرًا/);
});

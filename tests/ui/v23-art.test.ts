import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("All location presentation uses generated SVG without photograph dependencies", () => {
  const facade = readFileSync("src/components/location-photo.tsx", "utf8"),
    art = readFileSync("src/components/location-art.tsx", "utf8");
  assert.match(facade, /LocationArt/);
  assert.doesNotMatch(
    facade + art,
    /next\/image|locationPhotos|<img|https?:\/\//,
  );
  for (const theme of [
    "park",
    "nature",
    "urban",
    "running",
    "walking",
    "featured",
  ])
    assert.ok(art.includes(`"${theme}"`));
  assert.match(art, /<svg/);
  assert.match(art, /photoNeutral/);
});

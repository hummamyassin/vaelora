import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("V2.3.1 uses one dock-aware scroll frame and explicit degraded actions", () => {
  const dashboard = readFileSync("src/app/dashboard.css", "utf8");
  const home = readFileSync("src/components/discovery-home.tsx", "utf8");
  assert.match(dashboard, /--dock-reserve/);
  assert.match(dashboard, /height: calc\(100dvh - var\(--header-reserve\) - var\(--dock-reserve\)\)/);
  assert.match(dashboard, /scroll-padding-block/);
  assert.match(home, /Track without a recommendation/);
  assert.match(home, /Start tracking — conditions unavailable/);
  assert.match(home, /Track without a location plan/);
  assert.match(home, /data-recommended/);
});

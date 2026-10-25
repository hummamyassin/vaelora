import test from "node:test";
import assert from "node:assert/strict";
import {
  closeStrategy,
  formatRoute,
  homeRoute,
  nextRoute,
  parseRoute,
  sameRoute,
} from "../../src/lib/app-route.ts";

test("Routes round-trip through the hash and default safely to Home", () => {
  for (const hash of [
    "#/home",
    "#/map",
    "#/track",
    "#/saved",
    "#/home?place=sports-city",
    "#/track?activity=3f2a-77b1",
    "#/map?sheet=ask",
    "#/home?place=king-hussein-park&sheet=profile",
  ])
    assert.equal(formatRoute(parseRoute(hash)), hash);
  for (const junk of ["", "#", "#/nowhere", "#/../../etc", "#/home?sheet=admin"])
    assert.deepEqual(
      { ...parseRoute(junk), sheet: null },
      homeRoute,
    );
});

test("Hash routes never carry coordinates or unsafe identifiers", () => {
  const route = parseRoute(
    "#/home?place=31.95,35.91&lat=31.95&lng=35.91",
  );
  assert.equal(route.place, null);
  assert.equal(formatRoute(route), "#/home");
  assert.equal(parseRoute("#/track?activity=<script>").activity, null);
  // Screen-scoped details are dropped on the wrong screen.
  assert.equal(parseRoute("#/map?place=sports-city").place, null);
  assert.equal(parseRoute("#/home?activity=abc").activity, null);
});

test("Changing screen drops overlays and screen details; overlays merge in place", () => {
  const onPlace = nextRoute(homeRoute, { place: "sports-city" });
  assert.equal(formatRoute(onPlace), "#/home?place=sports-city");
  const toTrack = nextRoute(onPlace, { screen: "track" });
  assert.equal(formatRoute(toTrack), "#/track");
  const recap = nextRoute(toTrack, { activity: "a1" });
  assert.equal(formatRoute(recap), "#/track?activity=a1");
  const ask = nextRoute(recap, { sheet: "ask" });
  assert.equal(formatRoute(ask), "#/track?activity=a1&sheet=ask");
  assert.equal(formatRoute(nextRoute(ask, { sheet: null })), "#/track?activity=a1");
  assert.ok(sameRoute(nextRoute(recap, {}), recap));
});

test("Closing an overlay steps back only over entries this session pushed", () => {
  const route = parseRoute("#/home?sheet=ask");
  assert.equal(closeStrategy({ vaelora: 1, depth: 2, route }), "back");
  // Deep link or refresh at the root: replace so Back cannot leave the app.
  assert.equal(closeStrategy({ vaelora: 1, depth: 0, route }), "replace");
  assert.equal(closeStrategy(null), "replace");
  assert.equal(closeStrategy({ foreign: true }), "replace");
});

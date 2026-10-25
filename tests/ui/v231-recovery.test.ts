import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { trackCopy } from "../../src/lib/copy/track.ts";

test("unfinished recordings block the ordinary start flow and offer explicit recovery", () => {
  const source = readFileSync("src/components/track-app.tsx", "utf8");
  assert.match(source, /if \(drafts\.length\)/);
  assert.match(source, /drafts\.length === 0/);
  assert.ok(source.includes('c("resume")') && source.includes('c("discard")'));
  assert.deepEqual(trackCopy.resume, ["Resume activity", "استئناف النشاط"]);
  assert.equal(trackCopy.discard[0], "Discard activity");
});

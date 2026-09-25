import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("unfinished recordings block the ordinary start flow and offer explicit recovery", () => {
  const source = readFileSync("src/components/track-app.tsx", "utf8");
  assert.match(source, /if \(drafts\.length\)/);
  assert.match(source, /drafts\.length === 0/);
  assert.match(source, /Resume activity/);
  assert.match(source, /استئناف النشاط/);
  assert.match(source, /Discard activity/);
});

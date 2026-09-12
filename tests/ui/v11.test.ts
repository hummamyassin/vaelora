import test from "node:test";
import assert from "node:assert/strict";
import { distanceKm, forecastHours, orderNearby } from "../../src/lib/geography.ts";
import { coverage } from "../../src/lib/coverage.ts";
import { messages, areaName, areaDescription } from "../../src/lib/i18n.ts";
import { activityAreas } from "../../src/data/activity-areas.ts";
import { parseIntent, resolveIntent } from "../../src/server/ai/intent.ts";
import { createOutdoorAgent, renderRecommendation } from "../../src/server/ai/agent.ts";
import { createAgentHandler } from "../../src/server/ai/http.ts";
import { evaluationClock, evaluationPipeline, replayModel } from "../../scripts/agent-evaluation.ts";
import cases from "../../docs/evaluation/agent/cases.json" with { type: "json" };

test("V1.1 coverage maps each production ID once and every area has Arabic caveats", () => {
  assert.deepEqual([...coverage.cities.flatMap(c=>c.areaIds)].sort(), activityAreas.map(a=>a.id).sort());
  for (const area of activityAreas) {
    assert.match(areaName("ar",area), /[\u0600-\u06ff]/);
    assert.match(areaDescription("ar",area), /[\u0600-\u06ff]/);
    assert.equal(areaName("en",area),area.name);
  }
  for(const [en,ar] of Object.values(messages)) { assert.ok(en.trim()); assert.match(ar,/[\u0600-\u06ff]/); }
});
test("Haversine is geographic, symmetric, bounded and rejects invalid positions",()=>{
  const a={latitude:0,longitude:0}, b={latitude:0,longitude:1};
  assert.equal(distanceKm(a,a),0); assert.ok(Math.abs(distanceKm(a,b)-111.195)<.01);
  assert.equal(distanceKm(a,b),distanceKm(b,a));
  for(const latitude of [NaN,Infinity,91]) assert.throws(()=>distanceKm(a,{latitude,longitude:0}));
});
test("Proximity reorders only the existing Top Match band without mutation",()=>{
  const matches=[{area:{id:"b",latitude:32,longitude:36},score:0},{area:{id:"a",latitude:31.95,longitude:35.9},score:1}];
  const sorted=orderNearby(matches,{latitude:31.95,longitude:35.9});
  assert.equal(sorted[0],matches[1]); assert.equal(matches[0].area.id,"b");
  assert.deepEqual(orderNearby(matches,null),matches); assert.equal(sorted.length,matches.length);
});
test("Minute outings use enclosing full forecast hours and disclose the conversion",()=>{
  for(const [minutes,hours] of [[30,1],[45,1],[60,1],[90,2]]) {
    assert.equal(forecastHours(minutes),hours);
    const intent=parseIntent({...cases[0].mockIntent,durationMinutes:minutes,durationHours:null});
    const resolved=resolveIntent(intent,evaluationClock); assert.equal(resolved.kind,"ready");
    if(resolved.kind==="ready") { assert.equal(resolved.request.durationHours,hours); assert.ok(resolved.assumptions.some(a=>a.includes(`${minutes}-minute`))); assert.ok(!resolved.assumptions.some(a=>a.startsWith("Using one-hour"))); }
  }
  for(const invalid of [0,-1,1.5,Infinity,1441]) assert.throws(()=>forecastHours(invalid));
  assert.throws(()=>parseIntent({...cases[0].mockIntent,durationHours:1.5}));
});
test("Arabic agent presentation stays deterministic and preserves every location/window",async()=>{
  const agent=createOutdoorAgent({model:replayModel(cases[0].mockIntent),run:evaluationPipeline(),clock:()=>evaluationClock});
  const answer=await agent("أريد الجري بكرا","ar"); assert.equal(answer.status,"answered");
  if(answer.status!=="answered")return;
  assert.equal(answer.presentationValidated,true);
  assert.deepEqual({matches:answer.matches,text:answer.text},renderRecommendation(answer.result,answer.assumptions,"ar"));
  assert.deepEqual(answer.matches.map(m=>m.areaId),answer.result.topMatches.map(m=>m.area.id));
  assert.ok(!/[a-z]/i.test(answer.text));
  assert.equal(answer.trace.length,7);
});
test("Agent locale is validated at HTTP boundary and Arabic failures are graceful",async()=>{
  const model=replayModel(cases[0].mockIntent);
  model.extract=async()=>{throw new Error("provider unavailable");};
  const agent=createOutdoorAgent({model,run:evaluationPipeline()});
  const handler=createAgentHandler(()=>agent);
  const request=(body:unknown)=>new Request("http://localhost/api/agent",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  assert.equal((await handler(request({prompt:"test",locale:"fr"}))).status,400);
  const response=await handler(request({prompt:"الجري بكرا",locale:"ar"}));
  assert.equal(response.status,503); assert.match((await response.json()).text,/[\u0600-\u06ff]/);
});
test("Hourly classifications come from the same deterministic scorer used by the pipeline",async()=>{
  const result=await evaluationPipeline()({activity:"running",date:"2026-09-13",startHour:6,endHour:12,durationHours:1});
  assert.ok(result.hourlyAssessments.length>0);
  for(const match of result.topMatches)for(const window of match.bestWindows) {
    const hours=result.hourlyAssessments.find(a=>a.areaId===match.area.id)!.hours.filter(h=>h.time>=window.start&&h.time<window.end);
    assert.ok(hours.length>0); assert.ok(hours.every(h=>h.eligible&&h.severity===window.severity));
  }
});

// MathQuest 0.10.0: classroom flows on Math Engine questions (MATH-ENGINE host-integration-v0.1).
import test from "node:test";
import assert from "node:assert/strict";
import { QuestSession } from "./authenticated-session.mjs";
import { ENGINE } from "../src/engine-questions.js";

class MemoryStorage { constructor() { this.data = new Map(); } async get(k) { return structuredClone(this.data.get(k)); } async put(k, v) { this.data.set(k, structuredClone(v)); } }
const context = () => ({ storage: new MemoryStorage(), blockConcurrencyWhile: f => f() });
async function call(room, path, method = "GET", body) {
  const response = await room.fetch(new Request(`https://session${path}`, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }));
  return { status: response.status, body: JSON.parse(await response.text()) };
}
const command = (room, body) => call(room, "/command", "POST", { commandId: crypto.randomUUID(), ...body });

// Kindergarten through Algebra 2, plus a choice item, a keyboard item and a keypad-extras item.
const SPAN = [
  "k-next", "g3-reduce", "g7-intdiv",
  "bank:intermediate-4-en:authored:M2-4078157a9e82-2",
  "bank:course-87-en:item:SN870001",
  "bank:algebra-1-en:node:570",
  "bank:algebra-2-en:node:142",
  "bank:course-87-en:authored:MCADA-18.1",
  "mq-properties"
];

async function launch(modules, size = 2) {
  const room = new QuestSession(context());
  await call(room, "/init", "POST", { code: "ENG10", teacherKey: "teacher", config: { teamNames: ["Crew"], gateCount: 3, modules } });
  const pin = (await call(room, "/state?teacherKey=teacher")).body.teams[0].pin;
  for (let i = 0; i < size; i++) await command(room, { type: "student.join", deviceId: `s${i}`, alias: `S${i}`, teamPin: pin });
  await command(room, { type: "teacher.start", teacherKey: "teacher" });
  for (let i = 0; i < size; i++) await command(room, { type: "briefing.ready", deviceId: `s${i}` });
  return room;
}

test("a K–Algebra 2 engine session issues engine questions, hides answers, and accepts correct work", async () => {
  const room = await launch(SPAN.map(id => ({ id, source: "engine", itemCount: 2 })));
  assert.deepEqual(room.state.config.modules.map(m => m.source), SPAN.map(() => "engine"));
  const seen = new Set(), types = new Set();
  for (const id of ["s0", "s1"]) {
    for (let guard = 0; guard < 40 && !room.state.students[id].gateComplete; guard++) {
      const view = (await call(room, `/state?deviceId=${id}`)).body;
      const shown = view.student.currentItem;
      if (!shown) break;
      assert.equal(shown.answer, undefined, "the student view never carries the answer");
      assert.equal(JSON.stringify(shown).includes("engineItem"), false);
      const item = room.state.students[id].currentItem;
      assert.equal(item.source, "math-engine");
      assert.equal(item.engineVersion, ENGINE.version);
      seen.add(item.engineId); types.add(item.answerType);
      const wrong = await command(room, { type: "math.submit", deviceId: id, answer: item.answerType === "choice" ? item.options.find(o => o !== item.answer) : item.answer + "7" });
      assert.equal(wrong.body.feedback?.correct ?? false, false);
      const right = await command(room, { type: "math.submit", deviceId: id, answer: item.answer });
      assert.equal(right.body.feedback.correct, true, `${item.engineId}: ${item.prompt}`);
    }
    assert.equal(room.state.students[id].gateComplete, true);
  }
  assert.ok(seen.size >= 3, [...seen].join());
  const attempts = room.state.attempts;
  assert.ok(attempts.length > 0);
  assert.ok(attempts.every(a => a.source === "math-engine" && a.subskillId && a.expected !== undefined));
});

test("every answer input type round-trips through the session", async () => {
  const room = await launch(SPAN.map(id => ({ id, source: "engine", itemCount: 1 })), 1);
  const student = room.state.students.s0;
  const types = new Set();
  for (const id of SPAN) {
    student.gateComplete = false; student.gateProgress = 0;
    student.currentItem = { ...(await import("../src/engine-questions.js")).engineQuestion(id, 77), attempts: 0 };
    types.add(student.currentItem.answerType);
    const result = await command(room, { type: "math.submit", deviceId: "s0", answer: student.currentItem.answer });
    assert.equal(result.body.feedback?.correct, true, `${id}: ${JSON.stringify(result.body.error || '')}`);
  }
  for (const t of ["choice", "engine-text", "fraction", "number"]) assert.ok(types.has(t), `covers ${t}: ${[...types]}`);
});

test("unsimplified engine fractions get the simplest-form message and are not counted as correct", async () => {
  const room = await launch([{ id: "g4-equivalent", source: "engine", itemCount: 3 }], 1);
  await call(room, "/state?deviceId=s0");
  const item = room.state.students.s0.currentItem;
  const [n, d] = item.answer.split("/").map(Number);
  const result = await command(room, { type: "math.submit", deviceId: "s0", answer: `${2 * n}/${2 * d}` });
  assert.match(result.body.feedback.message, /value is correct/);
  assert.equal(room.state.attempts.at(-1).rejectionReason, "equivalent-unsimplified");
  assert.equal(room.state.students.s0.itemsCompleted, 0);
});

test("malformed engine entries are refused without counting an attempt", async () => {
  const room = await launch([{ id: "g6-gcf", source: "engine", itemCount: 3 }], 1);
  await call(room, "/state?deviceId=s0");
  const before = room.state.attempts.length;
  const result = await command(room, { type: "math.submit", deviceId: "s0", answer: "abc" });
  assert.ok(result.body.error);
  assert.equal(room.state.attempts.length, before);
});

test("rooms and setups that name retired MathQuest modules run on the mapped engine items", async () => {
  const room = await launch([{ id: "fraction.simplify", source: "preset", band: "advanced", itemCount: 3 }, { id: "number.real-family", itemCount: 3 }], 1);
  assert.deepEqual(room.state.config.modules.map(m => m.title), ["Simplifying Fractions", "Real Number Classification"]);
  await call(room, "/state?deviceId=s0");
  const item = room.state.students.s0.currentItem;
  assert.equal(item.source, "math-engine");
  // An assignment issued before 0.10.0 still resolves.
  const old = room.materializeAssignment(room.state.students.s0, { source: "preset", moduleId: "exponent.negative", moduleTitle: "Negative Exponents", band: "advanced", seed: 1234 });
  assert.equal(old.source, "math-engine");
  assert.match(old.engineId, /^mq-negative-exponents/);
});

test("default session content comes from the engine when no modules are chosen", async () => {
  const room = await launch([], 1);
  assert.ok(room.state.config.modules.length > 0);
  assert.ok(room.state.config.modules.every(m => m.source === "engine"));
});

test("catalog and preview endpoints expose the engine without answers leaking into student state", async () => {
  const { default: worker } = await import("../src/worker.js");
  const env = { TEACHER_PASSCODE: 'test-teacher-passcode', SESSIONS: { idFromName: () => ({}), get: () => ({}) } };
  const catalog = await (await worker.fetch(new Request("https://api.example/api/catalog"), env)).json();
  assert.equal(catalog.engine.version, ENGINE.version);
  assert.equal(catalog.modules.length, 1763);
  const preview = await (await worker.fetch(new Request("https://api.example/api/engine-preview", { method: "POST", headers: { "x-mathquest-teacher": "test-teacher-passcode" }, body: JSON.stringify({ ids: ["k-next", "bank:algebra-2-en:node:142", "nope"] }) }), env)).json();
  assert.equal(preview.items.length, 2);
  assert.ok(preview.items.every(i => i.prompt && i.answer));
});

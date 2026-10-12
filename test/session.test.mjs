import test from "node:test";
import assert from "node:assert/strict";
import { QuestSession, balancedGateLoads } from './authenticated-session.mjs';
import { VAULT7_SECRETS } from "../src/vault7.js";

class MemoryStorage {
  constructor() { this.data = new Map(); }
  async get(key) { return structuredClone(this.data.get(key)); }
  async put(key, value) { this.data.set(key, structuredClone(value)); }
}

const context = () => ({ storage: new MemoryStorage(), blockConcurrencyWhile: callback => callback() });

async function call(room, path, method = "GET", body) {
  const response = await room.fetch(new Request(`https://session${path}`, {
    method, headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  }));
  return { status: response.status, body: JSON.parse(await response.text()) };
}

const command = (room, body) => call(room, "/command", "POST", { commandId: crypto.randomUUID(), ...body });

async function solveCurrentGate(room, ids) {
  for (const id of ids) {
    await call(room, `/state?deviceId=${id}`);
    const answer = room.state.students[id].currentItem.answer;
    const result = await command(room, { type: "math.submit", deviceId: id, answer });
    assert.equal(result.body.feedback.correct, true);
  }
}

test("question pools allocate exactly and evenly across stable gates", () => {
  assert.deepEqual(balancedGateLoads(10, 3), [4, 3, 3]);
  assert.deepEqual(balancedGateLoads(22, 5), [5, 5, 4, 4, 4]);
  assert.equal(balancedGateLoads(47, 4).reduce((a, b) => a + b, 0), 47);
});

test("launch requires a student, removes empty teams, and reports the active roster", async () => {
  const room = new QuestSession(context());
  await call(room, "/init", "POST", { code: "SOLO41", teacherKey: "teacher", config: {
    teamNames: ["Cipher", "Vector", "Specter"], gateCount: 3,
    modules: [{ id: "number.integer-operations", source: "preset", band: "intermediate", itemCount: 3 }]
  }});

  const rejected = await command(room, { type: "teacher.start", teacherKey: "teacher" });
  assert.equal(rejected.status, 400);
  assert.match(rejected.body.error, /At least one student/);

  const teacherState = (await call(room, "/state?teacherKey=teacher")).body;
  await command(room, { type: "student.join", deviceId: "solo", alias: "Solo", teamPin: teacherState.teams[0].pin });
  const launched = await command(room, { type: "teacher.start", teacherKey: "teacher" });

  assert.equal(launched.status, 200);
  assert.equal(launched.body.status, "active");
  assert.equal(launched.body.teams.length, 1);
  assert.equal(launched.body.teams[0].name, "Cipher");
  assert.deepEqual(launched.body.launchSummary, {
    studentCount: 1,
    activeTeamCount: 1,
    removedTeamCount: 2,
    removedTeamNames: ["Vector", "Specter"]
  });
  assert.deepEqual(Object.keys(room.state.teams), ["team-1"]);
  assert.equal(room.state.teams["team-1"].stage, "briefing");
});

test("launch retains every occupied team and locks the roster", async () => {
  const room = new QuestSession(context());
  await call(room, "/init", "POST", { code: "DUO041", teacherKey: "teacher", config: {
    teamNames: ["Cipher", "Vector"], gateCount: 3,
    modules: [{ id: "number.gcf", source: "preset", band: "beginner", itemCount: 3 }]
  }});
  const teams = (await call(room, "/state?teacherKey=teacher")).body.teams;
  await command(room, { type: "student.join", deviceId: "a", alias: "Alpha", teamPin: teams[0].pin });
  await command(room, { type: "student.join", deviceId: "b", alias: "Beta", teamPin: teams[1].pin });
  const launched = await command(room, { type: "teacher.start", teacherKey: "teacher" });

  assert.equal(launched.body.teams.length, 2);
  assert.equal(launched.body.launchSummary.removedTeamCount, 0);
  assert.ok(launched.body.teams.every(team => team.stage === "briefing"));
  const lateJoin = await command(room, { type: "student.join", deviceId: "late", alias: "Late", teamPin: teams[0].pin });
  assert.equal(lateJoin.status, 400);
  assert.match(lateJoin.body.error, /roster is locked/i);
});

test("teams receive different story-linked secrets and honor recent exclusions", async () => {
  assert.equal(VAULT7_SECRETS.length, 40);
  const excluded = VAULT7_SECRETS.slice(0, 18).map(record => record.id);
  const room = new QuestSession(context());
  await call(room, "/init", "POST", { code: "SECRET5", teacherKey: "teacher", config: {
    teamNames: ["Cipher", "Vector", "Specter"], gateCount: 3, excludedSecretIds: excluded,
    modules: [{ id: "number.gcf", source: "preset", band: "standard", itemCount: 3 }]
  }});
  const teams = (await call(room, "/state?teacherKey=teacher")).body.teams;
  for (let index = 0; index < teams.length; index += 1) {
    await command(room, { type: "student.join", deviceId: `s${index}`, alias: `Agent ${index}`, teamPin: teams[index].pin });
  }
  const launched = await command(room, { type: "teacher.start", teacherKey: "teacher" });
  const variants = launched.body.teams.map(team => team.secretVariantId);
  assert.equal(new Set(variants).size, 3);
  assert.ok(variants.every(id => !excluded.includes(id)));
  assert.ok(launched.body.teams.every(team => team.scene.title === "The Asterion breach"));
});

test("teacher difficulty changes only the next unissued engine question and stays private", async () => {
  const room = new QuestSession(context());
  await call(room, "/init", "POST", { code: "LEVEL5", teacherKey: "teacher", config: {
    teamNames: ["Cipher"], gateCount: 3,
    modules: [{ id: "number.integer-operations", source: "preset", band: "intermediate", itemCount: 6 }]
  }});
  const pin = (await call(room, "/state?teacherKey=teacher")).body.teams[0].pin;
  await command(room, { type: "student.join", deviceId: "student", alias: "Morgan", teamPin: pin });
  await command(room, { type: "teacher.start", teacherKey: "teacher" });
  await command(room, { type: "briefing.ready", deviceId: "student" });
  assert.equal(room.state.students.student.currentItem.assignedDifficulty, "standard");
  assert.equal(room.state.students.student.currentItem.source, "math-engine");
  const currentId = room.state.students.student.currentItem.id;
  await command(room, { type: "teacher.setDifficulty", teacherKey: "teacher", studentId: "student", policy: "challenge" });
  assert.equal(room.state.students.student.currentItem.id, currentId);
  const answer = room.state.students.student.currentItem.answer;
  await command(room, { type: "math.submit", deviceId: "student", answer });
  assert.equal(room.state.students.student.currentItem.assignedDifficulty, "challenge");
  const studentState = (await call(room, "/state?deviceId=student")).body;
  assert.equal(studentState.teams[0].members[0].difficultyPolicy, undefined);
  const teacherState = (await call(room, "/state?teacherKey=teacher")).body;
  assert.equal(teacherState.teams[0].members[0].difficultyPolicy, "challenge");
});

test("full-class launch stores lightweight plans and generates questions on demand", async () => {
  const room = new QuestSession(context());
  const moduleIds = [
    "number.integer-operations", "number.gcf", "number.lcm", "number.absolute-value",
    "number.order-of-operations", "number.part-of-whole", "data.mean-missing",
    "algebra.one-step", "algebra.two-step", "fraction.simplify", "number.fdp-conversion",
    "probability.simple", "ratio.unit-rate", "ratio.proportion", "percent.change",
    "exponent.negative", "number.scientific-notation"
  ];
  await call(room, "/init", "POST", { code: "CLASS42", teacherKey: "teacher", config: {
    teamNames: ["Cipher", "Vector"], gateCount: 5,
    modules: moduleIds.map(id => ({ id, source: "preset", band: "intermediate", itemCount: 1 }))
  }});
  const pin = (await call(room, "/state?teacherKey=teacher")).body.teams[0].pin;
  for (let index = 0; index < 23; index += 1) {
    await command(room, { type: "student.join", deviceId: `device-${index}`, alias: `Agent ${index + 1}`, teamPin: pin });
  }

  const launched = await command(room, { type: "teacher.start", teacherKey: "teacher" });
  assert.equal(launched.body.status, "active");
  assert.equal(launched.body.teams[0].stage, "briefing");
  assert.equal(room.state.students["device-0"].plan.length, 0);
  assert.equal(room.state.students["device-0"].currentItem, null);
  assert.ok(JSON.stringify(room.state.processed).length < 10_000);

  await command(room, { type: "briefing.ready", deviceId: "device-0" });
  assert.equal(room.state.students["device-0"].plan.length, 17);
  assert.equal(room.state.students["device-0"].plan[0].prompt, undefined);
});

test("two students complete briefing, mixed gates, choices, market, cipher, and ending", async () => {
  const room = new QuestSession(context());
  await call(room, "/init", "POST", { code: "ABC123", teacherKey: "teacher", config: {
    teamNames: ["Cipher", "Vector"], gateCount: 3,
    modules: [{ id: "number.integer-operations", source: "preset", band: "intermediate", itemCount: 3 }]
  }});
  const pin = (await call(room, "/state?teacherKey=teacher")).body.teams[0].pin;
  await command(room, { type: "student.join", deviceId: "a", alias: "Alpha", teamPin: pin });
  await command(room, { type: "student.join", deviceId: "b", alias: "Beta", teamPin: pin });
  await command(room, { type: "teacher.start", teacherKey: "teacher" });
  assert.equal(room.state.teams["team-1"].stage, "briefing");
  await command(room, { type: "briefing.ready", deviceId: "a" });
  await command(room, { type: "briefing.ready", deviceId: "b" });

  await solveCurrentGate(room, ["a", "b"]);
  assert.equal(room.state.teams["team-1"].stage, "decision");
  assert.equal(room.state.teams["team-1"].currency, 20);
  await command(room, { type: "decision.vote", deviceId: "a", choice: "shaft" });
  await command(room, { type: "decision.vote", deviceId: "b", choice: "shaft" });
  assert.deepEqual((await call(room, "/state?deviceId=a")).body.teams[0].voteTotals, { shaft: 2, corridor: 0 });
  await command(room, { type: "decision.resolve", deviceId: "a" });

  await solveCurrentGate(room, ["a", "b"]);
  assert.equal(room.state.teams["team-1"].stage, "market");
  assert.equal(room.state.teams["team-1"].currency, 40);
  for (const id of ["a", "b"]) {
    await command(room, { type: "market.select", deviceId: id, item: "cloak" });
    await command(room, { type: "market.ready", deviceId: id });
  }
  await command(room, { type: "market.buy", deviceId: "b", item: "cloak" });
  await command(room, { type: "market.continue", deviceId: "b" });
  assert.equal(room.state.teams["team-1"].stage, "gate");

  await solveCurrentGate(room, ["a", "b"]);
  assert.equal(room.state.teams["team-1"].stage, "code");
  const team = room.state.teams["team-1"];
  assert.equal(team.cipher.mappings.length, team.cipher.secret.length);
  assert.equal(new Set(team.cipher.mappings.map(mapping => mapping.studentId)).size, 2);
  const lead = room.members("team-1")[team.leadIndex % 2];
  const decoded = await command(room, { type: "code.submit", deviceId: lead.id, code: team.cipher.secret });
  assert.equal(decoded.body.teams[0].stage, "finale");
  await command(room, { type: "finale.vote", deviceId: "a", choice: "isolate" });
  await command(room, { type: "finale.vote", deviceId: "b", choice: "destroy" });
  const finaleState = (await call(room, "/state?deviceId=a")).body.teams[0];
  assert.deepEqual(finaleState.finalVoteTotals, { isolate: 1, destroy: 1, release: 0, copy: 0 });
  const victory = await command(room, { type: "finale.resolve", deviceId: lead.id });
  assert.equal(victory.body.teams[0].stage, "extraction");
  assert.equal(victory.body.teams[0].extraction.rosterCount, 2);
  for(const deviceId of ['a','b']) {
    await command(room,{type:'extraction.start',deviceId,mapRevision:'vault7-stealth-3'});
    const ended=await command(room,{type:'extraction.complete',deviceId,mapRevision:'vault7-stealth-3',checkpoint:'C',activeElapsedMs:30000,detections:0,integrityRemaining:3,outcome:'extracted'});
    assert.equal(ended.status,200);
  }
  assert.equal(room.state.teams['team-1'].stage,'victory');
  assert.equal(victory.body.teams[0].finalAction, room.state.teams["team-1"].finalVotes[lead.id]);
  assert.equal(victory.body.teams[0].decodedSecret, team.cipher.secret);
  assert.equal(room.state.attempts.length, 6);
});

test("custom questions mix with presets and undersized sessions are rejected", async () => {
  const rejected = new QuestSession(context());
  const bad = await call(rejected, "/init", "POST", { code: "SMALL1", teacherKey: "t", config: {
    gateCount: 5, modules: [{ title: "Tiny", source: "custom", items: [{ prompt: "2+2", answerType: "integer", answer: "4" }] }]
  }});
  assert.equal(bad.status, 400);

  const room = new QuestSession(context());
  await call(room, "/init", "POST", { code: "MIX123", teacherKey: "t", config: {
    gateCount: 3,
    modules: [
      { id: "number.gcf", source: "preset", band: "beginner", itemCount: 2 },
      { title: "Teacher Set", source: "custom", items: [
        { prompt: "Half of 12?", answerType: "integer", answer: "6" },
        { prompt: "Simplify 2/4.", answerType: "fraction", answer: "1/2" }
      ] }
    ]
  }});
  const pin = (await call(room, "/state?teacherKey=t")).body.teams[0].pin;
  await command(room, { type: "student.join", deviceId: "s", alias: "Solo", teamPin: pin });
  await command(room, { type: "teacher.start", teacherKey: "t" });
  await command(room, { type: "briefing.ready", deviceId: "s" });
  assert.equal(room.state.students.s.plan.length, 4);
  assert.deepEqual(room.state.config.gateLoads, [2, 1, 1]);
  assert.deepEqual(new Set(room.state.students.s.plan.map(item => item.moduleTitle)), new Set(["Greatest Common Factor", "Teacher Set"]));
});

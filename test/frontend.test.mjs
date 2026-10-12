import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const qrVendor = await readFile(new URL("../public/qrcode.js", import.meta.url), "utf8");

test("bundled QR generator exposes the matrix API used by the teacher dashboard", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(qrVendor, sandbox);
  const qr = new sandbox.window.QRCode(-1, sandbox.window.QRErrorCorrectLevel.M);
  qr.addData("https://example.net/?session=ABC123");
  qr.make();
  assert.ok(qr.getModuleCount() >= 21);
  assert.equal(typeof qr.isDark(0, 0), "boolean");
});

test("join polling does not steal focus from alias or team-code fields", () => {
  assert.match(source, /focusedJoinField/);
  assert.match(source, /#alias, #pin/);
  assert.match(source, /if \(changed && !focusedJoinField\) render\(\)/);
});

test("teacher builder exposes cartridge, discipline, module, import, and balanced allocation controls", () => {
  assert.match(source, /Game Select/);
  assert.match(source, /Academic Content/);
  assert.match(source, /id="discipline"/);
  assert.match(source, /Science · coming later/);
  assert.match(source, /accept="\.csv,\.json/);
  assert.match(source, /image_url/);
  assert.match(source, /Automatic Allocation/);
  assert.match(source, /No gate belongs to one skill/);
  assert.match(source, /Apply count to selected/);
  assert.match(source, /Reset question counts/);
  // 0.10.0: modules come from the Math Engine picker; per-module difficulty bands were retired (spec D4).
  assert.match(source, /id="math-level"/);
  assert.match(source, /id="math-search"/);
  assert.match(source, /data-preview-math/);
  assert.match(source, /MathQuest sets \(former modules\)/);
  assert.doesNotMatch(source, /Apply difficulty to selected/);
});

test("teacher launch controls survive polling and expose progress and errors", () => {
  assert.match(source, /data-teacher-command="start"/);
  assert.match(source, /app\.addEventListener\("click", handleDelegatedTeacherControl\)/);
  assert.match(source, /if \(busy\) return;/);
  assert.match(source, /Launching briefing/);
  assert.match(source, /empty team.*will be removed/i);
  assert.match(source, /At least one agent must join/);
  assert.match(source, /AbortController/);
  assert.match(source, /took too long to respond/);
  assert.doesNotMatch(source, /QRCode\.toCanvas/);
  assert.match(source, /new window\.QRCode/);
  assert.match(source, /qr\.isDark/);
});

test("student interface uses math-native controls and unmistakable team cues", async () => {
  assert.match(source, /data-answer-key/);
  assert.match(source, /Numerator/);
  assert.match(source, /Coefficient/);
  assert.match(source, /YOU ARE THE EVENT LEAD/);
  assert.match(source, /✓ YOUR VOTE/);
  assert.match(await readFile(new URL("../public/equipment-ui.js",import.meta.url),"utf8"), /My plan is ready/);
  assert.match(source, /SECRET MESSAGE/);
  assert.match(source, /Isolate Asterion/);
  assert.match(source, /data-finale-vote/);
  assert.match(source, /sceneBlock/);
  assert.match(source, /data-art-slot/);
  assert.match(source, /question-media/);
});

test("teacher can privately adjust each student's next unissued preset question", () => {
  assert.match(source, /data-student-difficulty/);
  assert.match(source, /Foundation/);
  assert.match(source, /Challenge/);
  assert.match(source, /next unissued preset question/i);
  assert.match(source, /teacher\.setDifficulty/);
});

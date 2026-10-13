import test from "node:test";
import assert from "node:assert/strict";
import { checkItem, normalizeCustomItem } from "../src/math.js";
import { LEGACY_MODULE_MAP, LEGACY_MODULE_TITLES, engineQuestion, engineIdsFor, ENGINE } from "../src/engine-questions.js";
import { checkAnswerFor } from "../src/answer-check.js";
import { provideQuestion } from "../src/question-provider.js";
import { readFileSync, readdirSync } from "node:fs";

test("all 25 retired modules map to Math Engine items that are deterministic and self-checking", () => {
  assert.equal(Object.keys(LEGACY_MODULE_MAP).length, 25);
  assert.deepEqual(Object.keys(LEGACY_MODULE_TITLES).sort(), Object.keys(LEGACY_MODULE_MAP).sort());
  for (const [moduleId, ids] of Object.entries(LEGACY_MODULE_MAP)) {
    assert.ok(ids.length, moduleId);
    for (const policy of ["session", "foundation", "standard", "challenge"]) {
      for (let seed = 1; seed <= 25; seed += 1) {
        const assignment = { source: "preset", moduleId, moduleTitle: LEGACY_MODULE_TITLES[moduleId], seed };
        const first = provideQuestion({ modules: [], student: { difficultyPolicy: policy }, assignment });
        const second = provideQuestion({ modules: [], student: { difficultyPolicy: policy }, assignment });
        assert.deepEqual(first, second);
        assert.equal(first.source, "math-engine");
        assert.equal(first.engineVersion, ENGINE.version);
        assert.equal(checkAnswerFor(first, first.answer).correct, true, `${moduleId} ${policy} should accept its own answer`);
        assert.equal(checkAnswerFor(first, first.answer + "7").correct, false, `${moduleId} rejects a wrong answer`);
      }
    }
  }
});

test("no MathQuest source generates mathematics outside the Math Engine", () => {
  const files = ["src/math.js", "src/question-provider.js", "src/worker.js", "src/cartridges/journey/server.js"];
  for (const file of files) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /generatePresetItem|expandedQuestion|PRESET_MODULES|math-v06/, file);
  }
  assert.ok(!readdirSync(new URL("../src/", import.meta.url)).includes("math-v06.js"));
});

test("engine questions carry display markup, answer input and provenance", () => {
  const choice = engineQuestion("mq-properties", 3);
  assert.equal(choice.answerType, "choice");
  assert.ok(choice.options.includes(choice.answer));
  assert.equal(checkAnswerFor(choice, choice.answer.toUpperCase()).correct, true);
  assert.equal(checkAnswerFor(choice, "Not a choice").valid, false);
  const keys = engineQuestion("g4-divide", 5) || engineQuestion("bank:course-87-en:item:SN870001", 5);
  assert.ok(["engine-keys", "number"].includes(keys.answerType));
  const text = engineQuestion("bank:course-87-en:authored:MCADA-18.1", 2);
  assert.equal(text.answerType, "engine-text");
  assert.equal(checkAnswerFor(text, text.answer).correct, true);
  const fraction = engineQuestion("g4-equivalent", 4);
  assert.equal(fraction.answerType, "fraction");
  assert.match(fraction.promptMarkup, /engine|<span|Reduce/);
});

test("Foundation and Challenge use the engine's easier and harder links", () => {
  const base = { source: "engine", moduleId: "mq-negative-exponents", seed: 9 };
  const modules = [{ id: "mq-negative-exponents", title: "Negative exponents", source: "engine", engineIds: ["mq-negative-exponents"] }];
  assert.equal(provideQuestion({ modules, student: { difficultyPolicy: "foundation" }, assignment: base }).engineId, "mq-negative-exponents-basic");
  assert.equal(provideQuestion({ modules, student: { difficultyPolicy: "session" }, assignment: base }).engineId, "mq-negative-exponents");
  assert.equal(provideQuestion({ modules, student: { difficultyPolicy: "challenge" }, assignment: base }).engineId, "mq-negative-exponents");
  assert.equal(provideQuestion({ modules, student: {}, assignment: { ...base, difficultyOverride: "foundation" } }).assignedDifficulty, "foundation");
  assert.deepEqual(engineIdsFor({ id: "number.gcf" }), LEGACY_MODULE_MAP["number.gcf"]);
});

test("math checker supports every v0.4 answer contract", () => {

  const cases = [
    ["integer", "-7", "−7"], ["number", "2.5", "2.50"], ["decimal", "0.25", ".25"],
    ["fraction", "1/2", "1/2"], ["percent", "25", "25%"], ["ratio", "2:3", "4:6"],
    ["scientific", "3.2e5", "3.2e5"], ["choice", "Rhombus", "rhombus"]
  ];
  for (const [answerType, answer, submitted] of cases) assert.equal(checkItem({ answerType, answer }, submitted).correct, true, answerType);
});

test("teacher questions are validated before a session begins", () => {
  const valid = normalizeCustomItem({ prompt: "Simplify 6/8.", answer_type: "fraction", answer: "3/4" }, 0, "My Fractions");
  assert.equal(valid.moduleTitle, "My Fractions");
  assert.equal(checkItem(valid, "6/8").correct, false);
  assert.throws(() => normalizeCustomItem({ prompt: "Question", answer_type: "graph", answer: "x" }), /unsupported answer type/i);
  assert.throws(() => normalizeCustomItem({ prompt: "Question", answer_type: "choice", answer: "A" }), /pipe-separated choices/i);
});


test("teacher questions can include a validated HTTPS image", () => {
  const item = normalizeCustomItem({
    prompt: "Use the diagram.", answer_type: "integer", answer: "7",
    image_url: "https://example.com/diagram.png", image_alt: "Seven marked tiles", image_caption: "Count the marked tiles."
  }, 0, "Visual Set");
  assert.equal(item.media.src, "https://example.com/diagram.png");
  assert.equal(item.media.alt, "Seven marked tiles");
  assert.throws(() => normalizeCustomItem({ prompt: "Unsafe", answer: "1", image_url: "javascript:alert(1)" }), /HTTPS/);
});

test("simplification items reject an equivalent unreduced fraction with the simplest-form message", () => {
  const item = engineQuestion("g4-equivalent", 27);
  const [numerator, denominator] = item.answer.split("/").map(Number);
  const doubled = checkAnswerFor(item, `${numerator * 2}/${denominator * 2}`);
  assert.equal(doubled.correct, false);
  assert.equal(doubled.reason, "equivalent-unsimplified");
  assert.equal(checkAnswerFor(item, item.answer).correct, true);
});

test('new answer forms grade exact rational values and reject unsafe/ambiguous formats',()=>{
  assert.equal(checkItem({answerType:'mixed',answer:'-2 1/3'},'-2 1/3').correct,true);
  assert.equal(checkItem({answerType:'mixed',answer:'-2 1/3'},'-2 2/6').correct,false);
  assert.equal(checkItem({answerType:'mixed',answer:'-2 1/3'},'-2 4/3').valid,false);
  assert.equal(checkItem({answerType:'fraction',answer:'1/3'},'3333333333333333/9999999999999999').valid,false);
  assert.equal(checkItem({answerType:'number',answer:'0.00000000001'},'0').correct,false);
  assert.equal(checkItem({answerType:'money',answer:'19.90'},'19.9').correct,true);
  assert.equal(checkItem({answerType:'unit',answer:'2.54'},'2.54').correct,true);
  assert.equal(checkItem({answerType:'scientific',answer:'3e-4'},'30e-5').valid,false);
  assert.equal(checkItem({answerType:'scientific',answer:'1e9999'},'1e9999').valid,false);
});



test('imported unit/mixed/choice items retain assessment tags and reject missing option answers',()=>{
  const q=normalizeCustomItem({prompt:'A conversion',answerType:'unit',answer:'2.54',unit:'cm',standards:['custom-target'],DOK:2,subskillId:'length'});
  assert.equal(q.unit,'cm');assert.equal(q.DOK,2);assert.deepEqual(q.standards,['custom-target']);assert.equal(q.subskillId,'length');
  assert.throws(()=>normalizeCustomItem({prompt:'Pick',answerType:'choice',answer:'C',options:['A','B']}),/match one choice/);
});

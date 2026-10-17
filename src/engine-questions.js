// MathQuest ↔ Math Engine adapter (MathQuest 0.10.0, MATH-ENGINE host-integration-v0.1).
// Every code-generated question and every check of a code-generated answer goes through the
// Math Engine. MathQuest only turns engine items into its item records and back.
import Engine from './vendor/math-engine-practice.js';
import { LEGACY_MODULE_MAP } from './vendor/mathquest-module-map.js';
import { hashSeed } from './math.js';

export const ENGINE = Object.freeze({ version: Engine.version, contentHash: Engine.contentHash });
export { LEGACY_MODULE_MAP };
// Titles of the retired MathQuest modules, for rooms and saved setups created before 0.10.0.
export const LEGACY_MODULE_TITLES = Object.freeze({"number.integer-operations": "Integer Operations", "number.gcf": "Greatest Common Factor", "number.lcm": "Least Common Multiple", "number.absolute-value": "Absolute Value", "number.order-of-operations": "Integer Order of Operations", "number.part-of-whole": "Fraction or Percent of a Whole", "data.mean-missing": "Mean and Missing Average", "algebra.one-step": "One-Step Equations", "algebra.two-step": "Equations with Rational Numbers", "fraction.simplify": "Simplifying Fractions", "number.fdp-conversion": "Fraction Decimal Percent Conversion", "probability.simple": "Simple Probability", "ratio.unit-rate": "Unit Rate", "ratio.proportion": "Ratio and Proportion", "percent.change": "Percent Change", "exponent.negative": "Negative Exponents", "number.scientific-notation": "Scientific Notation", "word.multistep": "Mixed Multi-Step Word Problems", "algebra.word-problems": "Algebraic Word Problems", "exponent.scientific-operations": "Scientific Notation Operations", "measurement.conversions": "Unit Multiplier Conversions", "number.properties": "Properties of Operations", "geometry.polygons": "Quadrilaterals and Polygons", "percent.tax-tip": "Sales Tax and Tip", "number.real-family": "Real Number Classification"});

export function engineEntry(id) { return Engine.find(id); }

// 0.15.0: Engine 0.37.0+ keeps questions that need more than one answer out of games
// (Engine.find returns null; Engine.gameExclusion names the reason). A retired module whose
// mapped items are all excluded runs on the same lessons' single-answer siblings instead.
export const LEGACY_REPLACEMENTS = Object.freeze({
  'number.scientific-notation': ['bank:course-87-en:authored:MCADA-51.2', 'bank:course-87-en:authored:MCADA-57.3']
});
const playable = ids => ids.filter(id => Engine.find(id));

/** Engine ids behind a configured module: an engine id, or a retired MathQuest module id. Only ids games may use. */
export function engineIdsFor(module) {
  if (Array.isArray(module?.engineIds) && module.engineIds.length) { const ids = playable(module.engineIds); if (ids.length) return ids; }
  if (LEGACY_MODULE_MAP[module?.id]) { const ids = playable(LEGACY_MODULE_MAP[module.id]); return ids.length ? ids : playable(LEGACY_REPLACEMENTS[module.id] || []); }
  return Engine.find(module?.id) ? [module.id] : [];
}

/** Teacher-facing title for a configured engine module. */
export function engineTitle(id) {
  const e = Engine.find(id);
  if (!e) return null;
  const where = e.layer === 'skill' ? `Grade ${e.gradeLabel}` : e.layer === 'bank' ? e.course : 'Math Engine';
  return `${e.name} · ${where}`;
}

/** D4: Foundation/Challenge use the engine's reviewed easier/harder links; otherwise the selected item. */
export function adjustForPolicy(id, policy) {
  if (policy === 'foundation') return { id: Engine.related(id, 'easier')[0] || id, linked: Engine.related(id, 'easier').length > 0 };
  if (policy === 'challenge') return { id: Engine.related(id, 'harder')[0] || id, linked: Engine.related(id, 'harder').length > 0 };
  return { id, linked: true };
}

// U-18 (0.15.0): every Engine keypad question uses the Engine's universal answer pad ('engine-pad').
// Choice items keep answer buttons; words, letters and other typed forms keep a text box.
function answerTypeFor(item) {
  if (item.inputMode === 'choice') return 'choice';
  if (item.inputMode === 'keyboard') return 'engine-text';
  return 'engine-pad';
}

/** Build a MathQuest item record from an engine item. */
export function engineQuestion(engineId, seed, { moduleId, moduleTitle, policy = 'session', requestedId = engineId, linked = true, index = 0 } = {}) {
  const entry = Engine.find(engineId);
  if (!entry) return null;
  const item = Engine.generate(engineId, { seed: typeof seed === 'number' ? seed : String(seed), index });
  const answerType = answerTypeFor(item);
  return {
    id: `${engineId}-${hashSeed(`${seed}:${engineId}`)}`,
    moduleId: moduleId || engineId,
    moduleTitle: moduleTitle || engineTitle(engineId),
    prompt: item.prompt,
    promptMarkup: item.html,
    answerType,
    answer: item.answerText,
    options: item.choices || undefined,
    solution: item.solution || '',
    source: 'math-engine',
    engineId,
    engineRequestedId: requestedId,
    engineVersion: Engine.version,
    engineItem: item,
    disciplineId: 'mathematics',
    courseBankId: entry.bankId || (entry.layer === 'skill' ? `k7-grade-${entry.gradeLabel}` : 'math-engine'),
    subskillId: engineId,
    standards: entry.standard ? [entry.standard] : [],
    DOK: 1,
    assignedDifficulty: policy === 'session' ? 'standard' : policy,
    difficultyLinkUsed: policy === 'foundation' || policy === 'challenge' ? linked : null
  };
}

/**
 * Answer check for any MathQuest item: engine items through Engine.evaluate,
 * teacher-authored custom items through the existing parser (not code-generated mathematics).
 * Returns the checkItem shape: { valid, correct, error, normalized, reason }.
 */
export function checkEngineAnswer(record, input) {
  // Engine.evaluate reads pad text (− ÷ √ ×) itself (U-18).
  let text = String(input ?? '').trim().replace(/−/g, '-');
  // MathQuest's fraction widget sends "n/1" in Integer mode.
  const whole = text.match(/^(-?\d+)\s*\/\s*1$/);
  if (whole) text = whole[1];
  const r = Engine.evaluate(record.engineItem, text);
  return { valid: r.valid, correct: r.correct, error: r.correct ? undefined : r.message, normalized: r.normalized, reason: r.reason };
}

export function engineCatalogSummary() {
  return Engine.catalog.map(e => ({ id: e.id, title: e.name, layer: e.layer, grade: e.gradeLabel, bankId: e.bankId, lesson: e.lessonLabel || null }));
}

export const PREVIEW_VARIANT_MAX = 9999;
/** Teacher preview. Variant 0 is the original sample; each later variant is the Engine's next index for the same seed (0.14.1). */
export function enginePreview(ids, variant = 0) {
  const v = Number.isSafeInteger(variant) && variant >= 0 ? Math.min(variant, PREVIEW_VARIANT_MAX) : 0;
  return ids.slice(0, 20).filter(id => Engine.find(id)).map(id => {
    const q = engineQuestion(id, `preview:${id}`, { index: v });
    return { id, title: engineTitle(id), variant: v, prompt: q.prompt, promptMarkup: q.promptMarkup, answer: q.answer, answerType: q.answerType };
  });
}

// MathQuest answer parsing for teacher-authored (imported) questions, plus the seed hash.
// Since MathQuest 0.10.0 every code-generated question comes from the Math Engine
// (src/engine-questions.js). The former preset generators (25 modules) were retired;
// their constructs map to engine items (MATH-ENGINE docs/host-maps/mathquest-modules-v0.1.json).

export function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };

function makeItem(moduleId, title, prompt, answerType, answer, extra = {}) {
  return { moduleId, moduleTitle: title, prompt, answerType, answer: String(answer), ...extra };
}

function parseNumber(value, integerOnly = false) {
  const text = String(value ?? "").trim().replace(/−/g, "-").replace(/%$/, "");
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) return { valid: false, error: "Enter one numeric answer." };
  const number = Number(text);
  if (!Number.isFinite(number) || (integerOnly && !Number.isSafeInteger(number))) return { valid: false, error: integerOnly ? "Enter one whole-number answer." : "Enter a valid number." };
  return { valid: true, value: number, normalized: String(number) };
}

function parseFraction(value) {
  const text = String(value ?? "").trim().replace(/−/g, "-");
  const match = text.match(/^(-?\d+)\s*\/\s*(-?\d+)$/) || (/^-?\d+$/.test(text) ? [text,text,'1'] : null);
  if (!match || Number(match[2]) === 0 || !match.slice(1).every(n=>Number.isSafeInteger(Number(n)))) return { valid: false, error: "Enter a numerator and a nonzero denominator." };
  let numerator = Number(match[1]), denominator = Number(match[2]);
  if (denominator < 0) { numerator *= -1; denominator *= -1; }
  const divisor = gcd(numerator, denominator);
  return { valid: true, value: numerator / denominator, normalized: `${numerator / divisor}/${denominator / divisor}`, reduced: divisor === 1 };
}

function parseMixed(value) {
  const m=String(value??'').trim().replace(/−/g,'-').match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/);
  if(!m || !m.slice(2).every(n=>Number.isSafeInteger(Number(n))) || +m[4]===0 || +m[3]>=+m[4]) return {valid:false,error:'Enter a whole number and a proper fraction with a positive denominator.'};
  const n=(+m[2]*+m[4]+ +m[3])*(m[1]?-1:1);
  if(!Number.isSafeInteger(n))return {valid:false,error:'The mixed number exceeds the supported exact integer range.'};
  return {...parseFraction(`${n}/${m[4]}`), reduced:gcd(+m[3],+m[4])===1, mixed:true};
}

function parseRatio(value) {
  const match = String(value ?? "").trim().match(/^(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)$/);
  if (!match || Number(match[2]) === 0) return { valid: false, error: "Enter both parts of the ratio." };
  return { valid: true, value: Number(match[1]) / Number(match[2]), normalized: `${Number(match[1])}:${Number(match[2])}` };
}

function parseScientific(value) {
  const match = String(value ?? "").trim().toLowerCase().match(/^(-?(?:\d+\.?\d*|\.\d+))e(-?\d+)$/);
  if (!match) return { valid: false, error: "Enter a coefficient and an integer exponent." };
  const coefficient = Number(match[1]), exponent = Number(match[2]);
  if (Math.abs(coefficient) < 1 || Math.abs(coefficient) >= 10) return { valid: false, error: "The coefficient must be at least 1 and less than 10 in absolute value." };
  if(!Number.isSafeInteger(exponent)||!Number.isFinite(coefficient * 10 ** exponent)||coefficient * 10 ** exponent===0)return {valid:false,error:"Use a finite, nonzero scientific-notation value."};
  return { valid: true, value: coefficient * 10 ** exponent, normalized: `${coefficient}e${exponent}`, coefficient, exponent };
}

function parseByType(value, type) {
  if (type === "integer") return parseNumber(value, true);
  if (["number", "decimal", "percent", "money", "unit"].includes(type)) return parseNumber(value, false);
  if (type === "fraction") return parseFraction(value);
  if (type === "mixed") return parseMixed(value);
  if (type === "ratio") return parseRatio(value);
  if (type === "scientific") return parseScientific(value);
  if (type === "choice") {
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized ? { valid: true, value: normalized, normalized } : { valid: false, error: "Choose one answer." };
  }
  return { valid: false, error: "This question uses an unsupported answer type." };
}

export function checkItem(itemRecord, input) {
  const parsed = parseByType(input, itemRecord.answerType);
  if (!parsed.valid) return parsed;
  const accepted = Array.isArray(itemRecord.acceptedAnswers) && itemRecord.acceptedAnswers.length ? itemRecord.acceptedAnswers : [itemRecord.answer];
  const correct = accepted.some(expected => {
    const target = parseByType(expected, itemRecord.answerType);
    if (!target.valid) return false;
    if (["fraction","mixed"].includes(itemRecord.answerType)) return parsed.normalized === target.normalized;
    if (itemRecord.answerType === "choice") return parsed.normalized === target.normalized;
    if (itemRecord.answerType === "scientific") return parsed.coefficient === target.coefficient && parsed.exponent === target.exponent;
    // Relative comparison: tiny scientific/numeric values must not all grade as zero.
    return parsed.value === target.value || Math.abs(parsed.value-target.value) <= Number.EPSILON*4*Math.max(Math.abs(parsed.value),Math.abs(target.value));
  });
  const fraction=['fraction','mixed'].includes(itemRecord.answerType);
  const explicit=itemRecord.fractionPolicy==='specified-denominator' && Number.isSafeInteger(itemRecord.requiredDenominator) && itemRecord.requiredDenominator>0 && !!itemRecord.representationInstruction;
  if(fraction&&explicit){
    const denominator=String(input).trim().match(/\/\s*(\d+)$/)?.[1];
    if(Number(denominator)!==itemRecord.requiredDenominator)return {...parsed,correct:false,formError:true,error:itemRecord.representationInstruction};
  } else if(fraction&&!parsed.reduced){
    return {...parsed,correct:false,formError:true,reason:correct?'equivalent-unsimplified':'wrong-value',error:correct?'Your value is correct, but the fraction is not in simplest form. Simplify it and try again.':'Not yet. Check the value and give your answer in simplest form.'};
  }
  return { ...parsed, correct };
}

export function normalizeCustomItem(raw, index = 0, moduleTitle = "Teacher Module") {
  const answerType = String(raw.answerType || raw.answer_type || "number").trim().toLowerCase();
  const supported = ["integer", "number", "decimal", "fraction", "mixed", "percent", "money", "unit", "ratio", "scientific", "choice"];
  if (!supported.includes(answerType)) throw new Error(`Question ${index + 1} uses unsupported answer type “${answerType}”.`);
  const prompt = String(raw.prompt || "").trim();
  const answer = String(raw.answer ?? "").trim();
  if (!prompt || !answer) throw new Error(`Question ${index + 1} needs both a prompt and an answer.`);
  const acceptedAnswers = Array.isArray(raw.acceptedAnswers) ? raw.acceptedAnswers.map(String) : String(raw.accepted_answers || "").split("|").map(value => value.trim()).filter(Boolean);
  const options = Array.isArray(raw.options) ? raw.options.map(String) : String(raw.options || "").split("|").map(value => value.trim()).filter(Boolean);
  if (answerType === "choice" && !options.length) throw new Error(`Question ${index + 1} needs pipe-separated choices.`);
  if(answerType==='choice'&&!options.some(v=>v.toLowerCase()===answer.toLowerCase())) throw new Error(`Question ${index+1}: the answer must match one choice.`);
  const mediaSource = String(raw.media?.src || raw.imageUrl || raw.image_url || "").trim();
  let media = null;
  if (mediaSource) {
    let parsed;
    try { parsed = new URL(mediaSource); } catch { throw new Error(`Question ${index + 1} has an invalid image URL.`); }
    if (parsed.protocol !== "https:") throw new Error(`Question ${index + 1} image must use an HTTPS URL.`);
    media = {
      type: "image",
      src: parsed.href.slice(0, 1000),
      alt: String(raw.media?.alt || raw.imageAlt || raw.image_alt || "Question image").trim().slice(0, 180),
      caption: String(raw.media?.caption || raw.imageCaption || raw.image_caption || "").trim().slice(0, 240)
    };
  }
  const record = makeItem(`custom.${hashSeed(moduleTitle)}`, moduleTitle, prompt, answerType, answer, {
    acceptedAnswers,
    options,
    hint: String(raw.hint || "").trim(),
    custom: true, disciplineId:String(raw.disciplineId||'mathematics'), courseBankId:String(raw.courseBankId||'prealgebra'), subskillId:String(raw.subskillId||'teacher-authored'), source:'teacher-import', standards:Array.isArray(raw.standards)?raw.standards.map(String):[], DOK:[1,2,3,4].includes(Number(raw.DOK))?Number(raw.DOK):1,
    unit:String(raw.unit||'').slice(0,40), currency:String(raw.currency||'$').slice(0,8), expectedForm:raw.expectedForm==='simplified'?'simplified':undefined,
    fractionPolicy:raw.fractionPolicy, requiredDenominator:raw.requiredDenominator, representationInstruction:String(raw.representationInstruction||'').slice(0,240),
    ...(media ? { media } : {})
  });
  if(raw.fractionPolicy && (raw.fractionPolicy!=='specified-denominator'||!Number.isSafeInteger(raw.requiredDenominator)||raw.requiredDenominator<1||!record.representationInstruction))throw new Error(`Question ${index+1}: a specified-denominator exception needs a positive integer requiredDenominator and visible representationInstruction.`);
  if (![answer,...acceptedAnswers].every(a=>checkItem({...record,acceptedAnswers:[a]},a).correct)) throw new Error(`Question ${index + 1}: keys must match the answer format and fractions must be reduced. For an explicit denominator task, supply its fractionPolicy, requiredDenominator and representationInstruction.`);
  return { ...record, id: `custom-${hashSeed(`${moduleTitle}:${index}:${prompt}`)}` };
}

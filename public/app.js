import {splitScene,instructionPanel} from './review-presentation.js?v=u11';
import {JourneyHost} from './games/journey/host.js?v=0.10.0';
let journeyHost=null;
import {CoastalHost} from './games/aerial-shooter/classroom-host.js?v=0.9.7';
import {IronbreakHost} from './games/shooter/host.js?v=ironbreak-0.2.0';
import {RescueHost} from './games/nightfall/rescue-host.js?v=0.9.7';
import {equipmentMarkup,bindEquipment} from './equipment-ui.js?v=0.9.7';
import { hostingFor, fetchApi } from './hosting.js?v=0.9.7';
import { CATALOG } from './catalog.js?v=0.9.7'; // retired MathQuest module titles only
import { ENGINE_VERSION, ENGINE_ROWS, ENGINE_COURSES, LEGACY_MODULE_MAP } from './engine-catalog.js?v=0.10.0';
import { StealthRuntime } from './stealth.js?v=0.9.7';
import { SceneAssets } from './vault7-assets.js?v=0.9.7';
import { TeacherAudio } from './teacher-audio.js?v=0.9.7';
import { CARTRIDGES, cartridgeFor } from './cartridges.js?v=0.9.7-jttw9';
import { expansionBody, bindExpansion } from './expansion-ui.js?v=0.9.7';
import { FinaleHost } from './finale-host.js?v=0.9.7';
import { CartridgeAudio } from './cartridge-audio.js?v=0.9.7';
import {bindTeamTools,teamToolsMarkup,teamProgressMarkup} from './engine/team-tools.js?v=0.9.7';
import {developerTools,extensionDialog} from './engine/teacher-tools.js?v=0.10.0';
import {forgetRoom,forgetExpiredRooms} from './privacy.js?v=0.9.7';
forgetExpiredRooms();
import {BRAND,presentationFor,setBrandContext,markMarkup,cartridgeCard} from './brand.js?v=0.10.0';
let setupCartridge='';
let finaleHost=null;
const app = document.querySelector("#app");
const hosting = hostingFor(location.href);
const params = new URLSearchParams(location.search);
const session = (params.get("session") || "").toUpperCase();
if(Number(localStorage.getItem(`mq-expiry-${session}`))&&Date.now()>=Number(localStorage.getItem(`mq-expiry-${session}`)))forgetRoom(session);
const teacherKey = params.has('student') ? '' : params.get("teacher") || localStorage.getItem(`mq-teacher-${session}`) || "";
if(teacherKey)localStorage.setItem(`mq-teacher-${session}`,teacherKey);
if(params.has('teacher')){params.delete('teacher');history.replaceState(null,'',location.pathname+'?'+params.toString());}
let deviceId = localStorage.getItem(`mq-device-${session}`) || "";
let sessionGone=false;
let alias = localStorage.getItem(`mq-alias-${session}`) || "";
let state = null;
let notice = null;
let busy = false;
let draft = { main: "", whole: "", numerator: "", denominator: "", left: "", right: "", coefficient: "", exponent: "", choice: "" };
let activeField = "main";
let customModules = [];
let setupTeams = "Cipher, Vector";
let setupGates = 3;
let setupBulkCount = 3;
let setupDiscipline = "mathematics";
let activeCommand = "";

const selectedDefaults = { 'number.integer-operations':4, 'number.gcf':2, 'number.lcm':2, 'fraction.simplify':3, 'number.fdp-conversion':3 };
// Math content comes from the Math Engine (K–Algebra 2). Retired MathQuest module names remain as
// ready-made sets that expand to their mapped engine skills.
const LEGACY_TITLES = Object.fromEntries(CATALOG.map(({id,title}) => [id,title]));
const ENGINE_INDEX = new Map(ENGINE_ROWS.map(([id,name,layer,grade,bankId,lesson,order]) => [id,{id,name,layer,grade,bankId,lesson,order}]));
const COURSE_NAMES = Object.fromEntries(ENGINE_COURSES.map(c => [c.bankId,c.course]));
let selectedMath = Object.entries(selectedDefaults).map(([id,count]) => ({id,itemCount:count,defaultItemCount:count}));
let pickerLevel = 'mathquest', pickerQuery = '', pickerLimit = 40, mathPreview = null;
const mathTitle = id => LEGACY_TITLES[id] || ENGINE_INDEX.get(id)?.name || id;
function mathWhere(id) {
  if (LEGACY_MODULE_MAP[id]) return `MathQuest set · ${LEGACY_MODULE_MAP[id].length} engine skill${LEGACY_MODULE_MAP[id].length===1?'':'s'}`;
  const e = ENGINE_INDEX.get(id); if (!e) return '';
  return e.layer === 'skill' ? `Grade ${e.grade}` : e.layer === 'bank' ? `${COURSE_NAMES[e.bankId]||'Course'}${e.lesson?` · ${e.lesson}`:''}` : 'Math Engine extra';
}
function pickerRows() {
  const q = pickerQuery.trim().toLowerCase();
  let rows = pickerLevel === 'mathquest' ? Object.keys(LEGACY_MODULE_MAP).map(id => ({id,name:LEGACY_TITLES[id]||id,lesson:''}))
    : [...ENGINE_INDEX.values()].filter(e => pickerLevel === 'all' || (pickerLevel.startsWith('grade:') ? e.layer === 'skill' && e.grade === pickerLevel.slice(6) : pickerLevel.startsWith('bank:') ? e.bankId === pickerLevel.slice(5) : pickerLevel === 'extras' && e.layer === 'continuity'));
  if (q) rows = rows.filter(r => `${r.name} ${r.lesson||''}`.toLowerCase().includes(q));
  // Course items in teaching order (lesson order from the engine); others keep catalog order.
  if (pickerLevel.startsWith('bank:')) rows = rows.map((r,i) => [r,i]).sort((a,b) => (a[0].order??1e9)-(b[0].order??1e9) || a[1]-b[1]).map(x => x[0]);
  return rows;
}
let extractionRuntime = null;
const teacherAudio = new TeacherAudio();
const cartridgeAudio = new CartridgeAudio();


const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const endpoint = suffix => hosting.api(`sessions/${encodeURIComponent(session)}/${suffix}`);
const currentTeam = () => state?.teams?.[0];
const gateLabel = item => item.stage === "gate" ? `Gate ${item.gateIndex + 1} of ${state.config.gateCount} · ${item.gateName}` : presentationFor(state?.cartridge?.id)?.stageLabels?.[item.stage] || ({ lobby:"Waiting in lobby", briefing:"Mission Briefing", decision:"Route Decision", market:"Resource Market", code:"Secret Message", finale:"Final Decision", minigame:"Field Mission", extraction:"Extraction", victory:"Mission Complete" })[item.stage] || item.stage;

async function parseResponse(response) {
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); }
  catch { throw new Error(`The server returned an invalid response (HTTP ${response.status}).`); }
  if (!response.ok || result.error) throw new Error(result.error || `HTTP ${response.status}`);
  return result;
}

async function command(type, extra = {}, options = {}) {
  if (busy) return;
  busy = true;
  activeCommand = type;
  let reconcileAfterTimeout = false;
  if (options.pendingMessage) {
    notice = { pending: true, message: options.pendingMessage };
    render();
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetchApi(endpoint("command"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, commandId: uid(), deviceId, teacherKey, ...extra }),
      signal: controller.signal
    });
    state = await parseResponse(response);
    notice = state.feedback || (options.successMessage ? { correct: true, message: options.successMessage } : null);
    if(type!=="math.submit"||state.feedback?.correct)resetDraft();
  } catch (error) {
    reconcileAfterTimeout = error.name === "AbortError";
    notice = { correct: false, message: reconcileAfterTimeout
      ? "The server took too long to respond. Checking whether the command completed…"
      : error.message };
  } finally {
    clearTimeout(timeout);
    busy = false;
    activeCommand = "";
    render();
  }
  if (reconcileAfterTimeout) await poll();
}

function resetDraft() {
  draft = { main: "", whole: "", numerator: "", denominator: "", left: "", right: "", coefficient: "", exponent: "", choice: "" };
  activeField = "main";
}

function shell(content, compact = false) {
  return `<div class="wrap ${compact ? "student" : ""}">
    <header class="top"><div><div class="product">${BRAND.credit}</div><div class="brand">${BRAND.name}</div>${session&&!sessionGone&&presentationFor(state?.cartridge?.id)?`<div class="cartridge-context">${escapeHtml(presentationFor(state.cartridge.id).title)}</div>`:''}</div><span class="version">Candidate v${BRAND.version}</span></header>
    ${content}
    <footer>Designed and built by William McAda · © 2026 William McAda</footer>
  </div>`;
}

function selectedPresetCount() { return selectedMath.length; }
function moduleCount() { return selectedPresetCount() + customModules.length; }
function totalQuestions() {
  return selectedMath.reduce((sum, record) => sum + Number(record.itemCount || 0), 0)
    + customModules.reduce((sum, module) => sum + module.items.length, 0);
}
function gateLoads(total, count) {
  const base = Math.floor(total / count), remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function syncSetup() {
  document.querySelectorAll("[data-selected-math]").forEach(card => {
    const record = selectedMath.find(item => item.id === card.dataset.selectedMath);
    if (record) record.itemCount = Math.max(1, Math.min(50, Number(card.querySelector("[data-count]").value) || 1));
  });
}

function renderLanding() {
  const gateCount = setupGates;
  const questionTotal = totalQuestions();
  const distribution = gateLoads(questionTotal, gateCount);
  const countOverrides = selectedMath.filter(record => record.itemCount !== setupBulkCount);
  const rows = pickerRows(), chosen = new Set(selectedMath.map(r => r.id));
  const levelOptions = [['mathquest','MathQuest sets (former modules)'],['all','All levels · search'],...['K','1','2','3','4','5','6','7'].map(g=>[`grade:${g}`,`Grade ${g} skills`]),...ENGINE_COURSES.map(c=>[`bank:${c.bankId}`,`${c.course} (${c.count})`]),['extras','Math Engine extras']];
  const pickerMarkup = `<div class="engine-picker"><div class="form-row"><label>Level<select id="math-level">${levelOptions.map(([v,l])=>`<option value="${v}" ${pickerLevel===v?'selected':''}>${escapeHtml(l)}</option>`).join('')}</select></label><label>Search<input id="math-search" type="search" value="${escapeHtml(pickerQuery)}" placeholder="e.g. fractions, GCF, slope" autocomplete="off"></label></div>
      <div class="engine-results" role="group" aria-label="Math Engine skills">${rows.slice(0,pickerLimit).map(r=>`<label class="engine-row ${chosen.has(r.id)?'selected':''}"><input type="checkbox" data-pick-math="${escapeHtml(r.id)}" ${chosen.has(r.id)?'checked':''}><span><b>${escapeHtml(r.name)}</b><small>${escapeHtml(mathWhere(r.id))}</small></span></label>`).join('')||'<p class="fine">No skills match. Try another level or search word.</p>'}</div>
      <p class="fine">${rows.length} match${rows.length===1?'':'es'}${rows.length>pickerLimit?` · showing ${pickerLimit}`:''}. ${rows.length>pickerLimit?'<button class="quiet" id="math-more">Show more</button>':''}</p></div>`;
  const presetCards = selectedMath.map(record => `<article class="module-card selected" data-selected-math="${escapeHtml(record.id)}">
    <div><b>${escapeHtml(mathTitle(record.id))}</b><small>${escapeHtml(mathWhere(record.id))}</small></div>
    <div class="module-settings"><label>Questions<input type="number" data-count min="1" max="50" value="${record.itemCount}"></label><button class="quiet" data-preview-math="${escapeHtml(record.id)}">Preview</button><button class="remove-module" data-remove-math="${escapeHtml(record.id)}" aria-label="Remove ${escapeHtml(mathTitle(record.id))}">Remove</button></div>
  </article>`).join("");
  const previewMarkup = mathPreview ? `<section class="engine-preview" aria-live="polite"><div class="section-title"><h3>Preview · ${escapeHtml(mathPreview.title)}</h3><button class="quiet" id="close-math-preview">Close preview</button></div>${mathPreview.error?`<p class="notice bad">${escapeHtml(mathPreview.error)}</p>`:mathPreview.items?mathPreview.items.map(q=>`<article class="preview-question"><small>${escapeHtml(q.title)}</small><div class="problem">${q.promptMarkup||escapeHtml(q.prompt)}</div><p class="fine">Answer: <b>${escapeHtml(q.answer)}</b></p></article>`).join(''):'<p class="fine">Loading sample questions…</p>'}<p class="fine">Preview only. Nothing is saved and no student data changes.</p></section>` : '';
  const customCards = customModules.map((module, index) => `<article class="module-card selected custom"><div><b>${escapeHtml(module.title)}</b><small>Teacher module · ${module.items.length} questions</small></div><button class="remove-module" data-remove-custom="${index}" aria-label="Remove ${escapeHtml(module.title)}">Remove</button></article>`).join("");
  app.innerHTML = shell(`
    <section class="hero platform-hero"><div><p class="eyebrow">TEACHER SESSION BUILDER</p><h1>${BRAND.name}</h1><p>Choose the story. Control every question.</p></div>${markMarkup()}</section>
    <section class="panel setup-builder">
      <h2>1 · Game Select</h2>
      <label>Cartridge<select id="cartridge-select"><option value="" ${!setupCartridge?'selected':''}>Choose a cartridge…</option>${CARTRIDGES.map(c=>`<option value="${c.id}" ${setupCartridge===c.id?'selected':''}>${escapeHtml(c.title)}</option>`).join('')}</select></label>
      ${developerTools()}
      ${cartridgeCard(setupCartridge)}
      <div class="form-row"><label>Team names <small>Separate with commas; 1–6 teams. Empty teams are removed at launch.</small><input id="teams" value="${escapeHtml(setupTeams)}"></label><label>Mission gates<select id="gate-count"><option value="3" ${gateCount === 3 ? "selected" : ""}>3 · Condensed mission</option><option value="4" ${gateCount === 4 ? "selected" : ""}>4 · Standard mission</option><option value="5" ${gateCount === 5 ? "selected" : ""}>5 · Full mission</option></select></label></div>
    </section>
    <section class="panel setup-builder">
      <div class="section-title"><div><h2>2 · Academic Content</h2><p>Choose up to 20 Math Engine skills, MathQuest sets or teacher-built modules. Every selected question is used.</p></div><span class="selection-count">${moduleCount()} / 20 modules</span></div>
      <div class="content-source-row"><label>Discipline<select id="discipline"><option value="mathematics" selected>Mathematics</option><option disabled>Science · coming later</option><option disabled>Humanities · coming later</option><option disabled>Languages · coming later</option></select></label><div><b>Content source</b><span>Math Engine + teacher imports</span></div></div>
      <h3 class="library-heading">Math Engine ${escapeHtml(ENGINE_VERSION)} · Kindergarten to Algebra 2</h3>
      ${pickerMarkup}
      <h3 class="library-heading">Selected for this session</h3>
      <div class="bulk-controls">
        <div class="bulk-control"><label>Questions per selected module<input id="bulk-count" type="number" min="1" max="50" value="${setupBulkCount}"></label><button class="secondary" id="apply-bulk-count">Apply count to selected</button><button class="quiet" id="reset-bulk-count">Reset question counts</button></div>
        
      </div>
      <p class="bulk-summary"><b>Bulk defaults:</b> ${setupBulkCount} questions per selected skill. ${countOverrides.length} count override${countOverrides.length === 1 ? "" : "s"}. Difficulty is set per student on the dashboard: Foundation and Challenge use the engine's reviewed easier or harder related skill when one exists.</p>
      <div class="module-grid">${presetCards}${customCards}</div>${previewMarkup}
      <div class="import-zone"><div><b>Import a teacher module</b><small>CSV or JSON fields: module, prompt, answer_type, answer, accepted_answers, options, hint, image_url, image_alt, image_caption. Images use HTTPS links in this prototype.</small></div><label class="file-button">Choose file<input id="module-file" type="file" accept=".csv,.json,text/csv,application/json"></label></div>
    </section>
    <section class="panel setup-builder allocation">
      <div><h2>3 · Automatic Allocation</h2><p><b>${questionTotal} questions per student</b> will be shuffled across ${gateCount} gates. No gate belongs to one skill.</p></div>
      <div class="gate-allocation">${distribution.map((count, index) => `<span><b>Gate ${index + 1}</b>${count} questions</span>`).join("")}</div>
      ${questionTotal > 200 ? `<p class="notice bad">Reduce the session to 200 questions or fewer.</p>` : questionTotal < gateCount ? `<p class="notice bad">Select at least ${gateCount} questions so every gate contains mathematics.</p>` : ""}
      <button class="primary wide" id="create" ${!presentationFor(setupCartridge)||questionTotal < gateCount || questionTotal > 200 || moduleCount() > 20 ? "disabled" : ""}>${presentationFor(setupCartridge)?`Create ${escapeHtml(presentationFor(setupCartridge).title)} session`:'Choose a cartridge to continue'}</button>
      <p class="fine">Math Engine ${escapeHtml(ENGINE_VERSION)} generates and checks every preset question. Imported questions use the answer type supplied by the teacher.</p>
    </section>`);
  bindSetup();
}

function bindSetup() {
  document.querySelector('#cartridge-select')?.addEventListener('change',e=>{captureSetup();setupCartridge=e.target.value;renderLanding();});
  document.querySelectorAll("[data-selected-math] input[data-count]").forEach(control => control.addEventListener("change", () => { captureSetup(); renderLanding(); }));
  document.querySelectorAll("[data-pick-math]").forEach(box => box.addEventListener("change", () => {
    captureSetup();
    const id = box.dataset.pickMath;
    if (box.checked) { if (moduleCount() >= 20) { alert("A session can contain no more than 20 modules."); } else if (!selectedMath.some(r => r.id === id)) selectedMath.push({ id, itemCount: setupBulkCount, defaultItemCount: setupBulkCount }); }
    else selectedMath = selectedMath.filter(r => r.id !== id);
    renderLanding();
  }));
  document.querySelectorAll("[data-remove-math]").forEach(button => button.onclick = () => { captureSetup(); selectedMath = selectedMath.filter(r => r.id !== button.dataset.removeMath); renderLanding(); });
  document.querySelectorAll("[data-preview-math]").forEach(button => button.onclick = () => previewMath(button.dataset.previewMath));
  document.querySelector("#close-math-preview")?.addEventListener("click", () => { mathPreview = null; renderLanding(); });
  document.querySelector("#math-level")?.addEventListener("change", event => { captureSetup(); pickerLevel = event.target.value; pickerLimit = 40; renderLanding(); });
  document.querySelector("#math-more")?.addEventListener("click", () => { captureSetup(); pickerLimit += 40; renderLanding(); });
  let searchTimer = null;
  document.querySelector("#math-search")?.addEventListener("input", event => {
    clearTimeout(searchTimer);
    const value = event.target.value;
    searchTimer = setTimeout(() => { captureSetup(); pickerQuery = value; pickerLimit = 40; if (pickerLevel === 'mathquest' && value.trim()) pickerLevel = 'all'; renderLanding(); const input = document.querySelector("#math-search"); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }, 250);
  });
  document.querySelector("#gate-count")?.addEventListener("change", () => { captureSetup(); renderLanding(); });
  document.querySelector("#discipline")?.addEventListener("change", event => { setupDiscipline = event.target.value; });
  document.querySelector("#teams")?.addEventListener("input", event => { setupTeams = event.target.value; });
  document.querySelectorAll("[data-remove-custom]").forEach(button => button.onclick = () => { customModules.splice(Number(button.dataset.removeCustom), 1); renderLanding(); });
  document.querySelector("#module-file")?.addEventListener("change", importModuleFile);
  document.querySelector("#create")?.addEventListener("click", createSession);
  document.querySelector("#apply-bulk-count")?.addEventListener("click", applyBulkQuestionCount);
  document.querySelector("#reset-bulk-count")?.addEventListener("click", resetBulkQuestionCounts);
}

async function previewMath(id) {
  captureSetup();
  const ids = LEGACY_MODULE_MAP[id] || [id];
  mathPreview = { title: mathTitle(id), items: null };
  renderLanding();
  try {
    const result = await parseResponse(await fetchApi(hosting.api('engine-preview'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) }));
    if (mathPreview?.title === mathTitle(id)) mathPreview.items = result.items || [];
  } catch (error) {
    if (mathPreview) mathPreview.error = `Preview unavailable: ${error.message}`;
  }
  renderLanding();
}

function captureSetup() {
  syncSetup();
  setupTeams = document.querySelector("#teams")?.value || setupTeams;
  setupGates = Number(document.querySelector("#gate-count")?.value || setupGates);
}

function applyBulkQuestionCount() {
  captureSetup();
  setupBulkCount = Math.max(1, Math.min(50, Number(document.querySelector("#bulk-count")?.value) || 1));
  selectedMath.forEach(record => { record.itemCount = setupBulkCount; });
  renderLanding();
}

function resetBulkQuestionCounts() {
  captureSetup();
  selectedMath.forEach(record => { record.itemCount = record.defaultItemCount || 3; });
  renderLanding();
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    } else value += character;
  }
  row.push(value);
  if (row.some(cell => cell.trim())) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV needs a header row and at least one question.");
  const headers = rows.shift().map(header => header.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.map(rowValues => Object.fromEntries(headers.map((header, index) => [header, rowValues[index] || ""])));
}

function normalizeImportedRecords(records, fallbackTitle) {
  if (!Array.isArray(records) || !records.length) throw new Error("No questions were found.");
  if (records.length > 200) throw new Error("A session may contain no more than 200 imported questions.");
  const groups = new Map();
  records.forEach((record, index) => {
    const title = String(record.module || record.module_title || fallbackTitle).trim() || fallbackTitle;
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push({
      prompt: record.prompt,
      answerType: record.answerType || record.answer_type || "number",
      answer: record.answer,
      fractionPolicy:record.fractionPolicy,requiredDenominator:record.requiredDenominator,representationInstruction:record.representationInstruction,
      acceptedAnswers: Array.isArray(record.acceptedAnswers) ? record.acceptedAnswers : Array.isArray(record.accepted_answers) ? record.accepted_answers : String(record.accepted_answers || "").split("|").filter(Boolean),
      options: Array.isArray(record.options) ? record.options : String(record.options || "").split("|").filter(Boolean),
      hint: record.hint || "",
      disciplineId: record.disciplineId || setupDiscipline,
      courseBankId: record.courseBankId || 'prealgebra',
      subskillId: record.subskillId || record.subskill_id,
      standards: Array.isArray(record.standards) ? record.standards : String(record.standards || "").split("|").filter(Boolean),
      DOK: record.DOK || record.dok, unit: record.unit, currency: record.currency, expectedForm: record.expectedForm || record.expected_form,
      media: record.media || (record.imageUrl || record.image_url ? {
        src: record.imageUrl || record.image_url,
        alt: record.imageAlt || record.image_alt || "Question illustration",
        caption: record.imageCaption || record.image_caption || ""
      } : null)
    });
    if (!record.prompt || String(record.answer ?? "").trim() === "") throw new Error(`Imported row ${index + 1} needs a prompt and answer.`);
  });
  return [...groups].map(([title, items]) => ({ title, items }));
}

async function importModuleFile(event) {
  captureSetup();
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const raw = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
    const records = Array.isArray(raw) ? raw : Array.isArray(raw.modules) ? raw.modules.flatMap(module=>(module.items||[]).map(item=>({...item,module:module.title||module.moduleId,courseBankId:raw.courseBankId,disciplineId:raw.disciplineId}))) : raw.questions;
    const imported = normalizeImportedRecords(records, file.name.replace(/\.[^.]+$/, ""));
    if (moduleCount() + imported.length > 20) throw new Error("A session can contain no more than 20 modules.");
    customModules.push(...imported);
    notice = { correct: true, message: `Imported ${imported.reduce((sum, module) => sum + module.items.length, 0)} questions in ${imported.length} module(s).` };
    renderLanding();
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  }
}

async function createSession() {
  if(!presentationFor(setupCartridge))return alert('Choose a cartridge before creating a session.');
  captureSetup();
  const button = document.querySelector("#create");
  button.disabled = true;
  try {
    const catalog=await parseResponse(await fetchApi(hosting.api('catalog'),{cache:'no-store'}));
    if(catalog.version!==BRAND.engineVersion||!catalog.cartridges?.some(c=>c.id===setupCartridge&&c.revision===cartridgeFor(setupCartridge).revision))throw new Error(`This front end requires session engine v${BRAND.engineVersion}. Update the backend with the deployment batch, then reload this page.`);
    const teamNames = setupTeams.split(",").map(value => value.trim()).filter(Boolean);
    const modules = [
      ...selectedMath.map(record => ({ id: record.id, title: mathTitle(record.id), source: LEGACY_MODULE_MAP[record.id] ? "preset" : "engine", itemCount: Number(record.itemCount) })),
      ...customModules.map(module => ({ title: module.title, source: "custom", items: module.items }))
    ];
    const response = await fetchApi(hosting.api("sessions"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        teamNames,
        cartridgeId: setupCartridge,
        disciplineId: setupDiscipline,
        courseBankId: "math-engine",
        gateCount: setupGates,
        modules,
        excludedSecretIds: recentSecretIds()
      })
    });
    const result = await parseResponse(response);
    localStorage.setItem(`mq-teacher-${result.code}`, result.teacherKey);
    location.href = hosting.sessionLink(result.code);
  } catch (error) {
    alert(error.message);
    button.disabled = false;
  }
}

function renderTeacher() {
  if (!state) return renderLoading();
  rememberTeacherSecrets();
  const joinUrl = hosting.sessionLink(state.code, { student: true });
  const distribution = state.config.gateLoads.map((count, index) => `<span><b>Gate ${index + 1}</b>${count} questions</span>`).join("");
  const studentCount = state.teams.reduce((sum, team) => sum + team.memberCount, 0);
  const activeTeamCount = state.teams.filter(team => team.memberCount > 0).length;
  const emptyTeamCount = state.teams.length - activeTeamCount;
  const launchPending = busy && activeCommand === "teacher.start";
  const launchStatus = launchPending
    ? "Launching briefing…"
    : state.status === "setup" && studentCount === 0
      ? "Waiting for at least one agent to join."
      : state.status === "setup"
        ? `Ready to launch: ${studentCount} agent${studentCount === 1 ? "" : "s"} across ${activeTeamCount} active team${activeTeamCount === 1 ? "" : "s"}.${emptyTeamCount ? ` ${emptyTeamCount} empty team${emptyTeamCount === 1 ? "" : "s"} will be removed.` : ""}`
        : state.launchSummary
          ? `Briefing launched for ${state.launchSummary.studentCount} agent${state.launchSummary.studentCount === 1 ? "" : "s"} across ${state.launchSummary.activeTeamCount} team${state.launchSummary.activeTeamCount === 1 ? "" : "s"}.`
          : "Briefing launched.";
  const teamCards = state.teams.map(item => `
    <article class="team-card stage-${item.stage} ${item.memberCount ? "" : "empty-team"}">
      <div class="team-heading"><div><span class="team-name">${escapeHtml(item.name)}</span><span class="stage-tag">${escapeHtml(gateLabel(item))}</span></div><div class="pin">${escapeHtml(item.pin)}</div></div>
      ${item.secretNumbers.length ? `<div class="teacher-secret"><small>SECRET MESSAGE</small><b>${item.secretNumbers.join(" · ")}</b><span>Teacher key: ${escapeHtml(item.secretAnswer)}</span></div>` : ""}
      <div class="metrics"><span><b>${item.memberCount}</b> students</span><span><b>${item.equipmentSlots||1}</b> equipment slots</span><span><b>${item.adverseEvents.length}</b> adverse</span></div>
      <div class="member-list teacher-roster">${item.members.length ? item.members.map(member => `<div><span class="presence ${member.active ? "on" : ""}"></span><b>${escapeHtml(member.alias)}</b><span>${member.itemsCompleted}/${member.assignedTotal??state.config.totalQuestions} total${member.fate ? ` · ${escapeHtml(member.fate.label)}` : ""}</span><label class="difficulty-control"><span class="sr-only">Difficulty for ${escapeHtml(member.alias)}</span><select data-student-difficulty="${escapeHtml(member.id)}" aria-label="Question difficulty for ${escapeHtml(member.alias)}"><option value="session" ${member.difficultyPolicy === "session" ? "selected" : ""}>Session level</option><option value="foundation" ${member.difficultyPolicy === "foundation" ? "selected" : ""}>Foundation</option><option value="standard" ${member.difficultyPolicy === "standard" ? "selected" : ""}>Standard</option><option value="challenge" ${member.difficultyPolicy === "challenge" ? "selected" : ""}>Challenge</option></select></label></div>`).join("") : `<p class="empty-label">No players joined · removed at launch</p>`}</div>
      ${teamProgressMarkup(item)}${teacherExtraction(item)}${teamToolsMarkup(state,item)}
      ${item.lead ? `<p class="lead">Event Lead: ${escapeHtml(item.lead.alias)}</p>` : ""}
    </article>`).join("");
  app.innerHTML = shell(`
    <section class="hero compact"><div><p class="eyebrow">TEACHER CONTROL</p><h1>MathQuest Dashboard</h1><p>Session ${escapeHtml(state.code)} · ${state.config.modules.length} modules · ${state.config.totalQuestions} questions · ${state.config.gateCount} gates</p></div><div class="live-dot">${state.paused ? "PAUSED" : state.status.toUpperCase()}</div></section>
    <section class="panel mission-plan"><div><h2>Mission content · ${escapeHtml(state.config.disciplineTitle || "Mathematics")}</h2><p>${state.config.modules.map(module => escapeHtml(module.title)).join(" · ")}</p><small>Player difficulty changes are private and affect only the next unissued preset question.</small></div><div class="gate-allocation">${distribution}</div></section>
    <div class="dashboard-grid">
      <section class="panel join-panel"><h2>Student access</h2><canvas id="qr" width="180" height="180" aria-label="QR code for the student join link"></canvas><p id="qr-error" class="fine" hidden>QR unavailable—open the link below.</p><div class="url">${escapeHtml(joinUrl)}</div><p>Team codes</p>${state.teams.map(item => `<div class="code-row"><b>${escapeHtml(item.name)}</b><code>${escapeHtml(item.pin)}</code></div>`).join("")}</section>
      <section class="panel controls"><h2>Session controls</h2><button class="primary" data-teacher-command="start" ${state.status !== "setup" || studentCount === 0 || launchPending ? "disabled" : ""}>${launchPending ? "Launching…" : "Launch briefing"}</button><button class="secondary" data-teacher-command="pause" ${state.status !== "active" || busy ? "disabled" : ""}>${state.paused ? "Resume" : "Pause"}</button><button class="secondary" data-teacher-command="report-csv">Download CSV</button><button class="secondary" data-teacher-command="report">Download JSON</button><button class="danger" data-teacher-command="end" ${state.status === "ended" || busy ? "disabled" : ""}>End session</button><p class="launch-status ${launchPending ? "pending" : ""}">${escapeHtml(launchStatus)}</p>${launchPending ? "" : noticeHtml()}<p class="fine">${state.attempts} answer attempts recorded · revision ${state.revision}</p></section>
      ${state.cartridge.id==='vault-7'?teacherAudio.markup():state.cartridge.id==='journey-west'?'':state.cartridge.id!=='ironbreak'?cartridgeAudio.markup(cartridgeFor(state.cartridge.id)):'<section class="panel"><h2>Ironbreak · v0.1.0 candidate</h2><p>Individual suit runs share one five-minute crew window. Each device has level and boss music controls.</p></section>'}
      <section class="panel teams"><h2>Team progress</h2><div class="teams-grid">${teamCards}</div></section>
    </div>`);
  if(state.cartridge.id==='journey-west'){
    document.querySelectorAll('.team-card').forEach((card,i)=>{const team=state.teams[i],j=team.journey;if(!j?.runId)return;
      const section=document.createElement('section');section.className='j-teacher-controls';
      const status=document.createElement('p');status.textContent='Journey: '+(j.snapshot?.phase||'opening')+(j.result?' · '+j.result.outcome:'');section.append(status);
      for(const [action,label] of [['start','Start ready players'],['pause','Pause team'],['resume','Resume team'],['end','End run']]){
        const button=document.createElement('button');button.textContent=label;button.disabled=!!j.result;button.onclick=()=>command('teacher.journey.'+action,{teamId:team.id});section.append(button);
      }card.append(section);
    });
  }
  drawQr(document.querySelector("#qr"), joinUrl);
  app.insertAdjacentHTML('beforeend',developerTools());
  document.querySelector('.hero h1').textContent='MathQuest Dashboard';
  if(state.status==='active'){const b=document.createElement('button');b.textContent='Extend activity';b.className='secondary';b.onclick=()=>extensionDialog(state,async(type,extra)=>parseResponse(await fetchApi(endpoint('command'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type,teacherKey,commandId:uid(),...extra})})),incoming=>{state=incoming;notice={correct:true,message:'Additional questions assigned.'};render();});document.querySelector('.controls').append(b);}
  const privacy=document.createElement('p');privacy.className='fine';privacy.textContent='Pilot privacy: aliases only. Hosted deletion and credential expiry: '+new Date(state.expiresAt).toLocaleString()+'. Download reports before deleting.';
  const remove=document.createElement('button');remove.className='danger';remove.textContent='Delete hosted session';
  remove.onclick=async()=>{if(!confirm('Permanently delete this hosted session, all student records, and access credentials? Download CSV/JSON first. Downloaded files will not be deleted.'))return;try{await parseResponse(await fetchApi(endpoint('delete'),{method:'POST'}));window.dispatchEvent(new CustomEvent('mq-session-gone',{detail:{code:session}}));}catch(e){alert(e.message);}};
  document.querySelector('.controls').append(privacy,remove);
  bindTeamTools(state,command);
  teacherAudio.bind();
  cartridgeAudio.bind();
  if(['nightfall','nightfall-false-haven','ironbreak','coastal-escape','blackline'].includes(state.cartridge.id)){
    document.querySelector('.hero h1').textContent='MathQuest Dashboard';
    document.querySelectorAll('.team-card').forEach((card,i)=>{const t=state.teams[i];if(t.stage==='rescue'){const close=document.createElement('button');close.textContent='Close rescue and open Gate 2';close.onclick=()=>command('teacher.closeRescue',{teamId:t.id});card.append(close);const note=document.createElement('p');note.textContent='First Response · '+(t.rescue?.results||[]).map(r=>`${r.alias}: ${r.outcome||r.status} · ${r.retries} retries`).join(' | ');card.append(note);}if(t.stage==='minigame'){const button=document.createElement('button');button.textContent='Finish remaining crossings';button.onclick=()=>command('teacher.advanceFinale',{teamId:t.id});card.append(button);const p=document.createElement('p');p.textContent=(t.finale?.results||[]).map(r=>`${r.alias}: ${r.outcome||r.status}`).join(' | ');card.append(p);}});
  }
}

function rememberTeacherSecrets() {
  const incoming = state?.teams?.map(team => team.secretVariantId).filter(Boolean) || [];
  if (!incoming.length) return;
  const recent = recentSecretIds();
  const merged = [...recent, ...incoming].filter((value, index, all) => all.indexOf(value) === index).slice(-18);
  localStorage.setItem("mq-vault7-recent-secrets", JSON.stringify(merged));
}

function recentSecretIds() {
  try {
    const value = JSON.parse(localStorage.getItem("mq-vault7-recent-secrets") || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

async function launchBriefing() {
  const studentCount = state?.teams?.reduce((sum, team) => sum + team.memberCount, 0) || 0;
  const activeTeamCount = state?.teams?.filter(team => team.memberCount > 0).length || 0;
  const emptyTeamCount = (state?.teams?.length || 0) - activeTeamCount;
  if (!studentCount) {
    notice = { correct: false, message: "At least one agent must join before the briefing can launch." };
    return renderTeacher();
  }
  const warning = emptyTeamCount
    ? `Launch with ${activeTeamCount} active team${activeTeamCount === 1 ? "" : "s"}? ${emptyTeamCount} empty team${emptyTeamCount === 1 ? "" : "s"} will be removed.`
    : `Launch the briefing for ${studentCount} agent${studentCount === 1 ? "" : "s"} across ${activeTeamCount} team${activeTeamCount === 1 ? "" : "s"}?`;
  if (!confirm(warning)) return;
  await command("teacher.start", {}, { pendingMessage: "Launching briefing…", successMessage: "Briefing launched." });
}

function teacherExtraction(team) {
  if (!team.extraction) return '';
  const ex=team.extraction;
  return `<section class="teacher-extraction"><h3>Extraction · ${ex.completedCount}/${ex.rosterCount} finished</h3>${team.members.map(member=>{
    const r=ex.resultsByStudentId[member.id];
    return `<div class="extraction-row"><b>${escapeHtml(member.alias)}</b><span>${escapeHtml(extractionLabel(r))} · ${r.detections} detections · ${Math.round(r.activeElapsedMs/1000)}s</span>${r.status!=='terminal'?`<button class="quiet" data-extraction-fallback="${member.id}">Accessible route</button>`:''}</div>`;
  }).join('')}${team.stage==='extraction'?`<button class="secondary wide" data-extraction-finish="${team.id}">End extraction and continue</button>`:''}</section>`;
}
function extractionLabel(r) { return !r || r.status==='not_started'?'Not started':r.status==='active'?(r.fallbackUsed?'Accessible route':'In progress'):({extracted:'Extracted',captured:'Captured',timeout:'Timed out',fallback_extracted:'Extracted · accessible route',advanced:'Advanced by teacher'})[r.outcome]||'Recorded'; }
async function handleDelegatedTeacherControl(event) {
  if (teacherKey) {
    const finish=event.target.closest('[data-extraction-finish]');
    if(finish) return command('teacher.finishExtraction',{teamId:finish.dataset.extractionFinish},{successMessage:'Unfinished runs advanced. Epilogues are open.'});
    const fallback=event.target.closest('[data-extraction-fallback]');
    if(fallback) return command('teacher.extractionFallback',{studentId:fallback.dataset.extractionFallback},{successMessage:'Accessible extraction enabled for this player.'});
  }
  const button = event.target.closest("[data-teacher-command]");
  if (!button || button.disabled || !teacherKey) return;
  const action = button.dataset.teacherCommand;
  if (action === "start") return launchBriefing();
  if (action === "pause") return command("teacher.pause", {}, { pendingMessage: state.paused ? "Resuming session…" : "Pausing session…" });
  if (action === "end") return confirm(`End and freeze this session? ${state.teams.length} teams, ${state.attempts} attempts recorded. Unfinished work stays incomplete; reports remain available.`) && command("teacher.end", {}, { pendingMessage: "Ending session…", successMessage: "Session ended." });
  if(action==='report'||action==='report-csv'){
    try{const response=await fetchApi(endpoint(action==='report'?'report':'report.csv'));if(!response.ok)await parseResponse(response);const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download='MathQuest_'+session+(action==='report'?'.json':'.csv');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){alert(e.message);}
  }
}

function handleTeacherDifficulty(event) {
  const select = event.target.closest("[data-student-difficulty]");
  if (!select || !teacherKey) return;
  command("teacher.setDifficulty", { studentId: select.dataset.studentDifficulty, policy: select.value }, { successMessage: "Private difficulty updated for the next unissued preset question." });
}

function renderJoin() {
  const p=presentationFor(state?.cartridge?.id);
  app.innerHTML = shell(`
    <section class="hero compact"><div><p class="eyebrow" data-join-title>${escapeHtml(p?.title||BRAND.name)}</p><h1>Join session</h1><p>Session ${escapeHtml(session)}</p></div><span data-join-mark>${markMarkup(p,true)}</span></section>
    ${noticeHtml()}<section class="panel setup"><p>Pilot privacy mode: the server assigns an Agent alias. Do not enter your name. Hosted records and access expire 48 hours after room creation.</p><label>Four-character team code<input id="pin" maxlength="4" inputmode="text" autocapitalize="characters" placeholder="ABCD"></label><button class="primary wide" id="join" ${!p?'disabled':''}>${p?'Join session':'Connecting to MathQuest…'}</button><p class="fine">This device remains locked to its assigned team for this session. Difficulty assignments are private.</p></section>`, true);
  document.querySelector("#join").onclick = async () => {
    const teamPin = document.querySelector("#pin").value.trim();
    if (!teamPin) return alert("Enter the team code.");
    deviceId ||= uid();
    localStorage.setItem(`mq-device-${session}`, deviceId);
    if(!localStorage.getItem(`mq-student-${session}`))localStorage.setItem(`mq-student-${session}`,crypto.randomUUID());
    try {
      const response = await fetchApi(endpoint("command"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "student.join", commandId: uid(), deviceId, teamPin })
      });
      state = await parseResponse(response);
      alias=state.student.alias;
      localStorage.setItem(`mq-alias-${session}`, alias);
      render();
    } catch (error) { alert(error.message); }
  };
}

function narrativeHeader(item) {
  const eyebrow = item.stage === "gate" ? `GATE ${item.gateIndex + 1} / ${state.config.gateCount}` : ({ briefing:"INCOMING TRANSMISSION", decision:"ROUTE AUTHORIZATION", market:"FIELD QUARTERMASTER", code:"CIPHER ASSEMBLY", finale:"FINAL AUTHORIZATION", victory:"MISSION COMPLETE" })[item.stage];
  return `<section class="mission-head"><div><p class="eyebrow">${eyebrow}</p><h1>${escapeHtml(gateLabel(item))}</h1></div><div class="currency">${item.inventory?.length||0} resources</div></section>`;
}

function memberProgress(item) {
  return `<div class="crew">${item.members.map(member => `<div class="crew-member"><span class="presence ${member.active ? "on" : ""}"></span><b>${escapeHtml(member.alias)}</b><small>${memberStatus(item, member)}</small></div>`).join("")}</div>`;
}

function memberStatus(item, member) {
  if (item.stage === "extraction") return member.extractionComplete ? "finished" : "extracting";
  if (item.stage === "lobby") return "joined";
  if (item.stage === "briefing") return member.briefingReady ? "ready" : "reading";
  if (item.stage === "gate") return `${member.gateProgress}/${member.gateLoad??item.gateLoad}`;
  if (item.stage === "decision") return member.voted ? "voted" : "waiting";
  if (item.stage === "market") return member.marketReady ? "ready" : "discussing";
  if (item.stage === "code") return "decoding";
  if (item.stage === "finale") return member.finalVoted ? "voted" : "deciding";
  return member.fate?.label || "complete";
}

function renderStudent() {
  if (!state) return renderLoading();
  const item = currentTeam(), student = state.student;
  const journeyActive=state.cartridge.id==='journey-west'&&['brawl','victory'].includes(item.stage)&&item.journey?.runId&&state.status!=='ended';
  if(journeyHost&&!journeyActive){journeyHost.destroy();journeyHost=null;}
  if(journeyActive){
    if(!journeyHost){
      app.innerHTML=shell('<div id="journey-root"></div>',true);
      journeyHost=new JourneyHost(document.querySelector('#journey-root'),{state,send:async(type,extra)=>{
        const response=await fetchApi(endpoint('command'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type,deviceId,commandId:uid(),...extra})});
        const incoming=await parseResponse(response);if(!state||incoming.revision>=state.revision)state=incoming;return incoming;
      }});
    }else journeyHost.update(state);
    return;
  }
  if(finaleHost&&(!['rescue','minigame'].includes(item.stage)||finaleHost.run.phase==='early-rescue'&&item.stage!=='rescue'||state.status==='ended')){finaleHost.destroy();finaleHost=null;}
  if(['rescue','minigame'].includes(item.stage)&&state.status!=='ended'){
    const action=item.stage==='rescue'?item.rescue:item.finale;
    if(!finaleHost){
      app.innerHTML=shell(`<section class="mission-head"><h1>${escapeHtml(presentationFor(state.cartridge.id)?.title||BRAND.name)}</h1></section><div id="finale-root"></div>`,true);
      finaleHost=new (state.cartridge.id==='ironbreak'?IronbreakHost:item.stage==='rescue'?RescueHost:state.cartridge.id==='coastal-escape'?CoastalHost:FinaleHost)(document.querySelector('#finale-root'),{cartridgeId:state.cartridge.id,run:action.run,route:item.route,deadline:action.deadline,serverNow:action.serverNow,pausedAt:action.pausedAt,paused:state.paused,send:async(type,extra)=>{
        const response=await fetchApi(endpoint('command'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type,deviceId,commandId:uid(),...extra})});
        const incoming=await parseResponse(response);if(!state||incoming.revision>=state.revision){state=incoming;if(!['rescue','minigame'].includes(currentTeam()?.stage))render();}return incoming;
      }});
    }else finaleHost.update(action.run,state.paused,action.deadline,action);
    return;
  }
  if (state.status === "setup" || item.stage === "lobby") return renderWaiting(item, student);
  if (state.status === "ended") { extractionRuntime?.destroy(); extractionRuntime=null; return renderEnded(item); }
  if (item.stage === 'extraction') return renderExtraction(item, student);
  if (extractionRuntime) { extractionRuntime.destroy(); extractionRuntime=null; }
  if (state.paused) return renderPaused(item);
  let body = "";
  if(['nightfall','nightfall-false-haven','ironbreak','coastal-escape','blackline'].includes(state.cartridge.id)&&item.stage!=='gate')body=expansionBody(state,item,sceneBlock(item))||'';
  else if (item.stage === "briefing") body = renderBriefing(item, student);
  else if (item.stage === "gate") body = renderMath(item, student);
  else if (item.stage === "decision") body = renderDecision(item, student);
  else if (item.stage === "market") body = renderMarket(item, student);
  else if (item.stage === "code") body = renderCode(item, student);
  else if (item.stage === "finale") body = renderFinale(item, student);
  else body = renderVictory(item, student);
  app.innerHTML = shell(`${narrativeHeader(item)}${leadBanner(item, student)}${noticeHtml()}${body}${memberProgress(item)}${statusBar(item, student)}`, true);
  bindStudentActions(item, student);
  if(['nightfall','nightfall-false-haven','ironbreak','coastal-escape','blackline'].includes(state.cartridge.id))bindExpansion(item,command);
}

function renderWaiting(item, student) {
  app.innerHTML = shell(`
    <section class="hero compact"><div><p class="eyebrow">TEAM ${escapeHtml(item.name).toUpperCase()}</p><h1>Agent ${escapeHtml(student.alias)}</h1><p>Your device is locked to this crew.</p></div>${markMarkup(presentationFor(state.cartridge?.id),true)}</section>
    <section class="panel centered"><div class="spinner"></div><h2>Awaiting mission launch</h2><p>The teacher will open the briefing after every agent has joined.</p></section>
    ${memberProgress(item)}${statusBar(item, student)}`, true);
}

function renderPaused(item) {
  app.innerHTML = shell(`${narrativeHeader(item)}<section class="panel centered"><div class="pause-icon">Ⅱ</div><h2>Mission paused</h2><p>Your teacher has paused the mission. Keep your work and wait for the signal.</p></section>`, true);
  if(['nightfall','nightfall-false-haven','ironbreak','coastal-escape','blackline'].includes(state.cartridge.id))document.querySelector('.centered p').textContent='Your teacher has paused the mission. Keep your work and wait for the signal.';
}

function renderEnded(item) {
  app.innerHTML = shell(`${narrativeHeader(item)}<section class="panel centered"><h2>Session closed</h2><p>The teacher ended this mission. Your recorded mathematics remains in the session report.</p></section>`, true);
}

function sceneBlock(item, compact = false) {
  const scene=item.scene;if(!scene)return '';
  const {narrative,instructions}=splitScene(scene,item.stage,state.cartridge.id);
  const asset=state.cartridge.id==='vault-7'?(SceneAssets[scene.artId]||SceneAssets['scene.cover']):null;
  const src=scene.image||asset?.src,alt=scene.imageAlt||asset?.alt||scene.title;
  const illustration=src?`<figure class="scene-image" data-art-slot="${escapeHtml(scene.artId||'')}"><img ${asset?.srcset?`srcset="${escapeHtml(asset.srcset)}" sizes="(max-width:600px) calc(100vw - 28px), 672px"`: ''} src="${escapeHtml(src)}" width="960" height="540" alt="${escapeHtml(alt)}" loading="lazy"><figcaption class="image-fallback" hidden>Scene illustration unavailable. The mission continues below.</figcaption></figure>`:'';
  return `<section class="panel scene-card ${compact?'compact-scene':''}">${illustration}<div class="scene-copy story-prose"><p class="story-label">Story</p><p class="transmission">${escapeHtml(scene.eyebrow||'')}</p><h2>${escapeHtml(scene.title)}</h2>${narrative.map(p=>`<p>${escapeHtml(p)}</p>`).join('')}</div></section>`+instructionPanel(instructions,escapeHtml);
}

function renderExtraction(item, student) {
  if (!extractionRuntime) {
    app.innerHTML=shell(`<section class="mission-head"><div><p class="eyebrow">SOLO EXTRACTION</p><h1>Get to the surface, ${escapeHtml(student.alias)}</h1></div></section><div id="extraction-root"></div>`,true);
    extractionRuntime=new StealthRuntime(document.querySelector('#extraction-root'), {
      session,studentId:student.id,deviceId,endpoint:endpoint('command'),team:item,paused:state.paused,
      onState:incoming=> { if(!state||incoming.revision>=state.revision){state=incoming; if(currentTeam()?.stage!=='extraction') render();} }
    });
  }
  extractionRuntime.update(item, state.paused);
}

function renderBriefing(item, student) {
  if(state.cartridge.id==='journey-west')return sceneBlock(item)+'<section class="panel briefing-card student-task"><h2>Before you begin</h2><p>Complete your mathematics, then choose a hero and personal upgrades with your team. Gameplay results are recorded separately from math accuracy.</p><button class="primary wide" data-action="briefing.ready" '+(student.briefingReady?'disabled':'')+'>'+(student.briefingReady?'Ready for the gates':'Begin preparation')+'</button></section>';
  return `${sceneBlock(item)}<section class="panel briefing-card student-task"><h2>Before you begin</h2>
    <div class="secret-preview"><small>SECRET MESSAGE // ${item.secretNumbers.length} SYMBOLS</small><b>${item.secretNumbers.join(" · ")}</b><span>The meaning is hidden until the final gate.</span></div>
    <p class="personal-order">Agent ${escapeHtml(student.alias)}, confirm that you understand: accurate work keeps you alive. Mistakes may change your fate.</p>
    <button class="primary wide" data-action="briefing.ready" ${student.briefingReady ? "disabled" : ""}>${student.briefingReady ? "Mission accepted — waiting for crew" : "Accept mission"}</button>
  </section>`;
}

function inputParts(type) {
  if (type === "mixed") return [["whole","Whole number"],["numerator","Numerator"],["denominator","Denominator"]];
  if (type === "fraction") return [["numerator", "Numerator"], ["denominator", "Denominator"]];
  if (type === "ratio") return [["left", "First value"], ["right", "Second value"]];
  if (type === "scientific") return [["coefficient", "Coefficient"], ["exponent", "Exponent"]];
  return [["main", type === "percent" ? "Percent" : "Answer"]];
}

function renderedAnswer(type) {
  if (type === "fraction") return `${draft.numerator || "□"} / ${draft.denominator || "□"}`;
  if (type === "ratio") return `${draft.left || "□"} : ${draft.right || "□"}`;
  if (type === "scientific") return `${draft.coefficient || "□"} × 10^${draft.exponent || "□"}`;
  if (type === "percent") return `${draft.main || "□"}%`;
  return draft.main || "Tap the keypad";
}

function serializeAnswer(type) {
  if (type === "mixed") return `${draft.whole} ${draft.numerator}/${draft.denominator}`;
  if (type === "fraction") return `${draft.numerator}/${draft.integerMode ? 1 : draft.denominator}`;
  if (type === "ratio") return `${draft.left}:${draft.right}`;
  if (type === "scientific") return `${draft.coefficient}e${draft.exponent}`;
  return type === "choice" ? draft.choice : draft.main;
}

function answerMarkup(item) {
  const slot=(field,label)=>`<button class="answer-slot ${activeField===field?'active':''}" data-answer-field="${field}" aria-label="${label}">${escapeHtml(draft[field]||'□')}</button>`;
  const fraction=`<span class="fraction-input">${slot('numerator','Numerator')}${slot('denominator','Denominator')}</span>`;
  if(item.answerType==='fraction') return draft.integerMode ? slot('numerator','Integer answer') : fraction;
  if(item.answerType==='mixed') return `${slot('whole','Whole number')}${fraction}`;
  if(item.answerType==='scientific') return `${slot('coefficient','Coefficient')}<span>× 10<sup>${slot('exponent','Exponent')}</sup></span>`;
  if(item.answerType==='ratio') return `${slot('left','First value')} : ${slot('right','Second value')}`;
  return `${item.answerType==='money'?escapeHtml(item.currency||'$'):''}${slot('main','Answer')}${item.answerType==='percent'?'%':item.answerType==='unit'?`<span class="answer-unit">${escapeHtml(item.unit||'')}</span>`:''}`;
}
function engineInput(item) {
  if(item.answerType==='engine-text') return `<label class="engine-text-answer">Answer<input id="engine-text-answer" type="text" value="${escapeHtml(draft.main)}" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" enterkeyhint="done"></label><p class="fine">Type your answer, then submit.</p>`;
  const extras=(item.keys||[]).filter(k=>!/^[0-9]$/.test(k)&&!['-','.','/'].includes(k));
  const base=['7','8','9','4','5','6','1','2','3'];
  return `<div class="answer-display math-answer" aria-live="polite"><button class="answer-slot active" data-answer-field="main" aria-label="Answer">${escapeHtml(draft.main||'□')}</button></div><p class="fine">Use the keypad or your keyboard. Space separates parts of an answer.</p>
    <div class="keypad math-native engine-keys" aria-label="Math answer keypad">${base.map(k=>`<button data-answer-key="${k}">${k}</button>`).join('')}<button data-answer-text="-" aria-label="Minus">−</button><button data-answer-key="0">0</button><button data-answer-key="backspace" aria-label="Delete">⌫</button><button data-answer-text=".">.</button><button data-answer-text="/">/</button><button data-answer-text=" " aria-label="Space">space</button>${extras.map(k=>`<button data-answer-text="${escapeHtml(k)}">${escapeHtml(k)}</button>`).join('')}</div>`;
}
function mathInput(item) {
  if(item.answerType==='engine-keys'||item.answerType==='engine-text'){activeField='main';return engineInput(item);}
  if(item.answerType==='choice') return `<div class="answer-options">${item.options.map(option=>`<button class="answer-option ${draft.choice===option?'selected':''}" aria-pressed="${draft.choice===option}" data-answer-choice="${escapeHtml(option)}"><span class="selection-check">✓</span>${escapeHtml(option)}</button>`).join('')}</div>`;
  const fields=item.answerType==='fraction'&&draft.integerMode? [['numerator','Integer answer']]:inputParts(item.answerType);
  if(!fields.some(([key])=>key===activeField))activeField=fields[0][0];
  const tabs=fields.length>1?`<div class="input-tabs">${fields.map(([key,label])=>`<button data-answer-field="${key}" class="${activeField===key?'active':''}">${label}</button>`).join('')}</div>`:'';
  const decimal=['number','decimal','percent','scientific','money','unit'].includes(item.answerType)&&activeField!=='exponent';
  return `${item.answerType==='fraction'?`<div class="input-tabs"><button data-integer-mode="false" aria-pressed="${!draft.integerMode}">Fraction</button><button data-integer-mode="true" aria-pressed="${!!draft.integerMode}">Integer (e.g. 3 or −3)</button></div><p class="fine">If your result is an integer, select Integer. No denominator is needed.</p>`:''}${tabs}<div class="answer-display math-answer" aria-live="polite">${answerMarkup(item)}</div><p class="fine">${item.expectedForm?escapeHtml(item.expectedForm)+'. ':''}Select a box, then use the keypad or your keyboard.</p>
    <div class="keypad math-native" aria-label="Math answer keypad">${['7','8','9','4','5','6','1','2','3'].map(k=>`<button data-answer-key="${k}">${k}</button>`).join('')}<button data-answer-key="minus">−</button><button data-answer-key="0">0</button><button data-answer-key="backspace" aria-label="Delete">⌫</button>${decimal?'<button class="decimal-key" data-answer-key=".">.</button>':''}</div>`;
}
function formatMath(prompt) {
  return escapeHtml(prompt).replace(/(\d+|[a-z])\^\(?([−-]?\d+)\)?/gi, '$1<sup>$2</sup>')
    .replace(/([−-]?\d+)\/(\d+)/g,'<span class="inline-fraction"><span>$1</span><span>$2</span></span>');
}

function renderMath(item, student) {
  if (student.gateComplete) {
    return `${sceneBlock(item, true)}<section class="panel centered"><div class="success-mark">✓</div><h2>Your gate contribution is complete</h2><p>Stay with your crew. The next stage opens only when every team member finishes.</p></section>`;
  }
  const problem = student.currentItem;
  if (!problem) return `<section class="panel centered"><div class="spinner"></div><h2>Loading challenge</h2></section>`;
  const media = problem.media ? `<figure class="question-media"><img src="${escapeHtml(problem.media.src)}" alt="${escapeHtml(problem.media.alt || "Question image")}" loading="lazy">${problem.media.caption ? `<figcaption>${escapeHtml(problem.media.caption)}</figcaption>` : ""}</figure>` : "";
  return `${sceneBlock(item, true)}<section class="panel math-card">
    <div class="progress-line"><span>${escapeHtml(problem.moduleTitle)}</span><b>${student.gateProgress + 1} of ${student.gateLoad??item.gateLoad}</b></div>
    ${media}<div class="problem ${problem.prompt.length>100?"word-problem":""}">${problem.promptMarkup || formatMath(problem.prompt)}</div>
    ${mathInput(problem)}
    <button class="primary wide" data-action="math.submit">Submit answer</button>
    <p class="fine">Your individual answer is code-checked. The crew cannot advance without your contribution.</p>
  </section>`;
}

function renderDecision(item, student) {
  const allVoted = item.voteCount >= item.memberCount;
  const results = item.voteTotals ? `<div class="vote-results"><b>Vote result</b><span>Ventilation Shaft: <strong>${item.voteTotals.shaft}</strong></span><span>Security Corridor: <strong>${item.voteTotals.corridor}</strong></span></div>` : `<p class="fine">${item.voteCount}/${item.memberCount} votes recorded. Totals appear after everyone votes.</p>`;
  return `${sceneBlock(item)}<section class="panel">
    <div class="choice-grid">
      <button class="choice ${item.myVote === "shaft" ? "selected" : ""}" data-vote="shaft"><span class="selection-mark">✓ YOUR VOTE</span><b>Ventilation Shaft</b><span>Quiet and narrow. Time the sensor gaps; a one-use Cloak can help with a difficult crossing.</span></button>
      <button class="choice ${item.myVote === "corridor" ? "selected" : ""}" data-vote="corridor"><span class="selection-mark">✓ YOUR VOTE</span><b>Security Corridor</b><span>Fast but exposed. A Silent Toolkit may protect the crew later.</span></button>
    </div>${results}
    ${student.isLead ? `<button class="primary wide" data-action="decision.resolve" ${!allVoted ? "disabled" : ""}>Submit majority decision</button>` : `<p class="next-step ${allVoted ? "active" : ""}">${allVoted ? `All votes are in. Event Lead ${escapeHtml(item.lead.alias)} must submit the majority choice.` : "Make your selection, then help the crew discuss the risk."}</p>`}
  </section>`;
}

const MARKET = {
  scanner: ["Code Scanner", 40, "Restores one cipher mapping if an alarm corrupts it.", "Narrative insurance only; no extraction ability."],
  toolkit: ["Silent Toolkit", 30, "Protects a Security Corridor approach.", "Jam (Q): disable security for 3 seconds, once per checkpoint."],
  cloak: ["Cloak", 30, "A single emergency crossing without detection.", "Cloak (R): invisible to all security for 5 seconds. One use per run."],
  none: ["Save the credits", 0, "Purchase nothing and accept the risk.", "Extraction: standard route, with no equipment advantage."]
};

function renderMarket(item, student) { return equipmentMarkup(item,student); }

function renderCode(item, student) {
  const mappings = student.myMappings.map(record => `<div class="mapping ${record.status === "corrupted" ? "lost" : ""}"><span>${record.number}</span><b>=</b><strong>${record.letter || "?"}</strong><small>${record.status === "corrupted" ? "CORRUPTED" : record.status === "restored" ? "SCANNER RESTORED" : "YOUR CIPHER"}</small></div>`).join("");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter => `<button data-code-key="${letter}">${letter}</button>`).join("");
  return `${sceneBlock(item)}<section class="panel cipher-card">
    <div class="secret-preview final"><small>SECRET MESSAGE</small><b>${item.secretNumbers.join(" · ")}</b></div>
    <h3>Agent ${escapeHtml(student.alias)} — your cipher fragments</h3>
    <div class="mapping-grid">${mappings || `<p>No mappings assigned. Help the crew assemble theirs.</p>`}</div>
    ${item.adverseEvents.some(event => !event.restored) ? `<div class="alarm-warning">⚠ ALARM DAMAGE: one mapping was lost. Infer the missing letter from the word.</div>` : ""}
    ${student.isLead ? `<div class="code-entry"><h3>Event Lead: submit the crew’s decoded word</h3><div class="answer-display">${escapeHtml(draft.main || "TYPE THE MESSAGE")}</div><div class="letter-keypad">${alphabet}<button data-code-key="backspace">⌫</button></div><button class="primary wide" data-action="code.submit">Unlock Vault 7</button></div>` : `<div class="next-step active">Share your mappings. Event Lead ${escapeHtml(item.lead.alias)} will enter the final word.</div>`}
  </section>`;
}

const FINAL_ACTIONS = {
  isolate: ["Isolate Asterion", "Expose Helix, but leave a conscious intelligence imprisoned beneath the mountain."],
  destroy: ["Destroy the core", "Guarantee containment by erasing Asterion—and the only complete witness to Helix's crimes."],
  release: ["Release Asterion", "Give the intelligence access to the world and surrender control of what happens next."],
  copy: ["Copy and seal", "Take the archive, reseal the vault, and risk carrying more than evidence to the surface."]
};

function renderFinale(item, student) {
  const allVoted = item.finalVoteCount >= item.memberCount;
  const totals = item.finalVoteTotals ? `<div class="final-totals">${Object.entries(FINAL_ACTIONS).map(([key, value]) => `<span>${value[0]} <b>${item.finalVoteTotals[key] || 0}</b></span>`).join("")}</div>` : `<p class="fine">${item.finalVoteCount}/${item.memberCount} final votes recorded. Totals appear when everyone commits.</p>`;
  return `${sceneBlock(item)}<section class="panel finale-card">
    <p class="transmission">MESSAGE ACCEPTED // ${escapeHtml(item.decodedSecret)}</p>
    <p>This is the crew’s final choice. Each agent votes; if the result is tied, the Event Lead’s vote breaks the tie.</p>
    <div class="final-grid">${Object.entries(FINAL_ACTIONS).map(([key, value]) => `<button class="choice final-choice ${item.myFinalVote === key ? "selected" : ""}" data-finale-vote="${key}"><span class="selection-mark">✓ YOUR VOTE</span><b>${value[0]}</b><span>${value[1]}</span></button>`).join("")}</div>
    ${totals}
    ${student.isLead ? `<button class="primary wide" data-action="finale.resolve" ${!allVoted ? "disabled" : ""}>Authorize final action</button>` : `<p class="next-step ${allVoted ? "active" : ""}">${allVoted ? `All votes are in. Event Lead ${escapeHtml(item.lead.alias)} must authorize the final action.` : "Cast your vote, then make your case to the crew."}</p>`}
  </section>`;
}

function renderVictory(item, student) {
  const fate = student.fate;
  const r=item.extraction?.result;
  const equipment=item.inventory.map(id=>MARKET[id]?.[0]||id).join(' + ')||'No upgrade';
  const outcome=r?.outcome==='captured'?'was intercepted by Helix security; their beacon went silent':r?.outcome==='timeout'?'missed the extraction window and is listed missing in action':r?.outcome==='advanced'?'has an extraction record closed by mission control':r?.outcome==='fallback_extracted'?'reached the elevator through a carefully planned escape route':'reached the surface elevator';
  const operational=`${item.route==='shaft'?'The ventilation system':'The security corridor'} was the last barrier between the crew and the surface. ${item.inventory.length?`The ${equipment} shaped their escape.`:'They entered without equipment support.'}`;
  const aftermath=['extracted','fallback_extracted'].includes(r?.outcome)?fate?.id==='lost'?'The elevator made it out. During the surface transfer, injuries sustained earlier in the mission overwhelmed the recovery team. Your beacon stopped transmitting; mission control lists you missing in action.':fate?.id==='wounded'?'At the surface, the recovery team treats injuries sustained earlier in the mission. You leave Vault 7 wounded, but alive.':'You board the recovery transport alive. Behind you, the mountain disappears into the clouds.':r?.outcome==='advanced'?'Mission control closed this run without a simulated escape. No arcade success or failure is inferred. Your academic record remains separate.':'The recovery team records your last known position. The crew’s choice still takes effect, even for the agents who never see its consequences.';
  const title = item.scene?.title || (item.finalAction === "release" ? "The signal escaped" : "Mission accomplished");
  return `<section class="hero victory"><div><p class="eyebrow">VAULT 7 // FINAL RECORD</p><h1>${escapeHtml(title)}</h1><p>The crew's decision is now part of the world beyond Vault 7.</p></div><div class="vault-mark">✓</div></section>
    ${sceneBlock(item)}
    <section class="panel ending"><h2>Extraction report: Agent ${escapeHtml(student.alias)}</h2><p class="transmission">${escapeHtml(extractionLabel(r))} · ${r?.detections||0} detections · ${Math.round((r?.activeElapsedMs||0)/1000)} seconds</p><p>${escapeHtml(operational)} Agent ${escapeHtml(student.alias)} ${outcome}.</p><p>${escapeHtml(aftermath)}</p><div class="fate-card ${fate?.id}"><small>PERSONNEL RECORD</small><b>${escapeHtml(fate?.label || "Recorded")}</b><span>First-attempt accuracy: ${Math.round(student.firstAttemptCorrect / Math.max(1, student.assignedTotal??state.config.totalQuestions) * 100)}%</span></div><div class="summary"><span>Final action<b>${escapeHtml(FINAL_ACTIONS[item.finalAction]?.[0] || "—")}</b></span><span>Route<b>${escapeHtml(item.route || "—")}</b></span><span>Equipment<b>${escapeHtml(equipment)}</b></span><span>Decoded message<b>${escapeHtml(item.decodedSecret || "—")}</b></span><span>Code attempts<b>${item.codeAttempts}</b></span></div></section>`;
}

function noticeHtml() {
  if (!notice) return "";
  return `<div class="notice ${notice.pending ? "pending" : notice.correct ? "good" : "bad"}">${escapeHtml(notice.message)}</div>`;
}

function leadBanner(item, student) {
  if (!["decision", "market", "code", "finale"].includes(item.stage)) return "";
  return student.isLead ? `<div class="event-lead-banner"><span class="lead-badge">★ YOU ARE THE EVENT LEAD</span><span>Gather the crew’s input, then submit the final team action.</span></div>` : `<div class="lead-callout">Event Lead: ${escapeHtml(item.lead?.alias || "assigning…")}</div>`;
}

function statusBar(item, student) {
  return `<div class="statusbar"><span><i></i> HTTPS polling</span><span>${escapeHtml(item.name)}${student.isLead ? " · Event Lead" : ""}</span></div>`;
}

function bindStudentActions(item, student) {
  document.querySelectorAll("[data-action]").forEach(button => button.onclick = () => {
    const action = button.dataset.action;
    if (action === "math.submit") command(action, { answer: serializeAnswer(student.currentItem.answerType) });
    else if (action === "code.submit") command(action, { code: draft.main });
    else command(action);
  });
  document.querySelectorAll("[data-vote]").forEach(button => button.onclick = () => command("decision.vote", { choice: button.dataset.vote }));
  document.querySelectorAll("[data-finale-vote]").forEach(button => button.onclick = () => command("finale.vote", { choice: button.dataset.finaleVote }));
  bindEquipment(state.teams.find(t=>t.id===state.student?.teamId),command);
  document.querySelectorAll("[data-market-select]").forEach(button => button.onclick = () => command("market.select", { item: button.dataset.marketSelect }));
  document.querySelectorAll("[data-market-buy]").forEach(button => button.onclick = () => command("market.buy", { item: button.dataset.marketBuy }));
  document.querySelectorAll("[data-integer-mode]").forEach(button => button.onclick = () => { draft.integerMode = button.dataset.integerMode === "true"; activeField = "numerator"; renderStudent(); });
  document.querySelectorAll("[data-answer-field]").forEach(button => button.onclick = () => { activeField = button.dataset.answerField; renderStudent(); });
  document.querySelectorAll("[data-answer-key]").forEach(button => button.onclick = () => {
    const key = button.dataset.answerKey;
    if (key === "backspace") draft[activeField] = draft[activeField].slice(0, -1);
    else if (key === "minus") draft[activeField] = draft[activeField].startsWith("-") ? draft[activeField].slice(1) : `-${draft[activeField]}`;
    else if (key === "." && !draft[activeField].includes(".")) draft[activeField] += ".";
    else if (/^\d$/.test(key) && draft[activeField].length < (document.querySelector(".engine-keys") ? 60 : 12)) draft[activeField] += key;
    renderStudent();
  });
  document.querySelectorAll("[data-answer-choice]").forEach(button => button.onclick = () => { draft.choice = button.dataset.answerChoice; renderStudent(); });
  document.querySelectorAll("[data-answer-text]").forEach(button => button.onclick = () => {
    const key = button.dataset.answerText, word = /^(AM|PM)$/.test(key);
    if (draft.main.length < 60) draft.main += word && draft.main && !draft.main.endsWith(' ') ? ` ${key}` : key;
    renderStudent();
  });
  const engineText = document.querySelector("#engine-text-answer");
  if (engineText) {
    engineText.addEventListener("input", () => { draft.main = engineText.value; });
    engineText.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); draft.main = engineText.value; document.querySelector('[data-action="math.submit"]')?.click(); } });
  }
  document.querySelectorAll("[data-code-key]").forEach(button => button.onclick = () => {
    const key = button.dataset.codeKey;
    draft.main = key === "backspace" ? draft.main.slice(0, -1) : (draft.main + key).slice(0, 20);
    renderStudent();
  });
}

function renderLoading() {
  app.innerHTML = shell(`<section class="panel centered"><div class="spinner"></div><h2>Connecting to MathQuest</h2></section>`, true);
}

function drawQr(canvas, textValue) {
  if (!canvas || !window.QRCode || !window.QRErrorCorrectLevel) return;
  const fallback = document.querySelector("#qr-error");
  try {
    const qr = new window.QRCode(-1, window.QRErrorCorrectLevel.M);
    qr.addData(textValue);
    qr.make();
    const count = qr.getModuleCount();
    const margin = 4;
    const size = 180;
    const cell = Math.floor(size / (count + margin * 2));
    const codeSize = cell * count;
    const offset = Math.floor((size - codeSize) / 2);
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.fillStyle = "#000000";
    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (!qr.isDark(row, column)) continue;
        context.fillRect(offset + column * cell, offset + row * cell, cell, cell);
      }
    }
    if (fallback) fallback.hidden = true;
  } catch (error) {
    console.error("QR rendering failed", error);
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
  }
}

function render() {
  setBrandContext(document,session&&!sessionGone?state?.cartridge?.id:null);
  if(sessionGone){app.innerHTML=shell('<section class="panel"><h1>Session closed</h1><p>This hosted session has expired or been deleted. Its access credentials no longer work. Downloaded teacher exports are unaffected.</p><a href="./">Return to MathQuest</a></section>');return;}
  if(state&&!presentationFor(state.cartridge?.id)){app.innerHTML=shell('<section class="panel"><h1>Cartridge unavailable</h1><p>This session uses an unknown cartridge. Ask your teacher for a current session link.</p><a href="./">Return to MathQuest</a></section>');return;}
  if (!session) return renderLanding();
  if (teacherKey) return renderTeacher();
  if (!state || state.role === "guest") return renderJoin();
  renderStudent();
}

async function poll() {
  if (!session||sessionGone) return;
  if (busy) return;
  try {
    const query = !teacherKey&&deviceId ? `deviceId=${encodeURIComponent(deviceId)}` : "";
    const response = await fetchApi(`${endpoint("state")}${query ? `?${query}` : ""}`, { cache: "no-store" });
    const incoming = await parseResponse(response);
    if(incoming.expiresAt)localStorage.setItem(`mq-expiry-${session}`,String(incoming.expiresAt));
    const focusedJoinField = document.activeElement?.matches?.("#alias, #pin, [data-student-difficulty], #audio-volume, [data-threat], [data-supply-count], [data-supply-reuse]")||document.querySelector('dialog[open]');
    const changed = !state || incoming.revision !== state.revision || incoming.status !== state.status || incoming.paused !== state.paused;
    state = incoming;
    // Resolve branding even when the player is typing and the form stays mounted.
    const context=setBrandContext(document,state.cartridge?.id),joinButton=document.querySelector('#join');
    if(joinButton){joinButton.disabled=!context;joinButton.textContent=context?'Join session':'Cartridge unavailable';document.querySelector('[data-join-title]').textContent=context?.title||BRAND.name;document.querySelector('[data-join-mark]').innerHTML=markMarkup(context,true);}
    if (extractionRuntime && incoming.teams?.[0]?.stage === "extraction") extractionRuntime.update(incoming.teams[0], incoming.paused);
    if (changed && !focusedJoinField) render();
    else if(changed&&!context)render();
  } catch (error) {
    extractionRuntime?.connectionLost();
    if (!state) { notice = { correct: false, message: error.message }; render(); }
  }
}

window.addEventListener('mq-session-gone',event=>{if(event.detail.code!==session)return;sessionGone=true;extractionRuntime?.destroy();extractionRuntime=null;finaleHost?.destroy();finaleHost=null;forgetRoom(session);render();});
app.addEventListener('error', event => { if(event.target.matches?.('.scene-image img')) { event.target.hidden=true; event.target.nextElementSibling.hidden=false; } },true);
document.addEventListener('keydown',event=>{
  if(teacherKey||extractionRuntime||state?.student?.gateComplete||currentTeam()?.stage!=='gate'||document.activeElement?.matches('input,select,textarea')||event.ctrlKey||event.metaKey||event.altKey)return;
  const key=/^\d$/.test(event.key)?event.key:event.key==='Backspace'?'backspace':event.key==='-'?'minus':event.key==='.'?'.':null;
  if(key){const button=document.querySelector(`[data-answer-key="${key}"]`);if(button){event.preventDefault();button.click();return;}}
  if(event.key.length===1){const typed=event.key;const buttons=[...document.querySelectorAll('[data-answer-text]')];const button=buttons.find(b=>b.dataset.answerText.toLowerCase()===typed.toLowerCase()||(typed==='*'&&b.dataset.answerText==='×'))||(/^[ap]$/i.test(typed)?buttons.find(b=>b.dataset.answerText===typed.toUpperCase()+'M'):null);if(button){event.preventDefault();button.click();}}
  if(event.key==='Enter'){event.preventDefault();document.querySelector('[data-action="math.submit"]')?.click();}
});
app.addEventListener("click", handleDelegatedTeacherControl);
app.addEventListener("change", handleTeacherDifficulty);
render();
if (session) { poll(); setInterval(poll, 2500); }

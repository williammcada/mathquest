import {JOURNEY_BUILD} from '../public/games/journey/config.js';
import {isJourney,journeyCommand,journeyTeacher,syncJourney,syncJourneyTeacher,journeyProjection,acceptJourneyResult,deleteJourneyRuns} from './cartridges/journey/server.js';
export {BrawlRun} from './cartridges/journey/durable-object.js';
import {BLACKLINE_PERSONAL} from '../public/cartridges/blackline.js';
import {KINGSGATE_PERSONAL} from '../public/cartridges/kingsgate.js';
import {BLACKOUT_PERSONAL} from '../public/cartridges/blackout.js';
import {IRONBREAK} from '../public/cartridges/ironbreak.js';
import {COASTAL_PERSONAL} from '../public/cartridges/coastal-escape.js';
import {HAVEN_PERSONAL} from '../public/cartridges/false-haven.js';
import {settleRescues} from './cartridges/nightfall/rescue-server.js';
import {equipmentCommand,equipmentSlots,completeEquipmentBlock} from './engine/equipment.js';
import {serverFor} from './cartridges/registry.js';
import { withCors } from './cors.js';
import { normalizeCustomItem, hashSeed } from "./math.js";
import { checkAnswerFor } from "./answer-check.js";
import { ENGINE, LEGACY_MODULE_MAP, LEGACY_MODULE_TITLES, engineEntry, engineIdsFor, engineTitle, engineCatalogSummary, enginePreview } from "./engine-questions.js";
import { VAULT7_SECRETS } from "./vault7.js";
import { provideQuestion } from "./question-provider.js";
import { beginExtraction, settleExtractions, finishExtractions, extractionCommand, extractionProjection, extractionSummary } from './extraction.js';
import { cartridgeFor, CARTRIDGES, gateNames } from '../public/cartridges.js';
import { expansionFor, advanceExpansion, expansionCommand, expansionProjection, settleRuns } from './expansion.js';
import {assignedCount,loadsFor,gateTarget,extensionPreview,extendAssignments,finishCheckpoint} from './engine/extensions.js';
import {configureSupply,awardSupply} from './engine/supply.js';

const ACTIVE_MS = 20_000;
export const RETENTION_MS=48*60*60*1000;
const VERSION = "0.15.0";
// Constant-time check of the teacher passcode against the TEACHER_PASSCODE secret (never stored in the repo).
async function teacherGate(request, env) {
  const secret = typeof env.TEACHER_PASSCODE === "string" ? env.TEACHER_PASSCODE : "";
  if (secret.length < 8) return json({ error: "The teacher passcode is not set up on the server yet." }, { status: 503 });
  const given = request.headers.get("x-mathquest-teacher") || "";
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([given, secret].map(v => crypto.subtle.digest("SHA-256", enc.encode(v))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0 && given.length > 0 ? null : json({ error: "Teacher passcode not recognized." }, { status: 403 });
}
// Supported room versions: v0.9.2 and v0.9.4 onward, including every 0.10.x build (rooms survive candidate updates).
const supportedEngine=version=>["0.9.2","0.9.4","0.9.5","0.9.6","0.9.7","0.9.8","0.11.0","0.12.0","0.13.0","0.14.0","0.14.1",VERSION].includes(version)||/^0\.10\.\d+(?:-rc\.\d+)?$/.test(String(version));
const DIFFICULTY_POLICIES = ["session", "foundation", "standard", "challenge"];
const GATE_PATHS = {
  3: ["Perimeter Power", "Containment Laboratory", "Isolation Core"],
  4: ["Perimeter Power", "Biometric Checkpoint", "Archive Mainframe", "Isolation Core"],
  5: ["Perimeter Power", "Biometric Checkpoint", "Containment Laboratory", "Archive Mainframe", "Isolation Core"]
};

function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const cleanCode = value => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
const cleanText = (value, length = 60) => String(value || "").trim().replace(/[<>]/g, "").slice(0, length);
const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, Math.floor(Number(value) || fallback)));

function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
}

export function balancedGateLoads(total, gateCount) {
  const base = Math.floor(total / gateCount);
  const remainder = total % gateCount;
  return Array.from({ length: gateCount }, (_, index) => base + (index < remainder ? 1 : 0));
}

function shuffle(records, seed) {
  const result = [...records];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = hashSeed(`${seed}:${index}`) % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function sanitizeModules(config) {
  const raw = Array.isArray(config.modules) ? config.modules : [];
  if (raw.length > 20) throw new Error("A session may contain no more than 20 modules.");
  const output = [];
  for (const [moduleIndex, selected] of raw.entries()) {
    if (selected.source === "custom") {
      const title = cleanText(selected.title || `Teacher Module ${moduleIndex + 1}`, 50);
      const sourceItems = Array.isArray(selected.items) ? selected.items : [];
      if (sourceItems.length > 200) throw new Error(`${title} contains more than the 200-question session limit.`);
      const items = sourceItems
        .map((record, index) => normalizeCustomItem(record, index, title));
      if (items.length) output.push({ id: `custom.${hashSeed(title + moduleIndex)}`, title, source: "custom", band: "teacher", itemCount: items.length, items });
    } else if (selected.source === "engine" || selected.source === "preset" || LEGACY_MODULE_MAP[selected.id] || engineEntry(selected.id)) {
      // Math Engine module. A retired MathQuest module id ("preset") maps to its engine items;
      // its old Beginner/Intermediate/Advanced band is not used (spec D4).
      const engineIds = LEGACY_MODULE_MAP[selected.id] || (engineEntry(selected.id) ? [selected.id] : []);
      if (!engineIds.length) continue;
      if (output.some(module => module.id === selected.id)) continue;
      output.push({
        id: selected.id,
        title: LEGACY_MODULE_MAP[selected.id] ? LEGACY_MODULE_TITLES[selected.id] : engineTitle(selected.id),
        source: "engine",
        engineIds,
        itemCount: clamp(selected.itemCount, 1, 50, 3)
      });
    }
  }
  if (!output.length) {
    for (const [id, count] of [["g7-intadd", 1], ["g7-intsub", 1], ["g7-intmul", 1], ["g7-intdiv", 1], ["g6-gcf", 2], ["g6-lcm", 2]]) {
      output.push({ id, title: engineTitle(id), source: "engine", engineIds: [id], itemCount: count });
    }
  }
  return output;
}

function sanitizeRecentSecrets(config) {
  const known = new Set(VAULT7_SECRETS.map(record => record.id));
  return (Array.isArray(config.excludedSecretIds) ? config.excludedSecretIds : [])
    .map(value => cleanText(value, 30).toLowerCase())
    .filter((value, index, all) => known.has(value) && all.indexOf(value) === index)
    .slice(-18);
}

function teamTemplate(name, pin, index) {
  return {
    id: `team-${index + 1}`,
    name,
    pin,
    stage: "lobby",
    gateIndex: 0,
    leadIndex: 0,
    currency: 0,
    inventory: [],
    route: null,
    votes: {},
    marketSelections: {},
    marketReady: {},
    finalVotes: {},
    finalAction: null,
    briefingReady: {},
    codeAttempts: 0,
    adverseEvents: [],
    cipher: null,
    completedAt: null
  };
}

export default {
  async fetch(request, env) {
    return withCors(request, env, () => routeRequest(request, env), VERSION);
  }
};

async function routeRequest(request, env) {
    const url = new URL(request.url);
    const combat=url.pathname.match(/^\/api\/combat\/([a-f0-9-]{36})\/ws$/i);
    if(combat){
      if(!env.BRAWLS)return json({error:'Combat service unavailable'},{status:503});
      if(request.method!=='GET'||request.headers.get('upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket required'},{status:426});
      if(!request.headers.get('origin'))return json({error:'An approved browser origin is required'},{status:403});
      const dest=new URL(request.url);dest.pathname='/socket';return env.BRAWLS.get(env.BRAWLS.idFromName(combat[1])).fetch(new Request(dest,request));
    }
    if (url.pathname === "/api/health" && ["GET", "POST"].includes(request.method)) {
      return json({ ok: true, version: VERSION, service: "MathQuest", journeyBuild: JOURNEY_BUILD, transport: "https-polling", cors: true });
    }
    if (url.pathname === "/api/catalog" && request.method === "GET") return json({
      version: VERSION,
      cartridges: CARTRIDGES.map(({id,title,revision})=>({id,title,revision})),
      disciplines: [{ id: "mathematics", title: "Mathematics", enabled: true }, { id: "science", title: "Science", enabled: false }, { id: "humanities", title: "Humanities", enabled: false }, { id: "languages", title: "Languages", enabled: false }],
      engine: ENGINE,
      modules: engineCatalogSummary(),
      legacyModules: LEGACY_MODULE_MAP
    });
    // v0.14.0 teacher passcode (Worker secret TEACHER_PASSCODE). Room creation and answer previews are teacher-only.
    if (url.pathname === "/api/teacher-check" && request.method === "POST") {
      const gate = await teacherGate(request, env);
      return gate || json({ ok: true });
    }
    if (url.pathname === "/api/engine-preview" && request.method === "POST") {
      const gate = await teacherGate(request, env);
      if (gate) return gate;
      let input = {};
      try { input = await request.json(); } catch { /* empty */ }
      const ids = Array.isArray(input.ids) ? input.ids.map(String).slice(0, 20) : [];
      const variant = Number.isSafeInteger(input.variant) && input.variant >= 0 ? input.variant : 0;
      return json({ engine: ENGINE, items: enginePreview(ids, variant) });
    }
    if (url.pathname === "/api/sessions" && request.method === "POST") {
      const gate = await teacherGate(request, env);
      if (gate) return gate;
      let input = {};
      try { input = await request.json(); } catch { /* defaults */ }
      const code = randomCode();
      const teacherKey = crypto.randomUUID();
      const id = env.SESSIONS.idFromName(code);
      const response = await env.SESSIONS.get(id).fetch(new Request("https://session/init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, teacherKey, config: input })
      }));
      if (!response.ok) return response;
      return json({ code, teacherKey, teacherUrl: `/?session=${code}&teacher=${teacherKey}`, studentUrl: `/?session=${code}` });
    }
    const match = url.pathname.match(/^\/api\/sessions\/([A-Z0-9]{4,8})(?:\/(.*))?$/i);
    if (!match) return json({ error: "Not found" }, { status: 404 });
    if(!['state','command','report','report.csv','delete',''].includes(match[2]||''))return json({error:'Not found'},{status:404});
    const id = env.SESSIONS.idFromName(cleanCode(match[1]));
    const forwarded = new URL(request.url);
    forwarded.pathname = `/${match[2] || "state"}`;
    return env.SESSIONS.get(id).fetch(new Request(forwarded, request));
}

export class QuestSession {
  constructor(ctx,env={}) {
    this.ctx = ctx;
    this.env = env;
    this.state = this.freshState();
    this.ready = ctx.blockConcurrencyWhile(async () => {
      const saved=await ctx.storage.get('state');
      if(saved?._snapshotFormat==='mathquest-chunks-v1'){
        const parts=await Promise.all(Array.from({length:saved.parts},(_,i)=>ctx.storage.get(`state.part.${i}`)));
        if(parts.some(part=>typeof part!=='string'))throw new Error('A saved session snapshot is incomplete.');
        this.state=JSON.parse(parts.join(''));
      }else this.state=saved||this.freshState();
      if(this.state.code&&!this.state.expiresAt){this.state.expiresAt=Date.parse(this.state.createdAt)+RETENTION_MS;await this.save();}
      if(this.state.code)await this.scheduleAlarm();
    });
  }

  freshState() {
    return {
      version: VERSION,
      code: "",
      teacherKey: "",
      status: "setup",
      paused: false,
      createdAt: new Date().toISOString(),
      revision: 0,
      config: { cartridgeId: "vault-7", disciplineId: "mathematics", disciplineTitle: "Mathematics", gateCount: 3, gateNames: GATE_PATHS[3], modules: [], totalQuestions: 0, gateLoads: [], excludedSecretIds: [] },
      teams: {},
      students: {},
      processed: {},
      attempts: [],
      events: [],
      launchSummary: null
    };
  }

  async fetch(request) {
    // Serialize commands and the alarm: no in-flight save can resurrect deleted data.
    const work=(this.serial||Promise.resolve()).then(()=>this.handle(request));
    this.serial=work.catch(()=>{});return work;
  }
  async purge(){
    if(isJourney(this))await deleteJourneyRuns(this);
    if(!this.ctx.storage.deleteAll)throw Error('Deletion storage capability unavailable.');
    await this.ctx.storage.deleteAll();await this.ctx.storage.deleteAlarm?.();
    this.state={deleted:true};await this.ctx.storage.put('state',this.state);
  }
  async alarm(){
    const work=(this.serial||Promise.resolve()).then(async()=>{await this.ready;if(this.state.code&&Date.now()>=this.state.expiresAt)await this.purge();else if(this.state.code){const rescueChanged=settleRescues(this),runChanged=expansionFor(this)&&settleRuns(this);if(rescueChanged||runChanged)await this.save();else await this.scheduleAlarm();}});
    this.serial=work.catch(()=>{});return work;
  }
  async handle(request) {
    await this.ready;
    const url = new URL(request.url);
    if(this.state.deleted)return json({error:'This session was deleted. Local exports are unaffected.'},{status:410});
    if(this.state.code&&Date.now()>=this.state.expiresAt){await this.purge();return json({error:'This session expired after 48 hours and was deleted.'},{status:410});}
    if(url.pathname==='/journey-result'&&request.method==='POST'){
      if(!isJourney(this))return json({error:'Not found'},{status:404});
      const result=await acceptJourneyResult(this,await request.json());return json(result,{status:result.status||200});
    }
    const bearer=request.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
    const legacy=!supportedEngine(this.state.config?.engineVersion);
    const teacherKey=bearer||(legacy?url.searchParams.get('teacherKey'):null);
    if (url.pathname === "/init" && request.method === "POST") return this.init(request);
    if (!this.state.code) return json({ error: "Session not found" }, { status: 404 });
    if(url.pathname==='/delete'&&request.method==='POST'){
      if(!this.isTeacher(teacherKey))return json({error:'Teacher access required'},{status:403});
      await this.purge();return json({deleted:true,message:'Hosted session deleted. Exported files remain on your device.'});
    }
    if(supportedEngine(this.state.config.engineVersion)&&settleExtractions(this))await this.save();
    if(supportedEngine(this.state.config.engineVersion)&&expansionFor(this)&&settleRuns(this))await this.save();
    if(settleRescues(this))await this.save();
    if (url.pathname === "/state" && request.method === "GET") {
      const deviceId = cleanText(url.searchParams.get("deviceId"), 80);
      if(deviceId&&!this.isTeacher(teacherKey)&&this.state.students[deviceId]?.credential!==bearer)return json({error:'Student credential required'},{status:403});
      if(bearer&&!this.isTeacher(teacherKey)&&!deviceId)return json({error:'Invalid session credential'},{status:403});
      if(isJourney(this)){await syncJourney(this);await this.save();}
      const before=this.state.students[deviceId]?.currentItem;
      const touched=deviceId&&this.state.students[deviceId]&&this.touch(deviceId);
      const snapshot=this.snapshot({teacherKey,deviceId});
      if(touched||this.state.students[deviceId]?.currentItem!==before)await this.save();
      return json(snapshot);
    }
    if (url.pathname === "/command" && request.method === "POST") {
      let input;
      try { input = await request.json(); } catch { return json({ error: "Invalid command" }, { status: 400 }); }
      input.teacherKey=bearer||input.teacherKey;input.studentKey=bearer;
      const existing=this.state.students[input.deviceId];
      if(!String(input.type).startsWith('teacher.')&&(existing?existing.credential!==bearer:input.type!=='student.join'))return json({error:'Student credential required'},{status:403});
      if(String(input.type).startsWith('teacher.')&&!this.isTeacher(input.teacherKey))return json({error:'Teacher access required'},{status:403});
      const commandId = cleanText(input.commandId, 100);
      const actorKey=String(input.type).startsWith('teacher.')?'teacher':input.deviceId;
      const replayKey=actorKey+':'+commandId;
      if (commandId && this.state.processed[replayKey]) {
        const prior = this.state.processed[replayKey];
        const current = this.snapshot({ teacherKey: input.teacherKey, deviceId: input.deviceId });
        return json(prior.feedback ? { ...current, feedback: prior.feedback } : current);
      }
      let result;
      try{result=await this.command(input);if(isJourney(this)&&!result.error){await syncJourney(this);result={...result,...this.snapshot({teacherKey:input.teacherKey,deviceId:input.deviceId}),...(result.combatConnection?{combatConnection:result.combatConnection}:{})};}}catch(error){result={error:error.message,status:503};}
      if (commandId && !result.error) {
        this.state.processed[replayKey] = { type: cleanText(input.type, 40), revision: this.state.revision, feedback: result.feedback || null };
        const commandIds = Object.keys(this.state.processed);
        for (const expired of commandIds.slice(0, Math.max(0, commandIds.length - 250))) delete this.state.processed[expired];
      }
      await this.save();
      return json(result, { status: result.error ? (result.status || 400) : 200 });
    }
    if (url.pathname === "/report" && request.method === "GET") {
      if (!this.isTeacher(teacherKey)) return json({ error: "Teacher access required" }, { status: 403 });
      return json(this.report(), { headers: { "content-disposition": `attachment; filename=MathQuest_${this.state.code}.json` } });
    }
    if (url.pathname === "/report.csv" && request.method === "GET") {
      if (!this.isTeacher(teacherKey)) return json({ error: "Teacher access required" }, { status: 403 });
      return new Response(this.reportCsv(), { headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=MathQuest_${this.state.code}.csv`,
        "cache-control": "no-store"
      }});
    }
    return json({ error: "Not found" }, { status: 404 });
  }

  async init(request) {
    const input = await request.json();
    if (this.state.code) return json({ ok: true });
    const config = input.config || {};
    const cartridge=cartridgeFor(config.cartridgeId||'vault-7');
    if(!cartridge)return json({error:'This cartridge is not installed.'},{status:400});
    const names = (Array.isArray(config.teamNames) ? config.teamNames : []).map(name => cleanText(name, 24)).filter(Boolean).slice(0, 6);
    if(!names.length)names.push('Cipher','Vector');
    const gateCount = clamp(config.gateCount, 3, 5, 3);
    let modules;
    try { modules = sanitizeModules(config); }
    catch (error) { return json({ error: error.message }, { status: 400 }); }
    const totalQuestions = modules.reduce((sum, record) => sum + record.itemCount, 0);
    if (totalQuestions < gateCount) {
      return json({ error: `Select at least ${gateCount} questions so every gate contains mathematics.` }, { status: 400 });
    }
    if (totalQuestions > 200) return json({ error: "A session may contain no more than 200 questions per student." }, { status: 400 });
    this.state.code = cleanCode(input.code);
    this.state.teacherKey = String(input.teacherKey || "");
    this.state.expiresAt=Date.parse(this.state.createdAt)+RETENTION_MS;
    this.state.config = {
      cartridgeId: cartridge.id,
      cartridgeTitle: cartridge.title,
      cartridgeRevision: cartridge.revision,
      engineVersion:VERSION,
      privacyMode:'pilot',retentionHours:48,
      disciplineId: "mathematics",
      disciplineTitle: "Mathematics", courseBankId:'prealgebra', courseBankTitle:'Prealgebra',
      gateCount,
      gateNames: cartridge.contract?gateNames(cartridge,gateCount):GATE_PATHS[gateCount],
      modules,
      totalQuestions,
      gateLoads: balancedGateLoads(totalQuestions, gateCount),
      excludedSecretIds: sanitizeRecentSecrets(config)
    };
    names.forEach((name, index) => {
      const team = teamTemplate(name, randomCode(4), index);
      if(cartridge.id==='coastal-escape'){const loads=this.state.config.gateLoads;if(loads.every(n=>n===loads[0]))team.supply={count:loads[0],enabled:true,moduleIds:modules.filter(m=>(m.source==='engine'||m.source==='preset')).map(m=>m.id),allowReuse:false};}
      this.state.teams[team.id] = team;
    });
    this.addEvent("session-created", `${cartridge.title} created with ${totalQuestions} questions across ${gateCount} gates`);
    await this.save();
    await this.ctx.storage.setAlarm?.(this.state.expiresAt);
    return json({ ok: true });
  }

  async command(input) {
    const type = String(input.type || "");
    if(!supportedEngine(this.state.config.engineVersion)&&type!=='teacher.end')return {error:'This room belongs to an older release. Export and end it, then create a fresh v0.9 session.',status:409};
    if(type.startsWith('teacher.journey.'))return journeyTeacher(this,input);
    if(type.startsWith('teacher.')){const result=this.teacherCommand(input);if(!result.error)await syncJourneyTeacher(this,input);return result;}
    if (type === "student.join") return this.join(input);
    const student = this.studentFor(input.deviceId);
    if (!student) return { error: "Join the session first.", status: 403 };
    this.touch(student.id);
    if (this.state.status !== "active") return { error: this.state.status === "ended" ? "This session has ended." : "Waiting for the teacher to start." };
    if(isJourney(this)&&type.startsWith('journey.'))return journeyCommand(this,student,input);
    if(type.startsWith('extraction.'))return extractionCommand(this,student,input);
    if (this.state.paused) return { error: "The teacher has paused the session." };
    if (type === "briefing.ready") return this.briefingReady(student);
    if (type === "math.submit") return this.submitMath(student, input);
    if(['market.select','market.propose','market.ready','market.buy','market.commit','equipment.extend','supply.start'].includes(type))return equipmentCommand(this,student,input);
    if(expansionFor(this))return expansionCommand(this,student,input);
    if (type === "decision.vote") return this.vote(student, input);
    if (type === "decision.resolve") return this.resolveDecision(student);
    if (type === "market.select") return this.marketSelect(student, input);
    if (type === "market.ready") return this.marketReady(student);
    if (type === "market.buy") return this.marketBuy(student, input);
    if (type === "market.continue") return this.marketContinue(student);
    if (type === "code.submit") return this.submitCode(student, input);
    if (type === "finale.vote") return this.finaleVote(student, input);
    if (type === "finale.resolve") return this.resolveFinale(student);
    return { error: "Unknown command" };
  }

  teacherCommand(input) {
    if (!this.isTeacher(input.teacherKey)) return { error: "Teacher access required", status: 403 };
    const type = String(input.type);
    if(type==='teacher.setThreat'){
      const t=this.state.teams[input.teamId];
      if(this.state.config.cartridgeId!=='nightfall'||!t||this.state.status==='ended')return {error:'An open Nightfall team is required.'};
      if(t.threatLocked||Object.values(t.runs||{}).some(r=>r.status!=='not_started'))return {error:'Threat is locked because a crew member has started.'};
      if(!Number.isInteger(input.threat)||input.threat<0||input.threat>4)return {error:'Choose threat 0–4.'};
      t.threat=input.threat;for(const r of Object.values(t.runs||{}))r.threat=input.threat;
      this.addEvent('threat-configured',`Teacher set team threat to ${input.threat}`,t.id);this.bump();return this.snapshot({teacherKey:input.teacherKey});
    }
    if(type==='teacher.setSupply'){
      if(this.state.status==='ended')return {error:'An open session is required.'};
      return configureSupply(this,input);
    }
    if(type==='teacher.previewExtension'){const p=extensionPreview(this,input);return p.error?p:{...this.snapshot({teacherKey:input.teacherKey}),extensionPreview:p};}
    if(type==='teacher.extend')return extendAssignments(this,input);
    if(this.state.status==='ended')return type==='teacher.end'?this.snapshot({teacherKey:input.teacherKey}):{error:'This session has ended.'};
    if (type === "teacher.start") {
      if (this.state.status === "setup") {
        const students = Object.values(this.state.students);
        if (!students.length) return { error: "At least one student must join before launch." };
        const teams = Object.values(this.state.teams);
        const activeTeams = teams.filter(team => this.members(team.id).length > 0);
        const removedTeams = teams.filter(team => !this.members(team.id).length);
        for (const team of removedTeams) delete this.state.teams[team.id];
        this.state.launchSummary = {
          studentCount: students.length,
          activeTeamCount: activeTeams.length,
          removedTeamCount: removedTeams.length,
          removedTeamNames: removedTeams.map(team => team.name)
        };
        this.state.status = "active";
        const usedSecrets = new Set();
        for (const team of activeTeams) {
          team.stage = "briefing";
          if(this.state.config.cartridgeId==='vault-7')this.prepareCipher(team, usedSecrets);
          if (team.cipher?.variantId) usedSecrets.add(team.cipher.variantId);
        }
        if (removedTeams.length) this.addEvent("empty-teams-removed", `Removed ${removedTeams.length} empty team${removedTeams.length === 1 ? "" : "s"}: ${removedTeams.map(team => team.name).join(", ")}`);
        this.addEvent("session-started", `Teacher launched the ${this.state.config.cartridgeTitle||'Vault 7'} briefing for ${students.length} student${students.length === 1 ? "" : "s"} across ${activeTeams.length} team${activeTeams.length === 1 ? "" : "s"}`);
      }
    } else if (type === "teacher.setDifficulty") {
      const target = this.studentFor(input.studentId);
      if (!target) return { error: "That student is no longer in the session." };
      const policy = DIFFICULTY_POLICIES.includes(input.policy) ? input.policy : null;
      if (!policy) return { error: "Choose a valid difficulty policy." };
      target.difficultyPolicy = policy;
      this.addEvent("difficulty-policy-changed", `Teacher set ${target.alias}'s next unissued preset questions to ${policy}`, target.teamId, target.id);
    } else if (type === "teacher.pause") {
      if(this.state.paused&&expansionFor(this)){const duration=Date.now()-(this.state.pausedAt||Date.now());for(const t of Object.values(this.state.teams))if(t.stage==='minigame'&&t.finaleDeadline)t.finaleDeadline+=duration;}
      this.state.paused = !this.state.paused;
      if(this.state.paused)this.state.pausedAt=Date.now();
      else{const duration=Date.now()-(this.state.pausedAt||Date.now());for(const t of Object.values(this.state.teams)){if(t.stage==='extraction')t.extraction.deadlineAt+=duration;if(t.stage==='rescue'&&t.rescue){t.rescue.deadline+=duration;t.rescue.pausedMs+=duration;}}this.state.pausedAt=null;}
      this.addEvent(this.state.paused ? "session-paused" : "session-resumed", `Teacher ${this.state.paused ? "paused" : "resumed"} the session`);
    } else if(type==='teacher.closeRescue'){
      settleRescues(this,input.teamId||'*');
    } else if(type==='teacher.advanceFinale'&&expansionFor(this)){
      settleRuns(this,input.teamId||'*');
    } else if(type==='teacher.finishExtraction'){
      finishExtractions(this,input.teamId);
    } else if(type==='teacher.extractionFallback'){
      const target=this.studentFor(input.studentId);if(!target)return{error:'Student not found.',status:404};
      const result=extractionCommand(this,target,{type:'extraction.switchFallback'});if(result.error)return result;
    } else if (type === "teacher.end") {
      settleRescues(this,'*');
      if(expansionFor(this))settleRuns(this,'*');
      finishExtractions(this);
      this.state.status = "ended";
      this.addEvent("session-ended", "Teacher ended the session");
    } else return { error: "Unknown teacher command" };
    this.bump();
    return this.snapshot({ teacherKey: input.teacherKey });
  }

  join(input) {
    const deviceId = cleanText(input.deviceId, 80);
    const alias = `Agent ${String(Object.keys(this.state.students).length+1).padStart(3,'0')}`;
    const pin = cleanCode(input.teamPin).slice(0, 4);
    if (!deviceId || !pin) return { error: "Enter the team code." };
    if(!/^[a-zA-Z0-9-]{32,100}$/.test(input.studentKey||''))return {error:'A secure room credential is required. Reload this page.',status:403};
    const existing = this.state.students[deviceId];
    if (existing) {
      if(existing.credential!==input.studentKey)return {error:'Student credential required',status:403};
      this.touch(deviceId);
      return this.snapshot({ deviceId });
    }
    if (this.state.status !== "setup") return { error: "The roster is locked because the teacher has started the session." };
    const team = Object.values(this.state.teams).find(candidate => candidate.pin === pin);
    if (!team) return { error: "That team code is not valid." };
    if(isJourney(this)&&this.members(team.id).length>=5)return {error:"This Journey team already has five players. Choose another team."};
    if (Object.values(this.state.students).some(record => record.alias.toLowerCase() === alias.toLowerCase())) return { error: "That student name is already being used." };
    this.state.students[deviceId] = {
      id: deviceId,
      credential:input.studentKey,
      alias,
      teamId: team.id,
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      plan: [],
      itemsCompleted: 0,
      correct: 0,
      firstAttemptCorrect: 0,
      currentItem: null,
      gateProgress: 0,
      gateComplete: false,
      briefingReady: false,
      difficultyPolicy: "session"
    };
    this.addEvent("student-joined", `${alias} joined ${team.name}`, team.id, deviceId);
    this.bump();
    return this.snapshot({ deviceId });
  }

  preparePlan(student) {
    const assignments = [];
    for (const selected of this.state.config.modules) {
      if (selected.source === "custom") {
        selected.items.forEach((record, index) => assignments.push({
          source: "custom",
          moduleId: selected.id,
          moduleTitle: selected.title,
          itemIndex: index,
          seed: hashSeed(`${this.state.code}:${student.id}:${selected.id}:${index}`)
        }));
      } else {
        for (let index = 0; index < selected.itemCount; index += 1) {
          const seed = hashSeed(`${this.state.code}:${student.id}:${selected.id}:${index}`);
          assignments.push({ source: "engine", moduleId: selected.id, moduleTitle: selected.title, seed });
        }
      }
    }
    student.plan = shuffle(assignments, `${this.state.code}:${student.id}:mixed-plan`);
    student.gateLoads=[...this.state.config.gateLoads];student.assignedTotal=student.plan.length;
    student.currentItem = null;
    student.itemsCompleted = 0;
    student.gateProgress = 0;
    student.gateComplete = false;
  }

  materializeAssignment(student, assignment) {
    return provideQuestion({ modules: this.state.config.modules, student, assignment });
  }

  prepareCipher(team, sessionUsed = new Set()) {return serverFor(this).prepareCipher.call(this,team,sessionUsed);}

  briefingReady(student) {
    const team = this.teamFor(student);
    if (team.stage !== "briefing") return { error: "The briefing is already closed." };
    if (!student.plan.length) this.preparePlan(student);
    student.briefingReady = true;
    team.briefingReady[student.id] = true;
    this.addEvent("briefing-ready", `${student.alias} accepted the mission`, team.id, student.id);
    if (this.members(team.id).every(member => member.briefingReady)) this.openGate(team, 0);
    this.bump();
    return this.snapshot({ deviceId: student.id });
  }

  openGate(team, gateIndex) {
    team.stage = "gate";
    team.gateIndex = gateIndex;
    for (const member of this.members(team.id)) {
      member.gateProgress = 0;
      member.gateComplete = false;
      member.currentItem = null;
    }
    this.addEvent("gate-opened", `${team.name} entered ${this.state.config.gateNames[gateIndex]}`, team.id);
  }

  ensureItem(student) {
    if (student.currentItem) return student.currentItem;
    const team = this.teamFor(student);
    if (team.stage !== "gate" || student.gateComplete) return null;
    const record = this.materializeAssignment(student, student.plan[student.itemsCompleted]);
    if (!record) return null;
    student.currentItem = { ...record, extensionBatchId:student.plan[student.itemsCompleted]?.extensionBatchId||null, attempts: 0 };
    return student.currentItem;
  }

  submitMath(student, input) {
    const team = this.teamFor(student);
    if (team.stage !== "gate") return { error: "There is no individual math challenge open." };
    if (student.gateComplete) return { error: "Your contribution to this gate is complete." };
    const item = this.ensureItem(student);
    if (!item) return { error: "No question is available." };
    const checked = checkAnswerFor(item, input.answer);
    if (!checked.valid) return { error: checked.error };
    item.attempts += 1;
    this.state.attempts.push({
      at: new Date().toISOString(),
      studentId: student.id,
      alias: student.alias,
      teamId: team.id,
      gateIndex: team.gateIndex,
      gateName: team.extraGate?'Last Checkpoint':this.state.config.gateNames[team.gateIndex],
      moduleId: item.moduleId,
      moduleTitle: item.moduleTitle,
      itemId: item.id,
      prompt: item.prompt,
      answerType: item.answerType,
      disciplineId:item.disciplineId||'mathematics',courseBankId:item.courseBankId||'prealgebra',subskillId:item.subskillId||item.moduleId,source:item.source||'mathquest-preset',standards:item.standards||[],DOK:item.DOK||1,hintUsed:item.attempts>1&&!!item.hint,
      expected: item.answer,
      assignedDifficulty: item.assignedDifficulty || item.band || "teacher-authored",
      submitted: String(input.answer),
      normalized: checked.normalized,
      attempt: item.attempts,
      correct: checked.correct,
      answerPolicy:"MATH-FRAC-01", rejectionReason:checked.reason||null,
      firstAttempt: item.attempts === 1
      ,extensionBatchId:item.extensionBatchId||null
    });
    if (!checked.correct) {
      this.addEvent("answer-incorrect", `${student.alias} submitted an incorrect answer`, team.id, student.id);
      this.bump();
      return { ...this.snapshot({ deviceId: student.id }), feedback: { correct: false, message: checked.error || item.hint || "Not yet. Check your work, then try again." } };
    }
    student.correct += 1;
    completeEquipmentBlock(this,team,item);
    if (item.attempts === 1) student.firstAttemptCorrect += 1;
    student.itemsCompleted += 1;
    student.gateProgress += 1;
    student.currentItem = null;
    if (student.gateProgress >= gateTarget(this,student)) {
      student.gateComplete = true;
      this.addEvent("gate-contribution", `${student.alias} completed ${this.state.config.gateNames[team.gateIndex]}`, team.id, student.id);
      this.maybeAdvance(team);
    } else this.ensureItem(student);
    this.bump();
    return { ...this.snapshot({ deviceId: student.id }), feedback: { correct: true, message: "Correct. Contribution recorded." } };
  }

  maybeAdvance(team){if(finishCheckpoint(this,team))return;return serverFor(this).advance.call(this,team);}

  vote(student, input) {return serverFor(this).vote.call(this,student,input);}

  resolveDecision(student) {return serverFor(this).resolveDecision.call(this,student);}

  marketSelect(student, input) {return serverFor(this).marketSelect.call(this,student,input);}

  marketReady(student) {return serverFor(this).marketReady.call(this,student);}

  marketBuy(student, input) {return serverFor(this).marketBuy.call(this,student,input);}

  marketContinue(student) {return serverFor(this).marketContinue.call(this,student);}

  submitCode(student, input) {return serverFor(this).submitCode.call(this,student,input);}

  finaleVote(student, input) {return serverFor(this).finaleVote.call(this,student,input);}

  resolveFinale(student) {return serverFor(this).resolveFinale.call(this,student);}

  fateFor(student) {
    if(isJourney(this)){const outcome=this.teamFor(student)?.journeyResult?.outcome;return {id:outcome||"pending",label:outcome?"Journey: "+outcome:"Journey not completed"};}
    const personal=this.state.config.cartridgeId==='blackline'?BLACKLINE_PERSONAL:this.state.config.cartridgeId==='kingsgate'?KINGSGATE_PERSONAL:this.state.config.cartridgeId==='blackout-protocol'?BLACKOUT_PERSONAL:this.state.config.cartridgeId==='coastal-escape'?COASTAL_PERSONAL:this.state.config.cartridgeId==='nightfall-false-haven'?HAVEN_PERSONAL:null;
    if(personal){const outcome=this.teamFor(student)?.runs?.[student.id]?.outcome;return {id:outcome||'pending',label:personal[outcome]||'Operation pending'};}
    if(this.state.config.cartridgeId==='ironbreak'){const o=this.teamFor(student)?.runs?.[student.id]?.outcome;return {id:o||'pending',label:IRONBREAK.personal[o]||'Suit operation pending'};}
    if(expansionFor(this)){
      const outcome=this.teamFor(student)?.runs?.[student.id]?.outcome;
      return {id:outcome||'pending',label:outcome==='success'?'Reached the bus':['setback','lost'].includes(outcome)?'Did not make it out alive':outcome==='teacher_advanced'?'Closed by mission control':outcome==='timed_out'?'Awaiting review':'Crossing not recorded'};
    }
    const accuracy = student.firstAttemptCorrect / Math.max(1, assignedCount(this,student));
    const result=this.teamFor(student)?.extraction?.resultsByStudentId[student.id];
    if(result?.outcome==='advanced')return {id:'unresolved',label:'Extraction closed · status unconfirmed'};
    if(result?.status==='terminal'&&!['extracted','fallback_extracted','advanced'].includes(result.outcome))return{id:'lost',label:'Missing in action'};
    if (accuracy < .5) return { id: "lost", label: "Missing in action" };
    if (accuracy < .8) return { id: "wounded", label: "Wounded" };
    return { id: "escaped", label: "Escaped alive" };
  }

  snapshot(actor = {}) {
    const teacher = this.isTeacher(actor.teacherKey);
    const student = this.studentFor(actor.deviceId);
    if (student && this.teamFor(student)?.stage === "gate" && !student.currentItem && !student.gateComplete) this.ensureItem(student);
    const teams = Object.values(this.state.teams).map(team => this.teamProjection(team, teacher, student));
    const safeModules = this.state.config.modules.map(({ items, ...module }) => module);
    const { excludedSecretIds, ...safeConfig } = this.state.config;
    const base = {
      version: VERSION,
      code: this.state.code,
      status: this.state.status,
      expiresAt:this.state.expiresAt,
      paused: this.state.paused,
      revision: this.state.revision,
      config: { ...safeConfig, modules: safeModules },
      cartridge: { id: this.state.config.cartridgeId, title: this.state.config.cartridgeTitle||'Vault 7', revision:this.state.config.cartridgeRevision },
      launchSummary: this.state.launchSummary,
      teams
    };
    if (teacher) return { ...base, role: "teacher", studentUrl: `/?session=${this.state.code}`, attempts: this.state.attempts.length };
    if (!student) return { version:VERSION,code:base.code,status:base.status,expiresAt:this.state.expiresAt,cartridge:base.cartridge,config:{privacyMode:'pilot',retentionHours:48},teams:[],role:'guest' };
    const team = teams.find(record => record.id === student.teamId);
    const currentItem = student.currentItem ? {
      id: student.currentItem.id,
      prompt: student.currentItem.prompt,
      moduleId: student.currentItem.moduleId,
      moduleTitle: student.currentItem.moduleTitle,
      answerType: student.currentItem.answerType,
      options: student.currentItem.options || [],
      keys: student.currentItem.keys || [],
      promptMarkup: student.currentItem.promptMarkup || null,
      media: student.currentItem.media || null,
      unit:student.currentItem.unit||'',currency:student.currentItem.currency||'$',expectedForm:student.currentItem.source==='math-engine'?null:['fraction','mixed'].includes(student.currentItem.answerType)?(student.currentItem.representationInstruction||'Give your answer in simplest form'):student.currentItem.expectedForm||null,
      attempts: student.currentItem.attempts
    } : null;
    const privateTeam = this.state.teams[student.teamId];
    const myMappings = privateTeam.cipher?.mappings
      .filter(record => record.studentId === student.id)
      .map(record => ({ position: record.position, number: record.number, letter: record.status === "corrupted" ? null : record.letter, status: record.status })) || [];
    return {
      ...base,
      role: "student",
      student: {
        id: student.id,
        alias: student.alias,
        teamId: student.teamId,
        correct: student.correct,
        firstAttemptCorrect: student.firstAttemptCorrect,
        itemsCompleted: student.itemsCompleted,
        assignedTotal:assignedCount(this,student),gateLoad:gateTarget(this,student),
        gateProgress: student.gateProgress,
        gateComplete: student.gateComplete,
        briefingReady: student.briefingReady,
        currentItem,
        myMappings,
        fate: privateTeam.stage === "victory" ? this.fateFor(student) : null,
        isLead: this.isLead(student, privateTeam)
      },
      teams: [team]
    };
  }

  teamProjection(team, teacher, viewer) {
    const members = this.members(team.id);
    const lead = members[team.leadIndex % Math.max(1, members.length)];
    // Public IDs never authorize requests; private room-scoped bearer keys do.
    const visibleId=member=>teacher||viewer?.id===member.id?member.id:`crew-${hashSeed(`${this.state.code}:${member.id}`)}`;
    const visible = teacher || viewer?.teamId === team.id;
    const voteTotals = { shaft: 0, corridor: 0 };
    Object.values(team.votes).forEach(choice => { if (choice in voteTotals) voteTotals[choice] += 1; });
    const marketSelectionTotals = { scanner: 0, toolkit: 0, cloak: 0, none: 0 };
    Object.values(team.marketSelections).forEach(choice => { if (choice in marketSelectionTotals) marketSelectionTotals[choice] += 1; });
    const allVoted = members.length > 0 && Object.keys(team.votes).length >= members.length;
    const allMarketReady = members.length > 0 && Object.keys(team.marketReady).length >= members.length;
    const finalVoteTotals = { isolate: 0, destroy: 0, release: 0, copy: 0 };
    Object.values(team.finalVotes).forEach(choice => { if (choice in finalVoteTotals) finalVoteTotals[choice] += 1; });
    const allFinalVoted = members.length > 0 && Object.keys(team.finalVotes).length >= members.length;
    const projection = {
      id: team.id,
      name: team.name,
      pin: teacher ? team.pin : undefined,
      stage: team.stage,
      gateIndex: team.gateIndex,
      gateName: team.extraGate?'Last Checkpoint':this.state.config.gateNames[team.gateIndex] || null,
      extraGate:!!team.extraGate,
      gateLoad: this.state.config.gateLoads[team.gateIndex] || 0,
      currency: team.currency,
      inventory: team.inventory,
      route: team.route,
      lead: lead ? { id: visibleId(lead), alias: lead.alias } : null,
      briefingReadyCount: Object.keys(team.briefingReady).length,
      voteCount: Object.keys(team.votes).length,
      myVote: viewer?.teamId === team.id ? team.votes[viewer.id] || null : undefined,
      voteTotals: teacher || allVoted ? voteTotals : undefined,
      equipmentSlots:equipmentSlots(team), equipmentBlocks:team.equipmentBlocks||[], supply:team.supply||null,
      myMarketSelection: viewer?.teamId === team.id ? team.marketSelections[viewer.id] || null : undefined,
      marketSelectionTotals: teacher || allMarketReady ? marketSelectionTotals : undefined,
      marketReadyCount: Object.keys(team.marketReady).length,
      finalVoteCount: Object.keys(team.finalVotes).length,
      myFinalVote: viewer?.teamId === team.id ? team.finalVotes[viewer.id] || null : undefined,
      finalVoteTotals: teacher || allFinalVoted ? finalVoteTotals : undefined,
      finalAction: team.finalAction,
      memberCount: members.length,
      codeAttempts: team.codeAttempts,
      adverseEvents: team.adverseEvents,
      scene: team.extraGate?{title:'Last Checkpoint',eyebrow:'MISSION CONTROL',artId:'scene.cipher-assembly',paragraphs:['Complete the extra review assigned by your teacher. Your crew’s choices and equipment are preserved; the mission resumes from its pending decision afterward.']}:expansionFor(this)?null:serverFor(this).scene(team, members, this.state.config.gateNames),
      extraction:visible?extractionProjection(team.extraction,teacher,viewer?.id):null,
      secretNumbers: team.cipher?.numbers || [],
      secretAnswer: teacher ? team.cipher?.secret : undefined,
      secretVariantId: teacher ? team.cipher?.variantId : undefined,
      decodedSecret: visible && ["finale", "extraction", "victory"].includes(team.stage) ? team.cipher?.secret : undefined,
      completedAt: team.completedAt,
      members: visible ? members.map(member => ({
        id: visibleId(member),
        alias: member.alias,
        active: Date.now() - Date.parse(member.lastSeen) < ACTIVE_MS,
        itemsCompleted: member.itemsCompleted,
        assignedTotal:assignedCount(this,member),gateLoad:gateTarget(this,member),
        gateProgress: member.gateProgress,
        gateComplete: member.gateComplete,
        briefingReady: member.briefingReady,
        voted: Boolean(team.votes[member.id]),
        marketReady: Boolean(team.marketReady[member.id]),
        finalVoted: Boolean(team.finalVotes[member.id]),
        extractionComplete:team.extraction?.resultsByStudentId[member.id]?.status==='terminal',
        ...(teacher ? { difficultyPolicy: member.difficultyPolicy || "session" } : {}),
        fate: team.stage === "victory" ? this.fateFor(member) : null
      })) : undefined
    };
    if(isJourney(this))return {...projection,journey:visible?journeyProjection(this,team,viewer):null};
    return expansionFor(this)?expansionProjection(this,team,teacher,viewer,projection):projection;
  }

  report() {
    const students = Object.values(this.state.students).map(student => {
      const studentAttempts = this.state.attempts.filter(record => record.studentId === student.id);
      const firstAttemptAccuracy = student.firstAttemptCorrect / Math.max(1, studentAttempts.filter(a=>a.firstAttempt).length);
      const moduleSummary = {};
      for (const attempt of studentAttempts.filter(record => record.firstAttempt)) {
        moduleSummary[attempt.moduleTitle] ||= { issued: 0, firstAttemptCorrect: 0 };
        moduleSummary[attempt.moduleTitle].issued += 1;
        if (attempt.correct) moduleSummary[attempt.moduleTitle].firstAttemptCorrect += 1;
      }
      return {
        studentId:student.id,teamId:student.teamId,
        alias: student.alias,
        team: this.state.teams[student.teamId]?.name,
        questionsCompleted: student.itemsCompleted,
        totalQuestions: assignedCount(this,student),
        correct: student.correct,
        firstAttemptCorrect: student.firstAttemptCorrect,
        difficultyPolicy: student.difficultyPolicy || "session",
        firstAttemptAccuracy,
        narrativeFate: this.fateFor(student).label,
        masteryStatus: firstAttemptAccuracy >= .8 ? "Secure" : firstAttemptAccuracy >= .5 ? "Developing" : "Priority support",
        moduleSummary,
        extraction:this.teamFor(student)?.extraction?.resultsByStudentId[student.id]||null,
        academicSurvivalCategory:firstAttemptAccuracy<.5?'lost':firstAttemptAccuracy<.8?'wounded':'escaped'
      };
    });
    return {
      branding: "A WILLIAM MCADA PRODUCT",
      schemaVersion:'0.9.4',
      attribution: "Designed and built by William McAda · © 2026 William McAda",
      generatedAt: new Date().toISOString(),
      session: { code: this.state.code, status: this.state.status, config: { ...this.state.config, modules: this.state.config.modules.map(({ items, ...module }) => module) }, cartridge: this.state.config.cartridgeTitle||'Vault 7' },
      students,
      teams: Object.values(this.state.teams).map(team => ({
        name: team.name,
        route: team.route,
        currency: team.currency,
        inventory: team.inventory,
        stage: team.stage,
        gatesCompleted: ["code", "finale", "extraction", "victory"].includes(team.stage) ? this.state.config.gateCount : team.gateIndex,
        adverseEvents: team.adverseEvents,
        secretNumbers: team.cipher?.numbers,
        decodedSecret: team.stage === "victory" ? team.cipher?.secret : null,
        codeAttempts: team.codeAttempts,
        finalAction: team.finalAction,
        completedAt: team.completedAt
        ,extraction:extractionSummary(team.extraction),endingId:team.finalAction?`ending.${team.finalAction}`:null
      })),
      journeyTeamResults:isJourney(this)?Object.values(this.state.teams).map(t=>({teamId:t.id,result:t.journeyResult||null})):undefined,
      attempts: this.state.attempts,
      gameplayEvidence:Object.values(this.state.teams).flatMap(t=>Object.entries(t.runs||t.extraction?.resultsByStudentId||{}).map(([studentId,result])=>({evidenceType:'engagement.gameplay',studentId,teamId:t.id,alias:this.state.students[studentId]?.alias,cartridgeId:this.state.config.cartridgeId,route:t.route,equipment:t.inventory.join('|')||null,adverseCount:t.extraction?.adverseCount||0,finalChoice:t.finalAction,...result}))),
      rescueEvidence:Object.values(this.state.teams).flatMap(t=>Object.entries(t.rescue?.runs||{}).map(([studentId,r])=>({evidenceType:'engagement.gameplay',phase:'early-rescue',studentId,alias:this.state.students[studentId]?.alias,teamId:t.id,route:t.rescue.route,phaseId:t.rescue.phaseId,deadline:t.rescue.deadline,closedAt:t.rescue.closedAt,closureReason:r.closureReason||t.rescue.closeReason,runId:r.runId,mode:r.mode,usedAssisted:!!r.usedAssisted,outcome:r.outcome||r.status,attempts:r.startedAt?r.attempt:0,retries:r.retries,engineVersion:r.engineVersion,configRevision:r.configRevision,validation:r.validation||'not completed',completedAt:r.completedAt}))),
      audit: this.state.events
      ,extensions:this.state.extensions||[]
    };
  }

  reportCsv() {
    const report = this.report();
    const rows = [
      [report.branding],
      [report.attribution],
      [],
      ["Session", this.state.code, "Cartridge", this.state.config.cartridgeTitle||'Vault 7', "Status", this.state.status, "Gates", this.state.config.gateCount],
      [],
      ["Student alias", "Team", "Questions completed", "Questions assigned", "First-attempt correct", "First-attempt accuracy", "Mastery status", "Narrative fate"],
      ...report.students.map(student => [student.alias, student.team, student.questionsCompleted, student.totalQuestions, student.firstAttemptCorrect, Math.round(student.firstAttemptAccuracy * 100) + "%", student.masteryStatus, student.narrativeFate]),
      [],
      ["ATTEMPT LOG"],
      ["Timestamp", "Alias", "Team ID", "Gate", "Module", "Prompt", "Submitted", "Expected", "Attempt", "Correct", "First attempt"],
      ...report.attempts.map(record => [record.at, record.alias, record.teamId, record.gateName, record.moduleTitle, record.prompt, record.normalized, record.expected, record.attempt, record.correct, record.firstAttempt]),
      [],['ACADEMIC CONTEXT'],['Student ID','Item ID','Discipline','Course bank','Module ID','Subskill','Source','Difficulty','Standards','DOK','Hint used'],
      ...report.attempts.map(r=>[r.studentId,r.itemId,r.disciplineId,r.courseBankId,r.moduleId,r.subskillId,r.source,r.assignedDifficulty,(r.standards||[]).join('|'),r.DOK,r.hintUsed]),
      [],['EXTRACTION · ENGAGEMENT EVIDENCE'],['Student ID','Alias','Team ID','Route','Equipment','Alerts','Status','Outcome','Active ms','Detections','Integrity','Checkpoint','Accessible','Started','Completed','Build','Map revision'],
      ...report.gameplayEvidence.map(r=>[r.studentId,r.alias,r.teamId,r.route,r.equipment,r.adverseCount,r.status,r.outcome,r.activeElapsedMs,r.detections,r.integrityRemaining,r.checkpoint,r.fallbackUsed,r.startedAt,r.completedAt,r.clientBuild,r.mapRevision]),
      [],['TEAM OUTCOMES'],['Team','Final action','Ending','Credits','Route','Equipment','Completion reason'],...report.teams.map(t=>[t.name,t.finalAction,t.endingId,t.currency,t.route,t.inventory.join('|'),t.extraction?.completionReason])
    ];
    if(isJourney(this))rows.push([],['JOURNEY · ENGAGEMENT ONLY'],['Student ID','Alias','Team ID','Run ID','Hero','Personal upgrades','Participation','Team outcome','Reason','Lives used','Active ms','Build','Sample'],...report.gameplayEvidence.map(r=>[r.studentId,r.alias,r.teamId,r.runId,r.hero,(r.upgrades||[]).join('|'),r.participation,r.outcome,r.reason,r.livesUsed,r.activeElapsedMs,r.clientBuild,r.sample]));
    if(['nightfall','nightfall-false-haven'].includes(this.state.config.cartridgeId))rows.push([],[`${this.state.config.cartridgeTitle} · ENGAGEMENT ONLY`],['Student ID','Alias','Run ID','Configuration','Mode','Outcome','Active ms','Loadout','Shots','Hits','Vest blocks','Healing uses','Validation'],...report.gameplayEvidence.map(r=>[r.studentId,r.alias,r.runId,r.configRevision,r.mode,r.outcome,r.activeElapsedMs,(r.loadout||[]).join('|'),r.snapshot?.shots,r.snapshot?.hits,r.snapshot?.blocks,r.snapshot?.heals,r.validation]));
    rows.push([],['FIRST RESPONSE · ENGAGEMENT ONLY'],['Student ID','Alias','Team','Phase','Route','Mode','Outcome','Closure reason','Attempts','Retries'],...report.rescueEvidence.map(r=>[r.studentId,r.alias,r.teamId,r.phase,r.route,r.mode,r.outcome,r.closureReason,r.attempts,r.retries]));
    rows.push([],['LIVE EXTENSIONS'],['Batch ID','Time','Student ID','Alias','Added','Total assigned','Gate index','Difficulty'],...(report.extensions||[]).flatMap(batch=>batch.targets.map(t=>[batch.id,batch.at,t.studentId,t.alias,t.count,t.total,t.gateIndex===null?'Last Checkpoint':t.gateIndex+1,batch.policy])),[],['ATTEMPT EXTENSION CONTEXT'],['Item ID','Student ID','Batch ID'],...report.attempts.map(a=>[a.itemId,a.studentId,a.extensionBatchId||'initial']));
    if(this.state.config.cartridgeId==='ironbreak')rows.push([],['IRONBREAK · ENGAGEMENT ONLY'],['Student ID','Mode','Outcome','Closure reason','Attempts','Lives remaining','Checkpoint','Active ms','Upgrades','Boss HP','Guided steps','Validation'],...report.gameplayEvidence.map(r=>[r.studentId,r.mode,r.outcome,r.closureReason,r.attempt,r.lives,r.checkpoint,r.activeElapsedMs,(r.loadout||[]).join('|'),r.snapshot?.enemies?.find(e=>e.type==='boss')?.hp,r.guidedStep,r.validation]));
    if(this.state.config.cartridgeId==='blackout-protocol')rows.push([],['BLACKOUT PROTOCOL · ENGAGEMENT ONLY'],['Student ID','Mode','Outcome','Districts restored','Fuses left','Fuses blown','Tiles turned','Energize presses','Scans','Guided route','Active ms','Upgrades','Validation'],...report.gameplayEvidence.map(r=>{const g=r.snapshot?.game;return [r.studentId,r.mode,r.outcome,g?.restored?.length??0,g?.fuses??'',g?.stats?.fusesBlown??'',g?.stats?.rotations??'',g?.stats?.energizeAttempts??'',g?.stats?.scansUsed??'',g?.guided?'yes':'no',r.activeElapsedMs,(r.loadout||[]).join('|'),r.validation];}));
    if(this.state.config.cartridgeId==='coastal-escape')rows.push([],['COASTAL ESCAPE · ENGAGEMENT ONLY'],['Student ID','Mode','Outcome','Active ms','Loadout','Lives remaining','Checkpoint','Validation'],...report.gameplayEvidence.map(r=>[r.studentId,r.mode,r.outcome,r.activeElapsedMs,(r.loadout||[]).join('|'),r.snapshot?.lives,r.snapshot?.checkpoint,r.validation]));
    rows.push([],['V0.9 GAMEPLAY DETAILS'],['Student ID','Threat','Objectives','Door uses','Doors broken','Distractions','Toolkit checkpoints','Mode','Engine revision','Cloak used','Broken windows','Dispatch horde'],...report.gameplayEvidence.map(r=>[r.studentId,r.threat,Object.keys(r.snapshot?.tasks||r.objectives||{}).filter(k=>(r.snapshot?.tasks||r.objectives)[k]).join('|'),r.snapshot?.doorUses,r.snapshot?.doorsBroken,r.snapshot?.distractionsUsed,(r.jams||[]).join('|'),r.mode|| (r.fallbackUsed?'assisted':'action'),r.engineVersion||r.clientBuild,!!r.cloakUsed,Object.keys(r.snapshot?.windows||{}).join('|'),!!r.snapshot?.hordeTriggered]));
    return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  }

  studentFor(deviceId) { return this.state.students[cleanText(deviceId, 80)]; }
  teamFor(student) { return this.state.teams[student.teamId]; }
  members(teamId) {
    return Object.values(this.state.students)
      .filter(student => student.teamId === teamId)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  }

  isLead(student, team) {
    const members = this.members(team.id);
    return Boolean(members.length && members[team.leadIndex % members.length]?.id === student.id);
  }

  isTeacher(key) { return Boolean(key && key === this.state.teacherKey); }
  touch(deviceId) {
    const student = this.state.students[deviceId];
    if (!student) return false;
    const now = Date.now();
    if (now - Date.parse(student.lastSeen) < 5_000) return false;
    student.lastSeen = new Date(now).toISOString();
    return true;
  }
  bump() { this.state.revision += 1; }

  addEvent(type, message, teamId = null, studentId = null) {
    this.state.events.push({ at: new Date().toISOString(), type, message, teamId, studentId, revision: this.state.revision + 1 });
  }

  async scheduleAlarm(){
    if(!this.state.code||this.state.deleted)return;
    const deadlines=this.state.paused?[]:Object.values(this.state.teams).flatMap(t=>t.stage==='rescue'&&!t.rescue?.closedAt?[t.rescue.deadline]:t.stage==='minigame'&&t.finaleDeadline?[t.finaleDeadline]:[]);
    await this.ctx.storage.setAlarm?.(Math.max(Date.now(),Math.min(this.state.expiresAt,...deadlines)));
  }
  async save() {
    await this.scheduleAlarm();
    // Intensive review can exceed one SQLite KV value. Keep each piece bounded;
    // the storage transaction commits all pieces and their pointer together.
    const serialized=JSON.stringify(this.state),chunkSize=200000;
    if(serialized.length<=chunkSize)return this.ctx.storage.put('state',this.state);
    const saveParts=async storage=>{
      const parts=Math.ceil(serialized.length/chunkSize);
      for(let i=0;i<parts;i++)await storage.put(`state.part.${i}`,serialized.slice(i*chunkSize,(i+1)*chunkSize));
      await storage.put('state',{_snapshotFormat:'mathquest-chunks-v1',parts});
    };
    if(this.ctx.storage.transaction)await this.ctx.storage.transaction(saveParts);
    else await saveParts(this.ctx.storage); // In-memory local test adapter.
  }
}

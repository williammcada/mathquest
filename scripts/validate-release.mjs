import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {SceneAssets} from '../public/vault7-assets.js';
import {PRESET_MODULES} from '../src/math.js';
import {CATALOG} from '../public/catalog.js';
import {NIGHTFALL,CARTRIDGES} from '../public/cartridges.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
assert.deepEqual(CATALOG,PRESET_MODULES,'Regenerate public catalog after changing module metadata.');
const cartridge=JSON.parse(await readFile(resolve(root,'cartridges/vault-7.cartridge.json'),'utf8'));
assert.equal(cartridge.schemaVersion,'0.6.0');assert.equal(cartridge.miniGameManifest.enabled,true);
const hashes=new Set();
for(const asset of Object.values(SceneAssets)){
  const bytes=await readFile(resolve(root,'public',asset.src));assert.ok(bytes.length>1000&&bytes.length<200000);assert.equal(bytes.toString('ascii',8,12),'WEBP');hashes.add(createHash('sha256').update(bytes).digest('hex'));
  assert.ok((await stat(resolve(root,'public',asset.src.replace('.webp','-480.webp')))).size>1000);
}
assert.equal(hashes.size,15,'Every story scene must have distinct art.');
for(const track of cartridge.assetManifest.music)assert.ok((await stat(resolve(root,'public',track.source))).size>20000);
for(const folder of ['public','src'])for(const file of await readdir(resolve(root,folder))){if(!file.endsWith('.js'))continue;const run=spawnSync(process.execPath,['--check',resolve(root,folder,file)],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);}
const index=await readFile(resolve(root,'public/index.html'),'utf8');assert.ok(index.includes('app.js?v=0.9.8'));
for(const path of CARTRIDGES.filter(c=>c.assets).flatMap(c=>Object.values(c.assets)))assert.ok((await stat(resolve(root,'public',path))).size>1000,`Missing Nightfall asset: ${path}`);
assert.equal(NIGHTFALL.contract,'mq.cartridge/1.0');
async function validateTree(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())await validateTree(path);else if(entry.name.endsWith('.js')){const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);}}}
await validateTree(resolve(root,'public'));await validateTree(resolve(root,'src'));
for(const file of ['actors.png','tiles.png','props.png','ambient.mp3','danger.mp3','ending.mp3','effects.wav'])assert.ok((await stat(resolve(root,'public/assets/nightfall/city',file))).size>1000,`Missing city asset ${file}`);
const effects=await readFile(resolve(root,'public/assets/nightfall/city/effects.wav'));assert.equal(effects.toString('ascii',0,4),'RIFF');assert.equal(effects.toString('ascii',8,12),'WAVE');
console.log('Release validated: 25 modules; preserved Vault 7 assets; Nightfall story and city atlases, three music tracks and effects bank; recursive JavaScript syntax.');

for(const name of ['shot','shotgun','breach','step','glass','alarm','moan','enemy-death']){const bytes=await readFile(resolve(root,'public/assets/nightfall/city/v092',name+'.wav'));assert.ok(bytes.length>1000);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');}
// Nightfall Art Direction v1.0.0 (NF-ART-01): every shared sprite sheet ships as a 1024 px PNG.
for(const sheet of ['nightfall/shared/interactables-v1.png','nightfall/shared/furniture-v1.png','nightfall/shared/decals-v1.png','nightfall/shared/roofs-v1.png','false-haven/machinery-v1.png']){const bytes=await readFile(resolve(root,'public/assets',sheet));assert.equal(bytes.toString('ascii',1,4),'PNG',sheet);assert.equal(bytes.readUInt32BE(16),1024,sheet);assert.equal(bytes.readUInt32BE(20),1024,sheet);}
console.log('Nightfall sprite sheets validated: interactables, furniture, decals, roofs, machinery.');

import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assets=resolve(root,'public/assets/aerial-shooter');
const {BUILD_VERSION:V}=await import('../public/games/aerial-shooter/tuning.js');
const manifest=JSON.parse(await readFile(resolve(assets,'manifest.json'),'utf8'));
const art={},audio={};
for(const a of Object.values(manifest.assets))art[a.path]='data:image/webp;base64,'+(await readFile(resolve(assets,a.path))).toString('base64');
for(const name of Object.keys(manifest.audio))audio[name]=`data:${name.endsWith('.mp3')?'audio/mpeg':'audio/wav'};base64,`+(await readFile(resolve(assets,'audio',name))).toString('base64');
const result=await build({entryPoints:[resolve(root,'public/games/aerial-shooter/practice.js')],bundle:true,write:false,format:'iife',target:'safari16',minify:true,plugins:[{name:'embedded-aerial-media',setup(b){b.onLoad({filter:/\/(render|adapter|practice|action-host)\.js$/},async({path})=>{let source=await readFile(path,'utf8');
if(path.endsWith('/aerial-shooter/render.js')){
 source=source.replace("const BASE=new URL('../../assets/aerial-shooter/',import.meta.url);",`const EMBEDDED_ART=${JSON.stringify(art)};`)
 .replace("const res=await fetch(new URL('manifest.json',BASE));if(!res.ok)throw Error('Asset manifest unavailable');const manifest=await res.json();",`const manifest=${JSON.stringify(manifest)};`)
 .replace('new URL(a.path,BASE).href','EMBEDDED_ART[a.path]');
}
if(path.endsWith('/aerial-shooter/adapter.js'))source=source.replace("const audio=new URL('../../assets/aerial-shooter/audio/',import.meta.url);",`const EMBEDDED_AUDIO=${JSON.stringify(audio)};`).replace(/new URL\(([^,\n]+),audio\)\.href/g,'EMBEDDED_AUDIO[$1]');
if(path.endsWith('/aerial-shooter/practice.js'))source=source.replace('crypto.randomUUID()',"(globalThis.crypto?.randomUUID?.()||'practice-'+Date.now()+'-'+Math.random().toString(16).slice(2))").replace('Five-minute flight · touch recovery update · device verification pending',`Standalone v${V} · all media embedded · device verification pending`);
if(path.endsWith('/engine/action-host.js'))source=source.replace('href="./index.html"','href="#" aria-label="MathQuest aerial practice"');
return {contents:source,loader:'js'};
});}}]});
const css=await readFile(resolve(root,'public/games/aerial-shooter/practice.css'),'utf8');
const js=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#091a27"><title>MathQuest · Coastal Escape · Standalone v${V}</title><style>${css}</style></head><body><main id="flight"></main><dialog id="practice-settings" aria-labelledby="settings-title"></dialog><noscript>This game needs JavaScript enabled in a web browser.</noscript><script>${js}</script></body></html>`;
const out=resolve(root,'standalone/MathQuest_Aerial_Shooter_v'+V+'.html');await mkdir(dirname(out),{recursive:true});await writeFile(out,html);console.log(JSON.stringify({file:out,bytes:Buffer.byteLength(html),art:Object.keys(art).length,audio:Object.keys(audio).length}));

import {readFileSync,writeFileSync} from 'node:fs';
const files=['public/engine/held-input.js','public/engine/pad.js',...['config','world','simulation','renderer','input','audio'].map(n=>`public/games/shooter/${n}.js`),'public/practice-shooter.js'];
const parts=files.map(p=>readFileSync(p,'utf8').replace(/^import .*?;\n/gm,'').replace(/\bexport (?=const |function |class )/g,'')+(p.endsWith('/config.js')?'\nconst C=CONFIG;':''));
let html=readFileSync('public/practice-shooter.html','utf8').replace('<script src="./engine/audio-unlock.js?v=0.14.2"></script>',()=>'<script>'+readFileSync('public/engine/audio-unlock.js','utf8')+'</script>').replace('<link rel="stylesheet" href="practice-shooter.css">','<style>'+readFileSync('public/practice-shooter.css','utf8')+'</style>').replace('<script type="module" src="practice-shooter.js"></script>',()=>'<script>(()=>{\n'+parts.join('\n')+'\n})();</script>');
writeFileSync('public/Ironbreak-v0.1.0-practice.html',html);
console.log('Built Ironbreak-v0.1.0-practice.html from shared input and alpha.2 simulation.');

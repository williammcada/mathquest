import {createRequire} from 'node:module';
import fs from 'node:fs';
import {createState} from '../public/games/nightfall/simulation.js';
import {render} from '../public/games/nightfall/renderer.js';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const art={};for(const k of ['actors','tiles','props'])art[k]=await loadImage(`art-source/nightfall/city/${k}.png`);
const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');ctx.scale(2,2);const s=createState(['vest']);s.x=780;s.y=620;s.time=2;render(ctx,s,art);fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/nightfall-city.png',canvas.toBuffer('image/png'));

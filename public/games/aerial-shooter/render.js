import {T} from './tuning.js';
const BASE=new URL('../../assets/aerial-shooter/',import.meta.url);
export async function loadArt(){
  const res=await fetch(new URL('manifest.json',BASE));if(!res.ok)throw Error('Asset manifest unavailable');const manifest=await res.json();
  const images={},frames={};await Promise.all(Object.entries(manifest.assets).map(async([id,a])=>{const img=new Image();img.src=new URL(a.path,BASE).href;await img.decode();if(img.naturalWidth!==a.width||img.naturalHeight!==a.height)throw Error(`Wrong artwork revision: ${id}`);const sizes={ocean:[640,640],island:[210,620],harbor:[512,768]};
    if(sizes[id]){const c=document.createElement('canvas');[c.width,c.height]=sizes[id];const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(img,0,0,c.width,c.height);images[id]=c;}
    else {const size={player:[84,108],fighter:[84,96],interceptor:[90,102],bomber:[168,144],supply:[144,132],boss:[1320,390],ship:[192,240],shore:[144,144],explosion:[300,300]}[id];frames[id]=a.frames.map(f=>{const c=document.createElement('canvas');[c.width,c.height]=size;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(img,...f,0,0,c.width,c.height);return c;});}}));
  return {manifest,images,frames};
}
function sprite(ctx,art,id,x,y,w,h,frame=0){const frames=art.frames[id];ctx.drawImage(frames[frame%frames.length],x-w/2,y-h/2,w,h);}
function line(ctx,x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function ring(ctx,x,y,r,color){ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
function smoke(ctx,art,x,y,t,w=28){sprite(ctx,art,'explosion',x,y,w,w,4+Math.floor(t/10)%2);}
function scenery(ctx,s,art){
 const scroll=s.levelTick/60*T.scroll,offset=scroll%640;
 for(let y=offset-640;y<360;y+=640)ctx.drawImage(art.images.ocean,0,y,640,640);
 if(s.levelTick>=2333&&s.levelTick<6333){const local=(scroll-1260)%620;ctx.globalAlpha=.85;ctx.drawImage(art.images.island,-35,local-620,210,620);ctx.drawImage(art.images.island,500,local-400,165,490);ctx.globalAlpha=1;}
 if(s.levelTick>=5667&&s.levelTick<9000){const local=(scroll-3060)%768;ctx.globalAlpha=.84;for(let y=local-768;y<360;y+=768)ctx.drawImage(art.images.harbor,190,y,512,768);ctx.globalAlpha=1;}
 ctx.fillStyle='rgba(1,16,30,.35)';ctx.fillRect(0,0,640,360);
}
export function render(ctx,s,art,{colliders=false,reducedMotion=false}={}){
 ctx.save();ctx.clearRect(0,0,640,360);ctx.imageSmoothingEnabled=false;scenery(ctx,s,art);
 const phase=Math.floor(s.tick/6)%4;
 for(const e of s.enemies.filter(e=>['ship','shore'].includes(e.kind)))sprite(ctx,art,e.kind,e.x,e.y,e.w,e.h,e.kind==='shore'?(e.hp<30?2:e.warningUntil>s.tick?1:0):phase);
 for(const e of s.enemies.filter(e=>!['ship','shore'].includes(e.kind))){ctx.globalAlpha=.18;ctx.fillStyle='#00111b';ctx.beginPath();ctx.ellipse(e.x+7,e.y+10,e.w*.42,e.h*.23,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  const bank=e.kind==='interceptor'?(Math.cos(e.age/45+e.phase)<0?1:2):0;
  sprite(ctx,art,e.kind,e.x,e.y,e.w,e.h,['fighter','interceptor'].includes(e.kind)?phase*3+bank:phase);
  if(e.hp<T.enemies[e.kind].hp*.4&&!reducedMotion)smoke(ctx,art,e.x,e.y-10,s.tick,18);
  if(e.kind==='supply'){ctx.fillStyle='#ffd55c';ctx.fillRect(e.x-12,e.y+25,24,15);ctx.fillStyle='#172332';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(({repair:'+',spread:'S',rapid:'R',wingman:'W'})[e.pickup],e.x,e.y+36);}
 }
 for(const e of s.enemies)if(e.warningUntil>s.tick){ring(ctx,e.x,e.y,Math.max(e.w,e.h)*.5,'#ffda78');if(e.kind==='ship'||e.kind==='shore'||e.kind==='interceptor')line(ctx,e.x,e.y,s.player.x,s.player.y,'#ffe6a955');}
 const b=s.boss;if(b){sprite(ctx,art,'boss',b.x,b.y-18,440,130,phase%3);
  for(let i=0;i<2;i++){const x=b.x+(i?180:-180),y=b.y+5;if(b.guns[i]>0){ring(ctx,x,y,17,'#ffc15a');ctx.fillStyle='#291c24';ctx.fillRect(x-20,y-30,40,4);ctx.fillStyle='#ffbd60';ctx.fillRect(x-20,y-30,40*b.guns[i]/T.boss.gunHP,4);}else{ctx.fillStyle='#352c31';ctx.fillRect(x-10,y-10,20,24);smoke(ctx,art,x,y-5,s.tick,36);}}
  // v0.3.0: the exposed core and its salvo are drawn from the painted explosion sheet, not shapes.
  if(b.phase==='core'||b.phase==='transition'){const flick=reducedMotion?0:Math.floor(s.tick/8)%2;sprite(ctx,art,'explosion',b.x,b.y+30,44,44,3+flick);sprite(ctx,art,'explosion',b.x,b.y+34,26,26,flick);}
  else if(b.phase!=='entry'){ctx.strokeStyle='#9eaab8';ctx.lineWidth=2;ctx.strokeRect(b.x-13,b.y+23,26,23);}
  if(b.warningUntil>s.tick){const charge=1-(b.warningUntil-s.tick)/39,size=16+charge*34;sprite(ctx,art,'explosion',b.x,b.y+51,size,size,charge<.5?0:1);}
 }
 for(const p of s.pickups){ctx.save();ctx.translate(p.x,p.y);const pulse=reducedMotion?0:Math.sin(s.tick/5)*1.5;ctx.fillStyle=p.kind==='repair'?'#69ecb6':'#ffe06c';ctx.strokeStyle='#09283b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-13-pulse);ctx.lineTo(13+pulse,0);ctx.lineTo(0,13+pulse);ctx.lineTo(-13-pulse,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#0a2030';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText(({repair:'+',spread:'S',rapid:'R',wingman:'W'})[p.kind],0,5);ctx.restore();}
 for(const bullet of s.hostile){if(bullet.damage===20){sprite(ctx,art,'explosion',bullet.x,bullet.y,22,22,reducedMotion?0:Math.floor((s.tick+bullet.x)/5)%2);continue;}ctx.fillStyle='#0c1925';ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.radius+2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffc85a';ctx.beginPath();ctx.arc(bullet.x,bullet.y,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff3cf';ctx.fillRect(bullet.x-1,bullet.y-1,2,2);}
 for(const bullet of s.friendly){ctx.fillStyle=s.config.loadout.includes('weapons')?'#74eaff':'#ffe89b';ctx.fillRect(bullet.x-2,bullet.y-5,4,10);ctx.fillStyle='#fff';ctx.fillRect(bullet.x-.5,bullet.y-7,1,9);}
 if(!s.outcome||s.outcome!=='defeat'){
  if(s.bonus?.kind==='wingman')sprite(ctx,art,'player',Math.max(12,s.player.x-35),s.player.y+12,22,28,phase*3);
  const bank=s.player.dx<0?1:s.player.dx>0?2:0;ctx.globalAlpha=s.player.protection>0&&Math.floor(s.tick/6)%2?.6:1;
  sprite(ctx,art,'player',s.player.x,s.player.y,28,36,phase*3+bank);ctx.globalAlpha=1;
  if(s.player.protection>0)ring(ctx,s.player.x,s.player.y,22,'#a8f1ff');
  if(s.health<s.maxHealth*.3&&!reducedMotion)smoke(ctx,art,s.player.x,s.player.y+18,s.tick,18);
 }
 for(const e of s.effects){if(e.kind==='explosion')sprite(ctx,art,'explosion',e.x,e.y,46,46,Math.min(5,Math.floor(e.age/6)));else if(e.kind==='retreat'){ctx.globalAlpha=1-e.age/36;ring(ctx,e.x,e.y,10+e.age,'#c6e9ff');ctx.globalAlpha=1;}else ring(ctx,e.x,e.y,4+e.age/2,e.kind==='shield'?'#bfdfff':'#fff3b0');}
 if(s.outcome==='success'){sprite(ctx,art,'explosion',b?.x||320,b?.y||90,200,120,2);}
 if(colliders){ctx.strokeStyle='#7fff8d';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(s.player.x,s.player.y,8,12,0,0,Math.PI*2);ctx.stroke();for(const e of s.enemies)ctx.strokeRect(e.x-e.w*.42,e.y-e.h*.42,e.w*.84,e.h*.84);}
 ctx.restore();
}

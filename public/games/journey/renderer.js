import {HERO_ART,HERO_CLIPS} from './hero-art.js';
import {FRAME_BOUNDS} from './frame-bounds.js';
import {FRAME_REPAIRS,REPAIR_ATLASES} from './frame-repairs.js';
import {ENEMY_ART,ENEMY_REPAIR_FILE,enemyClip,enemyBounds} from './enemy-art.js';
import {ENVIRONMENTS,drawEnvironment} from './environment-art.js?v=art1';
const SOURCE=256;
const clips=HERO_CLIPS;
const enemyClips={walk:[2,3,4,5],windup:[6,7],attack:[8,9],recover:[10,11],hurt:[12,13],down:[17]};
export class JourneyRenderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.images={};this.frames=new Map();this.snapshot=null;this.started=performance.now();
    // Scenery starts first so sprite-atlas downloads cannot starve the backdrop.
    for(const env of ENVIRONMENTS)this.loadImage('environment-'+env.id,env.file,true);
    for(const [key,file] of [...Object.entries(HERO_ART).map(([key,art])=>[key,art.file]),...Object.entries(ENEMY_ART).map(([key,art])=>[key,art.file]),['baozi','baozi-stage9.webp'],['elixir','elixir-stage9.webp'],['crate','crate-stage9.webp'],['enemy-repairs',ENEMY_REPAIR_FILE],['enemy','raider-stage1.webp'],['horse','prince-charge-stage3.webp'],...Object.entries(REPAIR_ATLASES)]){this.loadImage(key,file);}this.images.hero=this.images.wukong;

  }
  loadImage(key,file,priority=false){
    const img=new Image();let attempts=0;
    if(priority)img.fetchPriority='high';
    const url=new URL('../../assets/journey/'+file,import.meta.url);
    img.onerror=()=>{if(attempts++<2)setTimeout(()=>{const retry=new URL(url);retry.searchParams.set('retry',attempts);img.src=retry.href;},1000*attempts);};
    this.images[key]=img;img.src=url.href;return img;
  }
  set(snapshot){this.snapshot=snapshot;}
  sprite(img,frame,x,y,size,facing=1,alpha=1,bounds=null){if(!img||!img.complete||!img.naturalWidth)return;
    const c=this.ctx;c.save();c.globalAlpha=alpha;c.translate(Math.round(x),Math.round(y));c.scale(facing,1);
    // Cells retain padding and a common foot anchor. No baked scene or hitbox.
    const source=bounds?.source||[(frame%6)*SOURCE,Math.floor(frame/6)*SOURCE,SOURCE,SOURCE],pivot=bounds?.pivot||[128,245.76],scale=size/SOURCE*(bounds?.scale??1);
    c.drawImage(img,...source,-pivot[0]*scale,-pivot[1]*scale,source[2]*scale,source[3]*scale);c.restore();}
  draw(now=performance.now()){
    const canvas=this.canvas,c=this.ctx,s=this.snapshot;if(!c)return;
    if(canvas.width!==960||canvas.height!==420){canvas.width=960;canvas.height=420;}c.imageSmoothingEnabled=false;
    drawEnvironment(c,this.images,s);
    if(!s){c.fillStyle='#dce7dc';c.font='20px system-ui';c.textAlign='center';c.fillText('Connecting to your team…',480,260);return;}
    const time=(now-this.started)/1000;
    // Painted objects, never collision/range geometry. Source padding is cropped
    // at draw time; the original transparent asset bytes remain unchanged.
    const itemArt=(key,x,y,w,h,source)=>{const img=this.images[key];if(img?.complete&&img.naturalWidth)c.drawImage(img,...source,x-w/2,y-h,w,h);};
    for(const prop of s.props||[])if(prop.hp>0){
      const struck=(s.events||[]).some(e=>e.type==='propHit'&&e.propId===prop.id&&s.activeMs-e.at<120);
      itemArt('crate',prop.x+(struck?Math.sin(time*80)*2:0),prop.y,48,44,[140,130,1090,980]);
    }
    for(const item of s.pickups||[])if(!item.taken){
      const y=item.y-3-Math.sin(time*4)*3;
      if(item.kind==='health')itemArt('baozi',item.x,y,43,39,[350,190,840,760]);
      else itemArt('elixir',item.x,y,37,48,[300,55,970,1060]);
    }
    for(const b of s.projectiles||[]){c.strokeStyle=b.kind==='ring'?'#ffe585':'#c49dff';c.lineWidth=4;c.beginPath();c.arc(b.x,b.y-12,b.kind==='ring'?13:6,0,Math.PI*2);c.stroke();}
    const actors=[...(s.enemies||[]).map(e=>({...e,enemy:true})),...(s.players||[]).filter(p=>p.started&&p.visible).map(p=>({...p,enemy:false}))].sort((a,b)=>a.y-b.y);
    for(const a of actors){
      c.fillStyle='#172928aa';c.beginPath();c.ellipse(a.x,a.y,21,6,0,0,Math.PI*2);c.fill();
      const action=a.enemy?(a.hp<=0?'down':a.hurt>0?'hurt':a.phase):(s.phase==='terminal'&&s.result?.outcome==='victory'?'victory':a.action);
      const signature=action+(a.enemy?a.move||'':a.combo);let cache=this.frames.get(a.id);if(!cache||cache.signature!==signature){cache={signature,start:now};this.frames.set(a.id,cache);}
      const list=(a.enemy?enemyClips:clips)[action]||[0],rate=action==='attack'?80:action==='walk'?105:200;
      const index=Math.floor((now-cache.start)/rate),frame=list[['idle','walk','special','victory'].includes(action)&&!(a.hero==='prince'&&action==='special')?index%list.length:Math.min(index,list.length-1)];
      const jump=!a.enemy&&a.jumpMs>0?Math.sin((1-a.jumpMs/700)*Math.PI)*55:0;
      const alpha=!a.enemy&&a.protectionMs>0?(Math.floor(now/90)%2?.45:1):1;
      const art=a.enemy?null:HERO_ART[a.hero],repair=a.enemy?null:FRAME_REPAIRS[a.hero]?.[frame];
      if(a.enemy&&a.kind!=='raider'){
        const seq=a.kind==='nezha'&&a.hp<=0?[11]:enemyClip(a),elapsed=now-cache.start;
        const i=Math.floor(elapsed/(action==='walk'||action==='reposition'?140:180));
        const f=seq[['idle','walk','reposition'].includes(action)?i%seq.length:Math.min(i,seq.length-1)],bounds=enemyBounds(a.kind,f);
        const leap=a.kind==='leaper'&&a.phase==='attack'&&a.hp>0?Math.sin(Math.PI*Math.max(0,Math.min(1,1-a.timer/450)))*36:0;
        this.sprite(this.images[bounds.image],f,a.x,a.y-leap,ENEMY_ART[a.kind].size,a.facing,a.phase==='entrance'?.45:1,bounds);
      }else if(!a.enemy&&a.hero==='prince'&&action.startsWith('horse')){
        const horseFrames={'horse-transform':[0,1],'horse':[4,5,6,7],'horse-idle':[2],'horse-turn':[8],'horse-impact':[9],'horse-return':[10,11]};
        const seq=horseFrames[action]||[2],idx=Math.floor((now-cache.start)/100),f=seq[action==='horse'?idx%seq.length:Math.min(idx,seq.length-1)];
        const rows=[0,290,520,765,1024],row=Math.floor(f/4),col=f%4,feet=[272,510,758,997];
        this.sprite(this.images.horse,f,a.x,a.y,104,a.facing,alpha,{source:[col*384,rows[row],384,rows[row+1]-rows[row]],pivot:[192,feet[row]-rows[row]]});
      }else this.sprite(this.images[repair?.image||(a.enemy?'enemy':a.hero)],frame,a.x,a.y-jump,a.enemy?96:art.size,a.facing,alpha,a.enemy?null:repair||FRAME_BOUNDS[a.hero]?.[frame]);
      if(!a.enemy&&a.hero==='wukong'&&a.action==='special')for(const offset of [-55,55])this.sprite(this.images.wukong,frame,a.x+offset,a.y-jump,art.size,a.facing,.35,FRAME_BOUNDS.wukong?.[frame]);
      if(a.enemy&&a.phase==='windup'){c.fillStyle='#ffd78c';c.font='bold 18px system-ui';c.textAlign='center';c.fillText('!',a.x,a.y-90);}
      if(a.hp>0){c.fillStyle='#142122';c.fillRect(a.x-22,a.y-100,44,4);c.fillStyle=a.enemy?'#c47165':'#a7dd92';c.fillRect(a.x-22,a.y-100,44*a.hp/a.maxHp,4);}
      if(!a.enemy){c.font='11px system-ui';c.textAlign='center';c.fillStyle='#eff4ec';c.fillText(a.alias,a.x,a.y+18);}
    }
    c.fillStyle='#d9c99c';c.font='14px system-ui';c.textAlign='left';c.fillText(s.level?.name?.toUpperCase()||'MOUNTAIN TRAINING COURT',28,31);
    c.fillStyle='#adbdc5';c.font='12px system-ui';c.textAlign='right';c.fillText('PLAY-TEST CANDIDATE',932,31);
    if(s.level?.bossWarning&&s.level.stage<4){c.fillStyle='#ffe585';c.font='bold 18px system-ui';c.textAlign='center';c.fillText('NEZHA IS APPROACHING',480,65);}
    const boss=s.enemies?.find(e=>e.kind==='nezha');if(boss){c.fillStyle='#182533';c.fillRect(200,55,560,14);c.fillStyle='#eda46b';c.fillRect(200,55,560*Math.max(0,boss.hp)/boss.maxHp,14);c.fillStyle='#fff';c.font='13px system-ui';c.textAlign='center';c.fillText('NEZHA · '+Math.ceil(boss.hp)+' / '+boss.maxHp,480,88);}
  }
}

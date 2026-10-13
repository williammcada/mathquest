import S from './sim.js';
const W=480,H=270;
class Renderer{
 constructor(canvas){this.c=canvas;this.g=canvas.getContext('2d',{alpha:false});this.motion=true;this.g.imageSmoothingEnabled=false;}
 poly(points,color){const g=this.g;g.fillStyle=color;g.beginPath();points.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();}
 rect(x,y,w,h,c){const g=this.g;g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 background(s,time){const g=this.g,area=S.section(s.z),palette=S.SECTIONS[area];const grad=g.createLinearGradient(0,0,0,175);grad.addColorStop(0,palette.sky[0]);grad.addColorStop(.6,palette.sky[1]);grad.addColorStop(1,palette.sky[2]);g.fillStyle=grad;g.fillRect(0,0,W,H);
  // Smog sun and rainless, readable industrial skyline.
  this.rect(341,34,48,2,'#bb675a');for(let i=0;i<9;i++)this.rect(333+Math.abs(4-i)*2,37+i*4,64-Math.abs(4-i)*4,3,'#c16c58');
  for(let layer=0;layer<2;layer++)for(let i=-2;i<23;i++){const shift=(s.z*(layer?.022:.009)+s.x*3)%(layer?33:25),x=i*(layer?33:25)-shift,h=18+((i*17+71)%49),y=145-h;this.rect(x,y,layer?25:20,h,layer?'#17242f':'#252437');if(layer){this.rect(x+4,y-4,3,4,'#273d44');for(let j=0;j<h-8;j+=9)for(let k=0;k<3;k++)if((i+j+k)%3!==0)this.rect(x+4+k*6,y+5+j,2,3,(i+k)%3?'#5c534a':'#6e8f83');}}
  for(let i=0;i<4;i++){let x=55+i*132-(s.z*.025)%132;this.rect(x,91,9,60,'#182b32');this.rect(x-2,90,13,4,'#ca705a');for(let k=0;k<5;k++){g.fillStyle='#302d40';g.beginPath();g.ellipse(x+4+k*7,86-k*5,9+k*2,5,0,0,7);g.fill();}}
  this.rect(0,149,W,121,palette.ground[0]);
  if(area===1){for(let i=0;i<6;i++){let x=(i*93-s.z*.035)%560;this.rect(x,75,14,76,'#302327');this.rect(x-2,73,18,4,'#d68145');this.poly([[x,73],[x+4,56+Math.sin(time*4+i)*3],[x+8,66],[x+12,54],[x+14,73]],'#f2ae57');}}
  if(area===2){this.rect(0,148,480,122,'#142735');for(let i=0;i<12;i++)this.rect((i*71-s.z*.07)%500,162+(i%4)*14,45,1,'#294652');}
  if(area===3){this.rect(0,0,480,75,'#080f18');for(let y=5;y<70;y+=20){this.rect(0,y,480,3,'#23363c');this.rect(30,y+3,420,1,'#557467');}}
  if(area===4){for(let i=0;i<6;i++){let x=i*106-(s.z*.02)%106;this.rect(x,58,2,89,'#1c2935');this.rect(x-6,75,14,2,'#ab6d78');this.rect(x-2,55,6,3,this.motion&&Math.sin(time*3)>0?'#ff9b80':'#ae6569');}}
 
 }
 draw(s,time){const g=this.g;g.save();if(this.motion&&s.impact>0)g.translate(Math.round(Math.sin(time*83)*s.impact*2),Math.round(Math.cos(time*71)*s.impact));this.background(s,time);
  const cameraZ=s.z-10,cameraY=S.elevation(s.z)+4,camX=s.x*5,near=2,far=640,ds=8;
  const project=(z,offset)=>{const d=z-cameraZ,f=204/d;return {x:240+(offset-camX)*f,y:126+(cameraY-S.elevation(z))*f,w:S.C.roadHalf*f,f};};
  let offset=0,heading=0,maxY=H,props=[],samples=[];const area=S.section(s.z),palette=S.SECTIONS[area];
  for(let d=near;d<far;d+=ds){const z1=cameraZ+d,z2=z1+ds;const k=S.curve(z1);const off1=offset;heading+=k*.0019*ds;offset+=heading*ds;const a=project(z1,off1),b=project(z2,offset);samples.push({z:z1,offset:off1,clip:maxY});if(b.y>=a.y||b.y>=maxY)continue;const oldMax=maxY;maxY=b.y;if(b.y>H)continue;
   const stripe=Math.floor(z1/24)%2, gap=S.JUMPS.find(j=>z2>j.start&&z1<j.end),ramp=S.JUMPS.find(j=>z1>j.start-80&&z1<j.start);
   g.save();g.beginPath();g.rect(0,0,W,Math.min(H,oldMax));g.clip();
   this.rect(0,b.y,W,a.y-b.y+1,gap?'#08151d':palette.ground[stripe]);
   if(!gap){
    this.poly([[a.x-a.w*1.18,a.y],[a.x+a.w*1.18,a.y],[b.x+b.w*1.18,b.y],[b.x-b.w*1.18,b.y]],stripe?'#536164':'#344750');
    this.poly([[a.x-a.w,a.y],[a.x+a.w,a.y],[b.x+b.w,b.y],[b.x-b.w,b.y]],stripe?'#29343c':'#2b363e');
    for(const side of [-1,1])this.poly([[a.x+a.w*side,a.y],[a.x+a.w*.965*side,a.y],[b.x+b.w*.965*side,b.y],[b.x+b.w*side,b.y]],'#d9a65e');
    if(stripe)for(const p of [-.333,.333])this.poly([[a.x+a.w*(p-.009),a.y],[a.x+a.w*(p+.009),a.y],[b.x+b.w*(p+.009),b.y],[b.x+b.w*(p-.009),b.y]],'#738887');
    if(ramp){const green=s.v*3.6>=ramp.safeKmh?'#67e4b1':'#edab55';this.poly([[a.x-a.w*.68,a.y],[a.x+a.w*.68,a.y],[b.x+b.w*.68,b.y],[b.x-b.w*.68,b.y]],stripe?green:'#3b695c');}
    if(z1>=S.C.length&&z1<S.C.length+18)for(let n=0;n<10;n++)this.poly([[a.x-a.w+n*a.w/5,a.y],[a.x-a.w+(n+1)*a.w/5,a.y],[b.x-b.w+(n+1)*b.w/5,b.y],[b.x-b.w+n*b.w/5,b.y]],(n+stripe)%2?'#fff1ca':'#14252e');
   }else{
    this.poly([[a.x-a.w*1.18,a.y],[a.x+a.w*1.18,a.y],[b.x+b.w*1.18,b.y],[b.x-b.w*1.18,b.y]],'#080f18');
    if(z2>=gap.end)this.rect(b.x-b.w,b.y,b.w*2,Math.max(1,b.f*.4),'#f09361');
   }
   // Safety barriers and moving roadside light posts establish speed.
   if(!gap)for(const side of [-1,1]){const x1=a.x+side*a.w*1.1,x2=b.x+side*b.w*1.1;this.poly([[x1,a.y],[x1,a.y-a.f*.55],[x2,b.y-b.f*.55],[x2,b.y]],stripe?'#c68b61':'#4e6669');}
   if(Math.floor(z1/48)!==Math.floor(z2/48))props.push({p:b,z:z2,clip:oldMax});
   g.restore();
  }
  for(const {p,z,clip} of props.reverse()){
   if(p.f<.22)continue;g.save();g.beginPath();g.rect(0,0,W,Math.min(H,clip));g.clip();
   for(const side of [-1,1]){let x=p.x+side*p.w*1.45,y=p.y,h=Math.min(110,p.f*5);this.rect(x,y-h,Math.max(1,p.f*.16),h,'#46656b');this.rect(x-(side<0?0:p.f*1.4),y-h,p.f*1.6,Math.max(1,p.f*.25),'#ffc98a');}
   if(Math.floor(z/48)%6===0){let x=p.x-p.w*2,y=p.y-5*p.f;this.rect(x,y,3.8*p.f,2.1*p.f,'#263a43');this.rect(x,y,3.8*p.f,.18*p.f,'#db855c');if(p.f>.6){g.fillStyle='#ebc596';g.font=`bold ${Math.max(4,p.f*.65)}px monospace`;g.fillText('SECTOR 09',x+.2*p.f,y+1.3*p.f);}}
   g.restore();
  }
  const world=(z,x=0)=>{const q=samples.find(q=>q.z<=z&&q.z+8>z);if(!q)return null;const p=project(z,q.offset);p.x+=x*p.w;p.clip=q.clip;return p;};
  const car=(e)=>{const p=world(e.z,e.x);if(!p||p.y>p.clip+12||e.z<s.z-5)return;const scale=Math.min(1.3,p.f/20);g.save();g.beginPath();g.rect(0,0,W,Math.min(H,p.clip+35*scale));g.clip();g.translate(p.x,p.y+28*scale-e.airY*9);g.scale(scale,scale);this.enemyCar(e,time);g.restore();};
  for(const e of [...s.enemies].sort((a,b)=>b.z-a.z))car(e);
  S.REPAIRS.forEach((r,i)=>{if(s.picked.includes(i)||r.z<s.z-2)return;const p=world(r.z,r.x);if(!p||p.y>p.clip)return;const size=Math.min(24,p.f*1.15);this.rect(p.x-size/2,p.y-size,size,size,'#75d8b1');this.rect(p.x-size*.1,p.y-size*.8,size*.2,size*.6,'#173c3a');this.rect(p.x-size*.3,p.y-size*.6,size*.6,size*.2,'#173c3a');});
  // v0.3.0 road obstacles (drawn far to near, clipped by hills like repairs).
  for(const o of [...S.OBSTACLES].reverse()){if(s.obstaclesHit?.includes(o.id)||o.z<s.z-2||o.z>s.z+620)continue;const p=world(o.z,o.x);if(!p||p.y>p.clip+2)continue;g.save();g.beginPath();g.rect(0,0,W,Math.min(H,p.clip+2));g.clip();this.obstacle(o,p,time);g.restore();}
  // v0.3.0 aerial strikes: target zone, then a shell that approaches in five steps.
  for(const k of s.strikes||[]){const zx=240+(k.aim*7.2-camX)*20.4;
   if(k.age>=S.STRIKE.zoneAt){const pulse=k.locked&&this.motion?(Math.floor(time*10)%2?.24:.15):.13;g.globalAlpha=pulse;this.poly([[zx-25,265],[zx+25,265],[240+(k.aim*7.2-camX)*4+7,146],[240+(k.aim*7.2-camX)*4-7,146]],'#ff665c');g.globalAlpha=1;const c=k.locked?'#ffd27e':'#ff986e';this.rect(zx-25,240,2,18,c);this.rect(zx+23,240,2,18,c);if(k.locked){this.rect(zx-25,240,8,2,c);this.rect(zx+17,240,8,2,c);this.rect(zx-25,256,8,2,c);this.rect(zx+17,256,8,2,c);}}
}
  for(const b of s.blasts||[]){const age=s.t-b.t,x=240+(b.x*7.2-camX)*20.4,y=246,r=8+age*60,fade=1-age/.6;g.globalAlpha=Math.max(0,fade);for(let i=0;i<10;i++){const a=i*Math.PI/5+age*3,d=r*(.6+.4*((i*37)%5)/5);this.rect(x+Math.cos(a)*d-3,y+Math.sin(a)*d*.45-3,6,6,i%3?'#ff9d54':'#ffe08a');}this.rect(x-r*.5,y-4,r,8,'#ffcf7a');this.rect(x-r*.3,y-r*.5,r*.6,r*.5,'#4a3a3f');g.globalAlpha=1;}
  for(const e of s.enemies){if(e.phase==='aim'){const x=240+(e.aim*7.2-camX)*20.4;g.globalAlpha=.15;this.poly([[x-25,265],[x+25,265],[240+(e.aim*7.2-camX)*4+7,146],[240+(e.aim*7.2-camX)*4-7,146]],'#ff665c');g.globalAlpha=1;this.rect(x-25,240,2,18,'#ff986e');this.rect(x+23,240,2,18,'#ff986e');}}
  for(const b of s.projectiles){const p=world(b.z,b.x);if(p&&p.y<=p.clip+8){this.rect(p.x-1,p.y-8,2,8,'#ffec9e');}}
  // Spark trails, shadow and suspension stay aligned with the road coordinate.
  const px=240+s.x*44.9,py=214-s.airY*10;
  if(s.mode==='running'&&s.braking&&Math.abs(s.steer)>.1){for(let i=0;i<5;i++){this.rect(px-20+s.steer*i*2,py+23+i*3,3,2,'#6b7478');this.rect(px+18+s.steer*i*2,py+23+i*3,3,2,'#6b7478');}}
  g.fillStyle='#0c161bc0';g.beginPath();g.ellipse(px,241,36-s.airY*2,6,0,0,7);g.fill();
  g.save();g.translate(Math.round(px),Math.round(py));g.rotate(s.steer*(s.braking?.095:.045));
  if(s.boosting){this.poly([[-17,26],[-8,26],[-13,40+Math.sin(time*40)*5]],'#d5ffee');this.poly([[8,26],[17,26],[13,40+Math.cos(time*40)*5]],'#73f0cc');}
  this.rect(-30,4,8,23,'#0a1119');this.rect(22,4,8,23,'#0a1119');
  this.poly([[-27,0],[-19,-15],[18,-15],[27,0],[29,22],[-29,22]],'#7eafb0');
  this.poly([[-19,-12],[-13,-21],[12,-21],[19,-12],[21,-1],[-22,-1]],'#183b4b');
  this.poly([[-13,-18],[11,-18],[16,-5],[-18,-5]],'#397489');this.rect(-14,-16,24,2,'#85c0c1');
  this.rect(-28,3,56,16,'#c1cbb2');this.rect(-22,6,44,5,'#48616a');this.rect(-30,0,60,4,'#213744');
  this.rect(-27,15,15,4,s.braking?'#fff3c9':'#ff7258');this.rect(12,15,15,4,s.braking?'#fff3c9':'#ff7258');this.rect(-8,15,16,5,'#212c37');this.rect(-29,23,58,4,'#23323c');
  if(s.hp<50){this.rect(-19,4,5,2,'#31373c');this.rect(12,10,7,2,'#31373c');}
  g.restore();
  for(const k of s.strikes||[])this.shell(k,240+(k.aim*7.2-camX)*2,240+(k.aim*7.2-camX)*20.4,time);
  if(s.impact>.6)for(let i=0;i<6;i++)this.rect(px+(s.x<0?-30:30)+Math.sin(time*12+i)*12,py+Math.cos(time*9+i)*14,2,2,'#ffcc83');
  if(this.motion&&s.boosting){g.strokeStyle='#a0cfbf55';for(let i=0;i<6;i++){let side=i%2?1:-1,x=240+side*(100+i*14);g.beginPath();g.moveTo(x,175+i*9);g.lineTo(x+side*24,190+i*9);g.stroke();}}
  if(s.enemies.some(e=>e.phase==='ram'||e.phase==='ram-warn')){const e=s.enemies.find(e=>e.phase==='ram'||e.phase==='ram-warn');const side=e.side||1;this.poly([[px+side*50,py],[px+side*66,py-10],[px+side*66,py+10]],'#f4b05f');}
  g.restore();
 }
 obstacle(o,p,time){const w=Math.max(3,p.w*.2),h=Math.max(6,p.f*2),x=p.x,y=p.y,lamp=this.motion&&Math.floor(time*6+o.id)%2;
  // Beacon on a pole keeps distant obstacles readable.
  this.rect(x-Math.max(1,p.f*.05),y-h-Math.max(4,p.f*1.2),Math.max(1,p.f*.1),Math.max(4,p.f*1.2),'#39474c');this.rect(x-Math.max(2,p.f*.2),y-h-Math.max(6,p.f*1.45),Math.max(4,p.f*.4),Math.max(3,p.f*.3),lamp?'#ffb347':'#ff5f45');
  if(o.kind==='barricade'){this.rect(x-w,y-h,w*2,h,'#9aa3a3');this.rect(x-w,y-h,w*2,Math.max(1,h*.18),'#c7cfc9');for(let i=0;i<4;i++)this.rect(x-w+i*w*.5+w*.06,y-h*.72,w*.22,h*.42,i%2?'#1b2125':'#f0a33c');this.rect(x-w,y-Math.max(1,h*.12),w*2,Math.max(1,h*.12),'#4a5559');}
  else{const c=w*.95;this.rect(x-c,y-c*.9,c*.95,c*.9,'#7b5a3a');this.rect(x+c*.05,y-c*.9,c*.95,c*.9,'#6b4d33');this.rect(x-c*.5,y-c*1.75,c*.95,c*.85,'#8a6742');for(const [bx,by,bw,bh] of [[x-c,y-c*.9,c*.95,c*.9],[x+c*.05,y-c*.9,c*.95,c*.9],[x-c*.5,y-c*1.75,c*.95,c*.85]]){this.rect(bx,by,bw,Math.max(1,bh*.12),'#b08a5c');this.rect(bx+bw*.45,by,Math.max(1,bw*.1),bh,'#4c3524');}}
 }
 shell(k,hx,zx,time){// Five discrete approach frames: the shell visibly steps closer and larger.
  const f=S.strikeFrame(k),t=[0,.22,.45,.68,.88][f],size=[7,11,17,25,36][f],x=hx+(zx-hx)*t,y=98+(214-98)*t,flash=this.motion&&Math.floor(time*14)%2;
  const glow=size*.9;this.rect(x-glow/2,y-glow/2,glow,glow,'rgba(255,140,70,.18)');
  for(let i=1;i<=3;i++){const ts=Math.max(0,t-i*.05),q=size*(.5-i*.1);this.rect(hx+(zx-hx)*ts-q/2,98+(214-98)*ts-q/2-size*.2,q,q,i===1?'#8a8590':'#5a5764');}
  this.rect(x-size*.36,y-size*.55,size*.72,size*1.05,'#101318');this.rect(x-size*.28,y-size*.48,size*.56,size*.9,'#3a3f48');this.rect(x-size*.16,y-size*.42,size*.14,size*.7,'#8d96a2');
  this.rect(x-size*.56,y-size*.66,size*.3,size*.3,'#2a2e36');this.rect(x+size*.26,y-size*.66,size*.3,size*.3,'#2a2e36');
  this.rect(x-size*.28,y+size*.36,size*.56,size*.26,flash?'#ffe08a':'#ff7a3c');this.rect(x-size*.14,y+size*.5,size*.28,size*.22,'#fff2c0');
 }
 enemyCar(e,time){const r=e.type==='rammer',body=r?'#ba824d':'#8d5267';
  this.rect(-27,-22,7,21,'#060e17');this.rect(20,-22,7,21,'#060e17');
  this.poly([[-25,0],[-26,-19],[-18,-33],[18,-33],[26,-19],[25,0]],body);
  this.poly([[-17,-30],[17,-30],[21,-18],[-21,-18]],'#243346');this.rect(-15,-28,28,3,'#769993');
  if(r){this.rect(-29,-3,58,6,'#859399');this.rect(-25,-11,9,6,'#efbd7b');this.rect(16,-11,9,6,'#efbd7b');this.rect(-10,-18,20,15,'#655846');}
  else{this.rect(-23,-10,15,4,'#ff767a');this.rect(8,-10,15,4,'#ff767a');this.rect(-14,-35,28,4,'#272d3d');this.rect(this.motion&&Math.sin(time*8+e.id)>0?-14:2,-35,12,4,'#fc8c7f');}
 }
}
export {Renderer};

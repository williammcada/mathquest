import {droneEmitter,conePolygon} from './stealth-core.js?v=0.12.0';
// Vector hardware, drawn at device resolution. Geometry is tied to the
// simulation's actual gate edges, not floating door symbols.
export function drawHardware(c,s,t){
 const label=(text,x,y,color='#d9edf4')=>{c.font='bold 6px system-ui';c.fillStyle='#07121e';const w=c.measureText(text).width;c.fillRect(x-2,y-7,w+4,10);c.fillStyle=color;c.fillText(text,x,y);};
 const bolt=(x,y)=>{c.fillStyle='#b5c9d3';c.beginPath();c.arc(x,y,.8,0,Math.PI*2);c.fill();};
 function gate(x,open,name){
   c.fillStyle='#617580';c.fillRect(x-3,12,14,148);
   c.fillStyle='#08131b';c.fillRect(x,16,8,144);
   const h=open?9:144,metal=c.createLinearGradient(x,0,x+8,0);metal.addColorStop(0,'#304e61');metal.addColorStop(.5,'#95a7b2');metal.addColorStop(1,'#203747');c.fillStyle=metal;c.fillRect(x,16,8,h);
   c.strokeStyle='#233a47';c.lineWidth=1;for(let y=20;y<16+h;y+=7){c.beginPath();c.moveTo(x,y);c.lineTo(x+8,y);c.stroke();}
   c.fillStyle=open?'#5be8be':'#ffba61';c.fillRect(x-3,152,3,8);c.fillRect(x+8,152,3,8);
   label(open?'OPEN':name,x-9,30,open?'#5be8be':'#ffcf88');
 }
 gate(230,s.panel,'A LOCK');gate(894,s.card,'C LOCK');
 // Console: pedestal, keyboard, screen and a cable leading to its door.
 c.strokeStyle=s.panel?'#5be8be':'#a2763c';c.lineWidth=1;c.beginPath();c.moveTo(195,145);c.lineTo(218,145);c.lineTo(218,28);c.lineTo(230,28);c.stroke();
 c.fillStyle='#111e29';c.fillRect(174,152,28,8);c.fillStyle='#708997';c.fillRect(183,131,10,24);
 c.fillStyle='#243c50';c.beginPath();c.moveTo(175,116);c.lineTo(200,116);c.lineTo(202,137);c.lineTo(172,137);c.closePath();c.fill();
 c.strokeStyle='#879eae';c.stroke();c.fillStyle='#07101b';c.fillRect(178,120,19,11);c.fillStyle=s.panel?'#54e6bb':'#ffbf5f';c.fillRect(180,122,15,2);c.fillRect(180,127,s.panel?15:7,1);
 c.fillStyle='#b4cbd4';for(let x=177;x<198;x+=4)c.fillRect(x,134,2,1);bolt(176,119);bolt(199,119);
 label(s.panel?'A · UNLOCKED':'A · HOLD INTERACT',155,109);
 if(s.objectiveHold&&s.player.x<230){c.fillStyle='#5be8be';c.fillRect(174,140,28*Math.min(1,s.objectiveHold/.6),2);}
 // B is floor guidance and an overhead checkpoint arch, never a terminal.
 c.strokeStyle='#57b9df';c.lineWidth=2;c.beginPath();c.moveTo(648,158);c.lineTo(648,122);c.lineTo(672,122);c.lineTo(672,158);c.stroke();
 c.setLineDash([2,3]);c.strokeStyle='#79ddcf';c.beginPath();c.moveTo(652,155);c.lineTo(668,155);c.stroke();c.setLineDash([]);
 label('B · WALK THROUGH',636,115,'#8ee8f3');
 // Access-card locker, transparent front and distinct card silhouette.
 c.fillStyle='#2a4152';c.fillRect(843,121,26,39);c.strokeStyle='#8ca3ae';c.strokeRect(843,121,26,39);c.fillStyle='#081b28';c.fillRect(846,125,20,24);
 if(!s.card){c.save();c.translate(856,136);c.rotate(-.15);c.fillStyle='#f5e3b3';c.fillRect(-7,-5,14,10);c.fillStyle='#bd8640';c.fillRect(-5,-3,4,4);c.fillStyle='#264352';c.fillRect(-5,2,10,1);c.restore();}
 c.fillStyle=s.card?'#5be8be':'#ffd083';c.fillRect(854,153,5,2);label(s.card?'C · CARD SECURED':'C · HOLD INTERACT',820,114);
 // Timed shutter: leaf from x804 to816, matching collision at x790/814.
 c.fillStyle='#6c8795';c.fillRect(802,106,16,5);c.fillStyle=s.shutterClosed?'#ae7061':'#5bd8b4';c.fillRect(804,111,12,s.shutterClosed?49:5);
 if(s.shutterClosed){c.strokeStyle='#f0b985';for(let y=115;y<157;y+=6){c.beginPath();c.moveTo(804,y);c.lineTo(816,y-4);c.stroke();}}
 label(s.shutterClosed?'WAIT':'PASS',801,101,s.shutterClosed?'#ffd093':'#5be8be');
 for(const e of s.level.emitters){c.save();c.translate(e.x,e.y);c.strokeStyle='#738b9e';c.lineWidth=2;c.beginPath();c.moveTo(0,-12);c.lineTo(0,-4);c.stroke();c.rotate(Math.sin(t*1.1+e.x)*.15);c.fillStyle='#142637';c.beginPath();c.roundRect(-8,-5,16,8,3);c.fill();c.strokeStyle='#b1c8d1';c.lineWidth=.7;c.stroke();c.fillStyle=e.disabled?'#5ddcb9':'#ffe19b';c.beginPath();c.ellipse(0,3,4,2,0,0,Math.PI*2);c.fill();bolt(-5,-2);bolt(5,-2);c.restore();}
 if(s.level.route==='corridor'){
   const emitter=droneEmitter(s);if(!emitter.disabled){const points=conePolygon(s.level,emitter,t);c.fillStyle='#63d7f026';c.strokeStyle='#84ddeb';c.lineWidth=.5;c.beginPath();c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.closePath();c.fill();c.stroke();}
   const d=s.drone;c.save();c.translate(d.x,d.y+3);c.strokeStyle='#b4c9d8';c.lineWidth=1.5;c.beginPath();c.moveTo(-15,-3);c.lineTo(15,-3);c.moveTo(-5,-3);c.lineTo(0,3);c.lineTo(5,-3);c.stroke();
   for(const x of [-14,14]){c.fillStyle='#132b3d';c.beginPath();c.ellipse(x,-4,7,3,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='#77a1b3';c.beginPath();c.moveTo(x-6,-4);c.lineTo(x+6,-4);c.stroke();}
   c.fillStyle='#8aa6b6';c.beginPath();c.moveTo(-7,-3);c.lineTo(7,-3);c.lineTo(4,5);c.lineTo(-4,5);c.closePath();c.fill();c.fillStyle=d.state==='investigate'?'#ff9767':'#58e5f1';c.beginPath();c.arc(0,5,2,0,Math.PI*2);c.fill();c.restore();
   label('PATROL DRONE',d.x-22,d.y-11);
 }
 label('SURFACE LIFT',963,85,'#87efd5');
}

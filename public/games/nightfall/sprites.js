// Nightfall shared sprite sheets (NF-ART-01). Every world object is drawn from a
// predesigned 1024×1024, 4×4 sheet; this module only maps cells to screen boxes.
export const SHEETS={
 interactables:'./assets/nightfall/shared/interactables-v1.png',
 furniture:'./assets/nightfall/shared/furniture-v1.png',
 decals:'./assets/nightfall/shared/decals-v1.png',
 roofs:'./assets/nightfall/shared/roofs-v1.png',
 machinery:'./assets/false-haven/machinery-v1.png'
};
// Opaque bounds of each cell in sheet pixels [x,y,w,h], measured from the committed
// sheets so sprites fill their collision boxes instead of their padded cells.
export const BOUNDS={"interactables":[[12,74,232,108],[268,70,232,116],[524,46,232,163],[780,54,232,147],[86,269,83,231],[268,293,232,180],[547,268,185,232],[817,268,158,232],[33,524,189,232],[316,524,136,232],[556,524,167,232],[780,580,231,120],[12,831,232,129],[268,806,232,179],[524,810,232,171],[780,835,232,123]],"furniture":[[12,27,232,201],[268,18,232,219],[537,12,206,232],[786,12,220,232],[12,289,232,190],[268,299,232,169],[524,288,232,192],[780,293,232,181],[12,555,232,169],[268,558,232,163],[566,524,148,232],[780,528,232,223],[12,787,232,217],[268,803,232,186],[540,780,200,232],[780,810,232,171]],"decals":[[12,29,232,197],[268,62,232,132],[524,27,232,201],[780,32,232,191],[12,280,232,207],[268,282,232,203],[524,277,232,213],[780,280,232,208],[12,536,232,207],[268,575,232,130],[524,529,232,223],[780,526,232,229],[12,785,232,222],[268,784,232,223],[524,780,231,232],[780,794,232,204]],"roofs":[[0,0,256,256],[256,0,256,256],[512,0,256,256],[768,0,256,256],[12,269,232,230],[268,271,232,225],[524,278,232,212],[780,274,232,220],[12,551,232,178],[286,524,196,232],[545,524,190,232],[780,566,232,148],[12,792,232,207],[268,797,232,198],[538,780,204,232],[822,780,152,232]],"machinery":[[12,25,232,205],[274,14,218,230],[542,12,195,232],[780,37,232,182],[12,291,232,186],[268,280,232,208],[533,268,214,232],[780,302,232,164],[12,560,232,160],[272,601,224,89],[560,524,160,232],[780,556,232,168],[12,817,232,158],[268,789,232,214],[562,780,157,232],[780,851,232,89]]};

// Named cells keep call sites readable and make the sheet layout auditable.
export const CELL={
 window:0,windowBroken:1,rollGate:2,fence:3,fencePost:4,trapClosed:5,trapOpen:6,speaker:7,speakerActive:8,drum:9,drumBurnt:10,trolley:11,rail:12,railEnd:13,sign:14,plate:15,
 cot:0,bunk:1,lockers:2,shelving:3,workbench:4,toolRack:5,radio:6,mapBoard:7,canteenTable:8,servingCounter:9,vending:10,screen:11,medCabinet:12,batteryRack:13,cableDrum:14,intakeDesk:15,
 rug:0,hazardStripes:1,papers:2,tarp:3,oil:4,puddle:5,boxes:6,blankets:7,trays:8,arrow:9,cross:10,bayLine:11,sportsGear:12,crack:13,drain:14,litter:15,
 tar:0,corrugated:1,concrete:2,parapet:3,parapetCorner:4,hatch:5,hvac:6,vents:7,skylight:8,waterTank:9,antenna:10,duct:11,roofPuddle:12,roofDebris:13,stairBox:14,roofLight:15,
 generator:0,generatorOn:1,selector:2,pump:3,pumpOn:4,hatchClosed:5,hatchOpen:6,shutter:7,shutterUp:8,barrierDown:9,barrierUp:10,gateConsole:11,waterline:12,waterDrain:13,floodlight:14,conduit:15
};

export function loadSheets(load){return Promise.all(Object.entries(SHEETS).map(async([k,src])=>[k,await load(src,1024,1024)])).then(Object.fromEntries);}

// Draw `cell` of `sheet` into the on-screen box (x,y,w,h). `rot` is in quarter
// turns clockwise; the box is always the final on-screen footprint.
export function sprite(c,art,sheet,cell,x,y,w,h,{rot=0,alpha=1,full=false}={}){
 const im=art?.[sheet];if(!im)return;
 const sx=im.width/1024,b=full?[(cell%4)*256,Math.floor(cell/4)*256,256,256]:BOUNDS[sheet][cell];
 const q=((rot%4)+4)%4;
 c.save();if(alpha!==1)c.globalAlpha*=alpha;
 c.translate(x+w/2,y+h/2);c.rotate(q*Math.PI/2);
 const dw=q%2?h:w,dh=q%2?w:h;
 c.drawImage(im,b[0]*sx,b[1]*sx,b[2]*sx,b[3]*sx,-dw/2,-dh/2,dw,dh);
 c.restore();
}

// Repeat a left–right tileable cell along a rectangle's long axis.
export function strip(c,art,sheet,cell,r,{thickness,segment,alpha=1}={}){
 const vertical=r.h>r.w,len=vertical?r.h:r.w,t=thickness??(vertical?r.w:r.h),seg=segment??t*2;
 const n=Math.max(1,Math.round(len/seg)),step=len/n,cx=vertical?r.x+r.w/2:r.y+r.h/2;
 for(let i=0;i<n;i++){
  if(vertical)sprite(c,art,sheet,cell,cx-t/2,r.y+i*step,t,step,{rot:1,alpha});
  else sprite(c,art,sheet,cell,r.x+i*step,cx-t/2,step,t,{alpha});
 }
}

// Fill a rectangle with a seamless roof material at `size` px per tile. The tile
// grid is anchored to `origin` (the roof's own corner) so the texture stays fixed
// to the building while `r` is only the visible part being drawn.
export function tiled(c,art,sheet,cell,r,size=64,origin=r){
 const im=art?.[sheet];if(!im)return;const sx=im.width/1024;
 c.save();c.beginPath();c.rect(r.x,r.y,r.w,r.h);c.clip();
 const x0=origin.x+Math.floor((r.x-origin.x)/size)*size,y0=origin.y+Math.floor((r.y-origin.y)/size)*size;
 for(let y=y0;y<r.y+r.h;y+=size)for(let x=x0;x<r.x+r.w;x+=size)c.drawImage(im,(cell%4)*256*sx,Math.floor(cell/4)*256*sx,256*sx,256*sx,x,y,size,size);
 c.restore();
}

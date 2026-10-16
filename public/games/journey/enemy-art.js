// Original stage-6 atlases. Explicit rectangles isolate wide poses; pivots are
// ground/body anchors, never collision geometry. See ENEMY-ART-PROVENANCE.md.
export const ENEMY_ART={
  leaper:{file:'leaper-stage6.webp',size:96,scale:.8,rows:[
    [0,350,[0,390,790,1150,1536],[215,620,990,1390],325],
    [350,660,[0,370,838,1200,1536],[205,620,1010,1390],655],
    [660,1024,[0,355,735,1152,1536],[200,580,950,1350],970]]},
  caster:{file:'caster-stage6.webp',size:96,scale:.8,rows:[
    [0,340,[0,350,725,1130,1536],[160,540,930,1340],318],
    [340,675,[0,350,730,1175,1536],[165,550,940,1340],659],
    [675,1024,[0,350,750,1140,1536],[155,545,945,1330],980]]},
  shield:{file:'shield-stage6.webp',size:96,scale:.75,rows:[
    [0,341,[0,390,740,1100,1536],[205,565,920,1290],330],
    [341,675,[0,385,730,1130,1536],[210,565,920,1290],664],
    [675,1024,[0,380,750,1100,1536],[200,575,940,1320],990]]},
  brute:{file:'brute-stage6.webp',size:112,scale:.85,rows:[
    [0,320,[0,375,750,1150,1536],[175,560,940,1350],318],
    [320,675,[0,390,765,1177,1536],[195,570,930,1330],650],
    [675,1024,[0,375,762,1120,1536],[195,590,945,1320],975]]},
  nezha:{file:'nezha-stage6.webp',size:114,scale:.85,rows:[
    [0,350,[0,392,762,1128,1536],[175,560,970,1350],335],
    [350,675,[0,360,800,1123,1536],[215,565,980,1330],657],
    [675,1024,[0,365,810,1125,1536],[220,600,975,1350],980]]}
};
export const ENEMY_REPAIR_FILE='enemy-repairs-stage6.webp';
const repair=(source,pivot,scale)=>({image:'enemy-repairs',source,pivot,scale});
const shieldAttack=repair([0,0,775,530],[400,484],.70);
const bruteAttack=repair([820,530,716,494],[250,402],.70);
export const ENEMY_REPAIRS={
  shield:{6:shieldAttack,7:shieldAttack},
  brute:{6:bruteAttack,7:bruteAttack},
  nezha:{5:repair([775,0,761,530],[290,498],.70),9:repair([0,530,820,494],[350,410],.80)}
};
const ordinary={entrance:[0,1],idle:[0,1],walk:[2,3],windup:[4,5],attack:[6,7],recover:[8],hurt:[9],down:[10,11]};
export function enemyClip(a){
  if(a.hp<=0||a.phase==='down')return [10,11];
  if(a.kind==='nezha'){
    if(a.phase==='reposition')return [2,3];
    if(a.phase==='windup')return [{spear:4,ring:6,rush:8}[a.move]??0];
    if(a.phase==='attack')return [{spear:5,ring:7,rush:9}[a.move]??0];
    if(a.phase==='recover')return [10];
    return [0,1];
  }
  const phase=a.hurt>0?'hurt':a.phase;
  if(a.kind==='leaper')return ({entrance:[0],idle:[0],walk:[1,2],windup:[3,4],attack:[5,6],recover:[7,8],hurt:[9],down:[10,11]})[phase]||[0];
  return ordinary[phase]||[0];
}
export function enemyBounds(kind,frame){
  if(ENEMY_REPAIRS[kind]?.[frame])return ENEMY_REPAIRS[kind][frame];
  const art=ENEMY_ART[kind],row=art.rows[Math.floor(frame/4)],col=frame%4;
  const [top,bottom,cuts,anchors,feet]=row;
  return {image:kind,source:[cuts[col],top,cuts[col+1]-cuts[col],bottom-top],pivot:[anchors[col]-cuts[col],feet-top],scale:art.scale};
}

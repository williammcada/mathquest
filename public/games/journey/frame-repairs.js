// Supplemental poses retain original animation indices and gameplay timing.
const bajieFrames=[1,2,4,5,7,8,9,10,11,14,15,16];
export const REPAIR_ATLASES={bajieRepair:'bajie-repair-stage3.webp',wukongRepair:'wukong-repair-stage4.webp',wujingRepair:'wujing-repair-stage4.webp',princeRepair:'prince-repair-stage4.webp'};
export const FRAME_REPAIRS={bajie:Object.fromEntries(bajieFrames.map((original,index)=>{
 const row=Math.floor(index/4),column=index%4,rows=[0,341,683,1024],feet=[304,615,938];
 return [original,{image:'bajieRepair',source:[column*384,rows[row],384,rows[row+1]-rows[row]],pivot:[192,feet[row]-rows[row]]}];
}))};

// Explicit rectangles, foot pivots and resolution compensation for supplemental art.
Object.assign(FRAME_REPAIRS,{"wukong":{"7":{"image":"wukongRepair","source":[0,0,528,512],"pivot":[195,432],"scale":0.66},"8":{"image":"wukongRepair","source":[528,0,522,512],"pivot":[187,432],"scale":0.66},"9":{"image":"wukongRepair","source":[1050,0,486,512],"pivot":[240,440],"scale":0.66},"10":{"image":"wukongRepair","source":[0,512,528,512],"pivot":[185,394],"scale":0.66},"11":{"image":"wukongRepair","source":[528,512,518,512],"pivot":[162,392],"scale":0.66},"16":{"image":"wukongRepair","source":[1046,512,490,512],"pivot":[274,394],"scale":0.66}},"wujing":{"7":{"image":"wujingRepair","source":[0,0,540,512],"pivot":[205,422],"scale":0.7},"8":{"image":"wujingRepair","source":[540,0,558,512],"pivot":[195,422],"scale":0.7},"9":{"image":"wujingRepair","source":[1098,0,438,512],"pivot":[212,447],"scale":0.7},"10":{"image":"wujingRepair","source":[0,512,530,512],"pivot":[210,382],"scale":0.7},"11":{"image":"wujingRepair","source":[530,512,526,512],"pivot":[215,382],"scale":0.7},"15":{"image":"wujingRepair","source":[1056,512,480,512],"pivot":[214,386],"scale":0.7}},"prince":{"7":{"image":"princeRepair","source":[0,0,831,1024],"pivot":[360,757],"scale":0.4},"8":{"image":"princeRepair","source":[831,0,705,1024],"pivot":[289,757],"scale":0.4}}});

// Versioned balance data shared by server, practice and client. No academic policy here.
export const THREATS = [
  {id:0,name:'Guided',placed:24,active:6,memory:3,search:2,doorSeconds:12,ambush:2,pickupBonus:2},
  {id:1,name:'Standard',placed:34,active:9,memory:4,search:3,doorSeconds:10,ambush:3,pickupBonus:1},
  {id:2,name:'Tense',placed:44,active:12,memory:5,search:4,doorSeconds:8,ambush:4,pickupBonus:0},
  {id:3,name:'Dangerous',placed:56,active:16,memory:6,search:4,doorSeconds:7,ambush:5,pickupBonus:0},
  {id:4,name:'Nightmare',placed:72,active:22,memory:7,search:5,doorSeconds:6,ambush:6,pickupBonus:0}
];
export const threatFor=value=>THREATS[Number.isInteger(value)&&value>=0&&value<=4?value:1];
export const CONFIG_REVISION='nightfall-city-6';
export const RESULT_LABELS={success:'You reached the bus',setback:'Your radio fell silent',lost:'Your radio fell silent',timed_out:'Run awaiting mission control review',skipped:'Crossing closed',teacher_advanced:'Mission control closed this crossing'};

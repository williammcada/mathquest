// v0.3.0 difficulty revision (13 Oct 2026). Earlier practice saves remain stored separately.
export const BUILD_VERSION='0.4.0';
export const VERSION = Object.freeze({game:'0.4.0', engine:'aerial/1', level:'coast/4', tuning:'standard/4', assets:'coast-art/1'});
export const T = Object.freeze({hz:60, width:640, height:360, limit:18000, lives:3, health:100, armor:150,
  speed:198, agility:1.2, damage:10, heavyDamage:20, protection:60, respawnProtection:120,
  shotPeriod:7.5, rapidPeriod:5, shotSpeed:420, playerRX:8, playerRY:12,
  pickupSpeed:30, repair:25, scroll:54,
  cap:{air:28,ground:10,hostile:96,friendly:96,effects:40},
  // v0.4.0: approach compressed into 150 s, so scroll and enemy speeds are ×1.5.
  enemies:{fighter:{hp:20,w:28,h:32,speed:82.5,period:144}, interceptor:{hp:30,w:30,h:34,speed:63,period:132},
    bomber:{hp:100,w:56,h:48,speed:37.5,period:192}, supply:{hp:60,w:48,h:44,speed:37.5,period:180},
    ship:{hp:240,w:64,h:80,speed:54,period:180}, shore:{hp:80,w:48,h:48,speed:54,period:180}},
  boss:{gunHP:320,coreHP:800,w:440,h:130,x:320,y:88,gunOffset:180,gunPeriod:216,corePeriod:144},
  // Enemy and boss shell speeds, +25% in v0.3.0.
  shell:{heavy:81.25,ground:106.25,aimed:125,light:106.25}
});
export const UPGRADES = Object.freeze([
  {id:'agility',title:'Agility',detail:'20% faster movement'},
  {id:'armor',title:'Armor',detail:'150 maximum hull health'},
  {id:'weapons',title:'Weapons',detail:'50% more damage; blue-white tracers'}
]);
export const OUTCOMES = Object.freeze(['success','escape_lesser','defeat','assisted_completed','window_closed','teacher_advanced','session_ended']);
export const BONUS_SECONDS = Object.freeze({spread:20,rapid:20,wingman:30});
export const RESULT_LABELS = Object.freeze({success:'Boss defeated',escape_lesser:'Escape — enemy survived',defeat:'Aircraft lost',assisted_completed:'Assisted route complete',window_closed:'Team window closed',teacher_advanced:'Teacher advanced the session',session_ended:'Session ended'});

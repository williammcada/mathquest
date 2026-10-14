// Blackout Protocol cartridge · A WILLIAM MCADA PRODUCT
// Spec: williammcada/blackout-protocol docs/change-specs/v0.2-stage-b-cartridge.md (approved 2026-10-13). Delivered as v0.2.1 (U-01: contents changed after the v0.2.0 checkpoint).
// Scenes supply separate story `paragraphs` and `instructions` (handbook U-11).
// Story art: polygon scenes drawn in code by Claude (handbook U-15; owner decision 2026-10-13).
export const BLACKOUT={
 id:'blackout-protocol',title:'Blackout Protocol',revision:'blackout-protocol-0.2.1',mapRevision:'blackout-core-0.1.5',assetRevision:'blackout-polygon-1',contract:'mq.cartridge/1.0',gameId:'blackout',activeLimitMs:300000,teamWindowMs:300000,budget:0,
 resolution:{type:'final_decision',minigamePlacement:'pre_final_decision'},
 presentation:{emblem:'BP',theme:'blackout',cover:'./assets/blackout/cover.svg',coverAlt:'The darkened Port Calder skyline seen from the lit roof of Substation 9',summary:'Port Calder has gone dark. Reroute the grid, district by district.',stageLabels:{market:'Before the Breakers Close',minigame:'District Panels',finale:'What Do We Do With LANTERN?'},practice:{title:'Blackout Protocol story and puzzle',href:'./blackout-preview.html'}},
 gates:['Cold Start',"Reading LANTERN's Logs",'The Manual Switchyard'],inserts:["Theo's Radio Net",'The Frozen Relay'],
 routes:[
  {id:'harbor',title:'Harbor Pumps first',text:'The tide is rising and the flood pumps are silent. The first restored feed goes to the harbor.'},
  {id:'hospital',title:'Northside Hospital first',text:'The hospital is running on generator fuel that will not last the night. The first restored feed goes to the wards.'}
 ],
 choices:[
  {id:'restore',title:'Restore LANTERN with safeguards',text:'Bring automated control back, with a human override panel at every substation.'},
  {id:'manual',title:'Keep the grid on manual control',text:'Engineers run the grid by hand until LANTERN is rebuilt. Safer, slower, with rolling shortages.'},
  {id:'microgrid',title:'Split into neighborhood microgrids',text:'Give each district its own small controller, so one failure can never dark the whole city again.'}
 ],
 items:[
  {id:'spare-fuse',title:'Spare Fuse',text:'Start your panel with 4 fuses instead of 3.'},
  {id:'grid-scanner',title:'Grid Scanner',text:'Once per district, every tile already in its correct position glows for 3 seconds.'},
  {id:'surge-stabilizer',title:'Surge Stabilizer',text:'Storm tiles turn half as often, and the Central Substation surge timer is 50% longer.'}
 ],
 assets:{cover:'./assets/blackout/cover.svg',radio:'./assets/blackout/radio.svg',market:'./assets/blackout/market.svg',lantern:'./assets/blackout/lantern.svg',ending:'./assets/blackout/ending.svg',ambient:'./assets/blackout/ambient.wav',finale:'./assets/blackout/finale.wav'},
 personal:{
  success:'You restored all five districts on your panel.',
  partial:'You restored part of the city before your shift ended. Every lit district counts.',
  lost:'Your panel lost its last fuse. Your mathematics and your final vote stand.',
  timed_out:'Your shift ended before your panel was finished. No district is counted as failed.',
  assisted_completed:'You restored the city with the guided route, recorded separately from an unguided run.',
  teacher_advanced:'Mission control closed your panel. No puzzle result is awarded or inferred.',
  not_started:'Your panel was not opened during the shift.',
  skipped:'Story preview only; no puzzle result recorded.'
 },
 endings:{
  restore:['Lantern, Watched','By noon LANTERN is running again, slower now, every major switch waiting for a human to confirm it. Nadia signs the first override herself.','The city is fast and bright again. On the wall of Substation 9, a new red panel hangs beside the old manual levers: the one that can always say no.'],
  manual:['Hands on the Levers','Substation 9 becomes the busiest room in Port Calder. Engineers work in shifts, switching districts by hand, and the city learns a new rhythm of planned dark hours.','LANTERN sits behind glass, its amber lamp steady and silent, while the people who will rebuild it read every line of its logs.'],
  microgrid:['A City of Small Lights','District by district, small controllers come online: one for the harbor, one for the hospital, one for the rail yard. Each can share power with its neighbors, and none can take the others down.','It is untidy and it is resilient. The next time something fails, one street goes dark, not a whole city.']
 }
};
export const BLACKOUT_PERSONAL=BLACKOUT.personal;

export function blackoutScene(c,t,names,crew){
 const first=t.route==='hospital'?'Northside Hospital':'the Harbor Pumps';
 const firstLine=t.route?`Theo routes the first restored feed to ${first}, as the crew decided.`:null;
 const gateText={
  'Cold Start':{p:['The first breaker is frozen in its housing. Nadia knocks the ice loose with the heel of her hand.','"Manual systems take care," she says. "Every check counts before we close a line."'],i:['Answer your assigned questions. Every crew member contributes before the switchyard opens.']},
  "Reading LANTERN's Logs":{p:[firstLine||'Theo has the city on the radio.','LANTERN\'s logs scroll past on an old terminal: the same fault, repeated ten thousand times. The controller is not broken. It is stuck being careful.'],i:['Answer your assigned questions to work through the logs.']},
  "Theo's Radio Net":{p:['Theo builds a relay of volunteers across the city: a night porter, a bus driver, a ferry captain, each one reporting which streets are still dark.'],i:['Answer your assigned questions to keep the radio net open.']},
  'The Frozen Relay':{p:['A relay station on the hill has iced shut. Without it, the eastern districts cannot be switched at all.'],i:['Answer your assigned questions to bring the relay back online.']},
  'The Manual Switchyard':{p:['The old switchyard hums as the main breakers close one by one. The district panels are ready for hands.'],i:['Finish your questions. Completing the gates earns your crew one equipment slot. Optional extra preparation earns up to two more.']}
 };
 let a;
 if(t.extraGate)a={title:'One More Check',p:['Nadia wants one more confirmation before anyone touches a live panel.'],i:['Complete the extra questions your teacher assigned. Your crew\'s choices and equipment are kept.']};
 else if(t.stage==='briefing')a={title:'The Ninety-Second Protocol',p:['9:40 p.m. Port Calder goes dark.','LANTERN, the controller that runs every substation in the city, detected a fault and triggered Blackout Protocol: a ninety-second emergency shutdown. That was eleven minutes ago. LANTERN is refusing every remote restart.',`Substation 9 still has the old manual switch panels. Chief Engineer Nadia Okoro looks at the night shift: ${crew.map(x=>x.alias).join(', ')}. "We bring this city back one district at a time."`],i:['Answer your assigned questions at each gate. Your crew votes on which district gets power first, then earns equipment.','Then each crew member works their own district panel: a five-minute circuit puzzle. Everyone returns for the final vote.']};
 else if(t.stage==='decision')a={title:'The First Feed',p:['Theo has two calls holding. The harbor pumps are silent as the tide rises. The hospital\'s generator fuel is running low.','There is only enough switched capacity for one district first.'],i:['Vote for which district gets power first. Your choice changes the story, not the puzzle or the questions.']};
 else if(t.stage==='gate')a={title:names[t.gateIndex],...(gateText[names[t.gateIndex]]||{p:[],i:['Answer your assigned questions.']})};
 else if(t.stage==='market')a={title:'Before the Breakers Close',p:['On the workbench under a single lamp: a box of spare fuses, a handheld grid scanner, a heavy surge stabilizer. Nadia slides them toward the crew.'],i:['Your crew has earned one equipment slot. Optional extra preparation earns up to two more.','Each member recommends equipment and marks ready; then the Event Lead confirms. Starting the panels begins the shared five-minute window.']};
 else if(t.stage==='minigame')a={title:'District Panels',p:['Five districts wait on your panel: the Harbor Pumps, Northside Hospital, Calder Rail Yard, Old Town and the Central Substation.'],i:['Tap a tile to turn it. Connect the generator to every building, then press Energize. A wrong Energize blows a fuse.','Your puzzle result is separate from your mathematics.']};
 else if(t.stage==='finale'){const lit=Object.values(t.runs||{}).some(r=>['success','partial','assisted_completed'].includes(r.outcome));a={title:'What Do We Do With LANTERN?',p:[lit?'Lights are coming back across Port Calder, one district at a time. Each panel\'s own result stays in the log.':'The panels could not hold tonight. The crew switches the most urgent lines by hand while dawn comes up grey. Nobody is awarded a result they did not earn.','At the end of the corridor, LANTERN\'s amber lamp is steady. Its fault has cleared. It is waiting.'],i:['Vote on what happens to LANTERN. Every crew member votes, whatever happened on their panel.']};}
 else if(t.stage==='victory'){const e=c.endings[t.finalAction]||['Shift closed','The rest of the story stays in the log.'];a={title:e[0],p:[...e.slice(1),...(t.route?[t.route==='hospital'?'At Northside Hospital, the generator fell silent an hour after the first feed arrived. Nobody noticed.':'At the harbor, the pumps held the tide by a hand\'s width. The night porter saw it from the pier.']:[]),...(names.includes(c.inserts[0])?['Theo\'s volunteers stay on the radio long after the shift ends.']:[]),...(names.includes(c.inserts[1])?['The hill relay is fitted with a heater, so it never freezes shut again.']:[])],i:[]};}
 if(!a)return null;
 const image=t.stage==='victory'?c.assets.ending:['finale','decision'].includes(t.stage)?c.assets.lantern:t.stage==='market'?c.assets.market:t.stage==='gate'?c.assets.radio:c.assets.cover;
 return {title:a.title,paragraphs:a.p,instructions:a.i,eyebrow:c.title,artId:`blackout.${t.stage}`,image};
}

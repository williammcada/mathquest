// Authored roles shared by live cartridges and story previews. No keyword guessing.
export function splitScene(scene, stage, cartridge) {
  if(Array.isArray(scene.instructions))return {narrative:[...(scene.paragraphs||[])],instructions:[...scene.instructions]};
  const id=({coastal:'coastal-escape',haven:'nightfall-false-haven'})[cartridge]||cartridge;
  const paragraphs=scene.paragraphs||[],last=paragraphs.length-1;
  const roles={
    'vault-7':{briefing:[2],market:[1],code:[1]},
    nightfall:{briefing:[last],rescue:[0],market:[0,1],finale:[1],gate:[last],minigame:[0]},
    ironbreak:{briefing:[last],decision:[1],market:[0,1],minigame:[0,1],gate:[last],finale:[last]},
    blackline:{briefing:[last],decision:[last],market:[last],gate:[last],minigame:[0],finale:[last]},
    'coastal-escape':{briefing:[last],market:[1,2],gate:[last],minigame:[0],finale:[2]},
    'nightfall-false-haven':{briefing:[last],decision:[last],market:[last],gate:[last],minigame:[0],finale:[last]},
    kingsgate:{briefing:[last],decision:[last],market:[last],gate:[last],minigame:[last],finale:[last]},
    'journey-west':{gate:[0,1]}
  };
  // Sentence positions for paragraphs that mix fiction and operating directions.
  // The unlisted sentences remain story text, in their original order.
  const mixed={
    'The Asterion breach':{2:[0]},
    'The facility chooses a target':{1:[2]},
    'Prepare before the signal dies':{0:[1]},
    'The message belongs to everyone':{0:[1,2],1:[0]},
    'The Silent Terminal':{3:[2,3,4]},
    'Two Voices in the Static':{1:[2]},
    'The Last Supply Cage':{0:[1,2]},
    'The Road We Choose':{1:[1,2],2:[3]},
    'Last Bus Out':{0:[1,2]},
    'The mountain wakes':{1:[]},
    'Dead Frequency':{1:[0,1]},
    'A Door Still Open':{1:[1]},
    'The Rooftop Relay':{1:[0]},
    'The Passenger Ledger':{1:[0]},
    'A Suit for the Crossing':{0:[1,2]},
    'The Pump Circuit':{0:[1],1:[]},
    'The Crane Ledger':{1:[0,1]},
    'An Open Channel':{1:[0]},
    'The Cargo We Carry':{1:[0,1]},
    'The Missing Addresses':{1:[0]},
    'Signal Through the Smoke':{1:[0]},
    'Beyond the Line':{0:[1],2:[3]},
    'Who Is Still Waiting?':{1:[2,3]},
    'A Circuit Too Few':{1:[3]},
    'Shelter Four':{1:[0]},
    'The Transfer Ledger':{1:[0]},
    'An Open Gate':{0:[2],2:[3]},
    'The Hangar Below the Cliffs':{2:[1,2]},
    'The Last Hours in the Hangar':{1:[1,2,3]},
    'The Coastal Crossing':{0:[2,3]},
    'Bearings in the Dark':{1:[1]},
    'The Harbor Ledger':{1:[0]},
    'A Signal Beyond the Reef':{1:[0]},
    'The Aircraft We Leave Behind':{2:[0,1],3:[2]},
    'Mountain Path':{0:[1]},
    'Cave Approach':{0:[1]},
    'Shrine Courtyard':{0:[1,2]}
  };
  const extra=['Last Checkpoint','One More Check','One More Preparation Check','Extra Suit Preparation'].includes(scene.title);
  const indexes=roles[id]?.[stage]||[],narrative=[],instructions=[];
  paragraphs.forEach((p,i)=>{
    const positions=id==='journey-west'&&stage==='gate'&&i===0?[1,2]:mixed[scene.title]?.[i];
    if(positions&&!extra){
      const story=[],task=[];
      p.split(/(?<=[.!?])\s+/).forEach((sentence,j)=>(positions.includes(j)?task:story).push(sentence));
      if(story.length)narrative.push(story.join(' '));if(task.length)instructions.push(task.join(' '));
    }else (extra||indexes.includes(i)?instructions:narrative).push(p);
  });
  return {narrative,instructions};
}
export function instructionPanel(paragraphs,escape){
  return paragraphs.length?`<aside class="mission-instructions" aria-label="Student instructions"><h2>Student instructions</h2>${paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</aside>`:'';
}
export function reviewParagraphs(scene,stage,cartridge,escape){
  const {narrative,instructions}=splitScene(scene,stage,cartridge);
  return (narrative.length?`<div class="story-prose"><p class="story-label">Story</p>${narrative.map(p=>`<p>${escape(p)}</p>`).join('')}</div>`:'')+instructionPanel(instructions,escape);
}

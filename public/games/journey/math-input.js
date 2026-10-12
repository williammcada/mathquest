const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function answerInput(item){
  const field=(name,label)=>'<input data-answer-part="'+name+'" aria-label="'+label+'" inputmode="decimal" autocomplete="off">';
  const fraction='<span class="j-fraction">'+field('numerator','Numerator')+field('denominator','Denominator')+'</span>';
  if(item.answerType==='engine-text'||item.answerType==='engine-keys')return '<input data-answer-part="main" aria-label="Answer" inputmode="'+(item.answerType==='engine-text'?'text':'decimal')+'" autocomplete="off" autocapitalize="off" spellcheck="false">'+(item.answerType==='engine-keys'&&item.keys?.length?'<small>Use digits and '+esc(item.keys.filter(k=>!/^[0-9.\-\/]$/.test(k)).join(' '))+'</small>':'');
  if(item.answerType==='choice')return '<select data-answer-part="choice" aria-label="Answer">'+(item.options||[]).map(o=>'<option value="'+esc(o)+'">'+esc(o)+'</option>').join('')+'</select>';
  if(item.answerType==='fraction')return fraction+'<small>For an integer, leave the denominator blank.</small>';
  if(item.answerType==='mixed')return field('whole','Whole number')+fraction;
  if(item.answerType==='ratio')return field('left','First value')+' : '+field('right','Second value');
  if(item.answerType==='scientific')return field('coefficient','Coefficient')+' × 10<sup>'+field('exponent','Exponent')+'</sup>';
  return (item.answerType==='money'?esc(item.currency||'$'):'')+field('main','Answer')+(item.answerType==='percent'?' %':item.answerType==='unit'?' '+esc(item.unit):'');
}
export function readAnswer(root,type){const get=name=>root.querySelector('[data-answer-part="'+name+'"]')?.value.trim()||'';
  if(type==='choice')return get('choice');if(type==='fraction')return get('denominator')?get('numerator')+'/'+get('denominator'):get('numerator');
  if(type==='mixed')return get('whole')+' '+get('numerator')+'/'+get('denominator');if(type==='ratio')return get('left')+':'+get('right');
  if(type==='scientific')return get('coefficient')+'e'+get('exponent');return get('main');}

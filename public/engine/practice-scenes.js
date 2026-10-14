import {SceneAssets} from '../vault7-assets.js?v=0.12.0';
import {NIGHTFALL} from '../cartridges.js?v=0.12.0';
// Practice-only viewer: no room credentials, commands or evidence.
const scenes=location.pathname.includes('nightfall')?Object.entries(NIGHTFALL.assets).filter(([,src])=>/\.(png|webp|svg)$/.test(src)).map(([id,src])=>({id,src})):Object.entries(SceneAssets).map(([id,a])=>({id,src:a.src}));
const section=document.createElement('details');section.className='panel';
const summary=document.createElement('summary');summary.textContent='Scene artwork viewer';section.append(summary);
const select=document.createElement('select');select.setAttribute('aria-label','Scene artwork');for(const s of scenes){const option=document.createElement('option');option.value=s.src;option.textContent=s.id;select.append(option);}section.append(select);
const img=document.createElement('img');img.style.cssText='display:block;max-width:100%;width:640px;height:auto;margin-top:12px';section.append(img);
const update=()=>{img.src=select.value;img.alt=select.selectedOptions[0].textContent;};select.onchange=update;update();(document.querySelector('main')||document.body).append(section);

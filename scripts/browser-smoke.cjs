const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.MQ_CHROMIUM?{executablePath:process.env.MQ_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
 const errors=[],base='http://127.0.0.1:5187';
 const teacher=await browser.newPage({viewport:{width:1280,height:900}});
 teacher.on('pageerror',e=>errors.push(e.message));
 await teacher.goto(base);await teacher.selectOption('#cartridge-select','nightfall');assert.match(await teacher.locator('#create').innerText(),/Nightfall/);
 const created=await teacher.evaluate(async passcode=>{const r=await fetch('/api/sessions',{method:'POST',headers:{'content-type':'application/json','x-mathquest-teacher':passcode},body:JSON.stringify({cartridgeId:'nightfall',teamNames:['Night Crew','Empty'],gateCount:3,modules:[{source:'custom',title:'Smoke',items:[1,2,3].map(i=>({prompt:`Enter 1 (${i})`,answer_type:'integer',answer:'1'}))}]})},process.env.MQ_TEACHER_PASSCODE||'');return r.json();});
 assert.ok(created.code,JSON.stringify(created));
 await teacher.goto(`${base}/?session=${created.code}&teacher=${created.teacherKey}`);await teacher.waitForSelector('.pin');
 const pin=await teacher.locator('.pin').first().innerText();
 const pages=[];
 for(const [i,name] of ['Alpha','Bravo'].entries()){
 const context=await browser.newContext({viewport:{width:i?390:1024,height:i?844:768},hasTouch:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`${base}/?session=${created.code}&student=1`);await page.locator('#alias').fill(name);await page.locator('#pin').fill(pin);await page.locator('#join').click();await page.getByText('Awaiting mission launch').waitFor();pages.push(page);
 }
 teacher.on('dialog',d=>d.accept());await teacher.locator('[data-teacher-command=start]').click();
 for(const page of pages){await page.locator('[data-action="briefing.ready"]').click();}
 async function solve(){for(const page of pages){await page.locator('[data-answer-key="1"]').click();await page.locator('[data-action="math.submit"]').click();}}
 async function vote(choice){for(const page of pages)await page.locator(`[data-exp-vote="${choice}"]`).click();for(const page of pages){if(await page.locator('[data-action="choice.resolve"]').count()){await page.locator('[data-action="choice.resolve"]').click();break;}}}
 await solve();await vote('clinic');await solve();await solve();
 for(const page of pages){await page.locator('[data-exp-item="vest"]').click();await page.locator('[data-exp-item="ammo-pouch"]').click();await page.locator('[data-action="market.ready"]').click();}
 await pages[1].locator('[data-action="market.commit"]').click();
 for(const page of pages){await page.locator('[data-assist]').click();await page.locator('[data-start]').click();for(let i=0;i<6;i++)await page.locator('[data-safe]').click();}
 await vote('return');
 for(const page of pages){await page.getByText('One More Stop',{exact:true}).waitFor();assert.ok(await page.locator('.scene-image img').evaluate(img=>img.complete&&img.naturalWidth>0));}
 await pages[1].screenshot({path:'../nightfall-mobile-ending.png',fullPage:true});await teacher.screenshot({path:'../nightfall-teacher.png',fullPage:true});
 const practice=await browser.newPage({viewport:{width:1024,height:768}});practice.on('pageerror',e=>errors.push(e.message));await practice.goto(base+'/practice-nightfall.html');await practice.locator('[data-start]').click();await practice.keyboard.down('ArrowRight');await practice.waitForTimeout(1000);await practice.keyboard.up('ArrowRight');await practice.screenshot({path:'../nightfall-practice.png',fullPage:true});
 assert.equal(await practice.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);console.log('Browser smoke passed: setup, two browsers, mobile join, gates, voting, baskets, assisted endings, loaded art and practice movement.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

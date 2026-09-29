const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.APP_URL||'http://127.0.0.1:5180');
  await page.getByRole('button',{name:'완성했어요!',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.complete-button').disabled);
  assert.equal(await page.locator('.palette-dock').count(),1);
  for(const [width,height] of [[1280,800],[1280,720],[1024,640]]){
   await page.setViewportSize({width,height});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true);
   const bounds=await page.locator('.header button,.palette-dock button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {min:b.closest('.header')?48:56,w:r.width,h:r.height,x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
   assert(bounds.every(b=>b.w>=b.min-.1&&b.h>=b.min-.1&&b.x>=0&&b.y>=0&&b.right<=width&&b.bottom<=height));
  }
  await page.setViewportSize({width:1280,height:800});
  const seed=JSON.parse(fs.readFileSync('artwork/qa-results.json','utf8'))[0].seed;
  const x=seed%700,y=Math.floor(seed/700);
  const box=await page.locator('canvas').boundingBox();
  const tap=()=>page.touchscreen.tap(box.x+box.width*(x+.5)/700,box.y+box.height*(y+.5)/600);
  const pixel=()=>page.locator('canvas').evaluate((c,[x,y])=>[...c.getContext('2d').getImageData(x,y,1,1).data],[x,y]);
  const original=await pixel();await tap();assert.notDeepEqual(await pixel(),original);
  assert.equal(await page.locator('.tap-sparkles').count(),1);
  await page.getByRole('button',{name:'지우개',exact:true}).click();await tap();assert.deepEqual(await pixel(),original);
  await page.getByRole('button',{name:'실행 취소',exact:true}).click();assert.notDeepEqual(await pixel(),original);
  const reset=page.getByRole('button',{name:'전체 지우기',exact:true});
  await reset.click();assert.equal(await page.getByRole('dialog').count(),0);
  const rb=await reset.boundingBox();await page.mouse.move(rb.x+rb.width/2,rb.y+rb.height/2);
  await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();
  await page.waitForTimeout(950);assert.equal(await page.getByRole('dialog').count(),0);
  await page.mouse.down();await page.waitForTimeout(1550);await page.mouse.up();
  assert.equal(await page.getByRole('button',{name:'새 도화지 다시 그리기'}).isVisible(),true);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.getByRole('button',{name:'도안 바꾸기',exact:true}).click();
  await page.getByRole('button',{name:/^공주/}).click();
  assert.equal(await page.locator('.drawing-card').count(),8);
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.screenshot({path:'tablet-preview.png'});
  await page.getByRole('button',{name:'완성했어요!',exact:true}).click();
  assert.equal(await page.getByRole('dialog',{name:'작품 완성'}).isVisible(),true);
  await page.screenshot({path:'tablet-complete.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: landscape sizes, 56px targets, no overflow, fill, eraser, undo, reset confirmation, 80-page picker, completion');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

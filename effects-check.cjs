const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800},isMobile:true,hasTouch:true});
  await page.addInitScript(()=>{
   window.playedClips=[];window.voiceAudio=null;
   const play=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(...args){window.playedClips.push(this.src);window.voiceAudio=this;return play.apply(this,args);};
   window.soundStarts=0;
   const original=OscillatorNode.prototype.start;
   OscillatorNode.prototype.start=function(...args){window.soundStarts++;return original.apply(this,args);};
  });
  await page.goto(process.env.APP_URL || 'http://localhost:5173');
  await page.locator('.complete-button').waitFor();
  await page.waitForFunction(()=>!document.querySelector('.complete-button').disabled);
  await page.getByRole('button',{name:'색상 #f7ae6b',exact:true}).click();
  await page.waitForFunction(()=>window.voiceAudio?.currentTime>0);
  assert.match(await page.evaluate(()=>window.playedClips[0]),/orange\.mp3$/);
  await page.getByRole('button',{name:'효과음 끄기',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.voiceAudio.paused),true);
  await page.getByRole('button',{name:'색상 #f7d665',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.soundStarts),0);
  assert.equal(await page.evaluate(()=>window.playedClips.length),1);
  await page.getByRole('button',{name:'효과음 켜기',exact:true}).click();
  const before=await page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.getByRole('button',{name:'완성했어요!',exact:true}).click();
  await page.waitForFunction(()=>window.soundStarts===4);
  assert.equal(await page.getByRole('dialog',{name:'작품 완성'}).isVisible(),true);
  assert.equal(await page.locator('.finished-art').getAttribute('src'),before);
  assert.equal(await page.locator('.confetti i').count(),60);
  await page.screenshot({path:'completion-preview.png',fullPage:true});
  await page.getByRole('button',{name:'내 갤러리에 쏙!',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('little-palette-gallery')).length),1);
  await page.getByRole('button',{name:'더 그릴래!',exact:true}).click();
  assert.equal(await page.locator('canvas').evaluate(c=>c.toDataURL()),before);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'완성했어요!',exact:true}).click();
  assert.equal(await page.locator('.confetti').isVisible(),false);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  console.log('PASS: color audio, mute, completion melody, preview, save, resume, reduced motion, mobile layout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

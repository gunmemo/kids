const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try {
  const p=await b.newPage({viewport:{width:1280,height:800},hasTouch:true});
  await p.goto(process.env.APP_URL||'http://127.0.0.1:5180');
  await p.getByRole('button',{name:'도안 바꾸기',exact:true}).click();await p.getByRole('button',{name:'기본',exact:true}).click();await p.getByRole('button',{name:'자유그림 밑그림 선택',exact:true}).click();
  await p.waitForFunction(()=>!document.querySelector('.complete-button').disabled);
  await p.waitForFunction(()=>{const c=document.querySelector('canvas');return c.getContext('2d').getImageData(0,0,700,600).data.every(v=>v===255);});
  const snapshot=()=>p.locator('canvas').evaluate(c=>c.toDataURL());
  const before=await snapshot();
  await p.getByRole('button',{name:'색상 #4189ed',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'자유그림 펜',exact:true}).getAttribute('aria-pressed'),'true');
  const r=await p.locator('canvas').boundingBox();
  await p.mouse.move(r.x+r.width*.25,r.y+r.height*.3);await p.mouse.down();
  await p.mouse.move(r.x+r.width*.6,r.y+r.height*.5,{steps:8});await p.mouse.up();
  const drawn=await snapshot();assert.notEqual(drawn,before);
  await p.getByRole('button',{name:'실행 취소',exact:true}).click();assert((await snapshot())===before,'Undo restores original');
  await p.getByRole('button',{name:'다시 실행',exact:true}).click();assert((await snapshot())===drawn,'History restores drawn state');
  await p.getByRole('button',{name:'스탬프',exact:true}).click();
  await p.getByRole('button',{name:'하트 스탬프',exact:true}).click();
  await p.touchscreen.tap(r.x+r.width*.5,r.y+r.height*.65);
  const stamped=await snapshot();assert.notEqual(stamped,drawn);
  await p.getByRole('button',{name:'실행 취소',exact:true}).click();assert.equal(await snapshot(),drawn);
  await p.getByRole('button',{name:'다시 실행',exact:true}).click();
  for(const [label,fraction] of [['별',.3],['꽃',.7]]){await p.getByRole('button',{name:label+' 스탬프',exact:true}).click();await p.touchscreen.tap(r.x+r.width*fraction,r.y+r.height*.65);}
  for(const [width,height] of [[1280,800],[1280,720],[1024,640]]){
   await p.setViewportSize({width,height});
   const bounds=await p.locator('.palette-dock').boundingBox();const board=await p.locator('.paper').boundingBox();
   assert(bounds.x>board.x+board.width);
   assert(bounds.y>=0&&bounds.y+bounds.height<=height);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true);
  }
  await p.setViewportSize({width:1280,height:800});await p.screenshot({path:'drawing-tools-preview.png'});
  console.log('PASS: right palette, free drawing, pen color, stamp, undo/redo, tablet layouts');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

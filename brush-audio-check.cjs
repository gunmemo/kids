const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try{
 const p=await b.newPage({viewport:{width:1024,height:640}});
 await p.addInitScript(()=>{
  window.synthEvents=[];window.liveSynth=new Set();
  for(const Type of [OscillatorNode,AudioBufferSourceNode]){
   const original=Type.prototype.start;
   Type.prototype.start=function(...args){window.synthEvents.push({type:Type.name,freq:this.frequency?.value});window.liveSynth.add(this);this.addEventListener('ended',()=>window.liveSynth.delete(this));return original.apply(this,args)};
  }
 });
 await p.goto(process.env.APP_URL||'http://127.0.0.1:5180');
 await p.getByRole('button',{name:'도안 바꾸기',exact:true}).click();await p.getByRole('button',{name:'기본',exact:true}).click();await p.getByRole('button',{name:'자유그림 밑그림 선택',exact:true}).click();
 await p.waitForFunction(()=>!document.querySelector('.complete-button').disabled);
 await p.locator('[data-brush="crayon"]').click();
 await p.waitForFunction(()=>synthEvents.some(e=>e.type==='AudioBufferSourceNode'));
 const bounds=await p.locator('.palette-dock').boundingBox();assert(bounds.y+bounds.height<=640);
 await p.locator('[data-brush="neon"]').click();
 await p.waitForTimeout(300);
 await p.evaluate(()=>synthEvents=[]);
 const r=await p.locator('canvas').boundingBox();
 await p.mouse.move(r.x+r.width*.3,r.y+r.height*.4);await p.mouse.down();
 for(let i=1;i<=3;i++){await p.waitForTimeout(130);await p.mouse.move(r.x+r.width*(.3+i*.08),r.y+r.height*.4);}
 await p.mouse.up();
 const notes=await p.evaluate(()=>synthEvents.filter(e=>e.type==='OscillatorNode').map(e=>e.freq).filter((_,i)=>i%2===0));
 assert(notes.length>=3);assert(notes[0]<notes[1]&&notes[1]<notes[2],JSON.stringify(notes));
 await p.waitForFunction(()=>liveSynth.size===0);
 await p.getByRole('button',{name:'효과음 끄기',exact:true}).click();
 await p.evaluate(()=>synthEvents=[]);
 await p.locator('[data-brush="crayon"]').click();
 await p.mouse.move(r.x+r.width*.4,r.y+r.height*.5);await p.mouse.down();await p.mouse.move(r.x+r.width*.6,r.y+r.height*.5);await p.mouse.up();
 assert.equal(await p.evaluate(()=>synthEvents.length),0);
 await p.getByRole('button',{name:'효과음 켜기',exact:true}).click();
 // Stop a pending resume before it can create nodes.
 assert.equal(await p.evaluate(async()=>{const a=await import('/src/sound.js');synthEvents=[];const pending=a.startBrushSound('neon');a.stopSounds();await pending;return synthEvents.length}),0);
 await p.getByRole('button',{name:'스탬프',exact:true}).click();
 await p.waitForFunction(()=>synthEvents.some(e=>e.type==='OscillatorNode'));
 console.log('PASS: crayon noise, rising neon notes, pointer-up stop, mute, resume cancellation, button pop, 1024×640 layout');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});

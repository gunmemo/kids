const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.goto(process.env.APP_URL||'http://127.0.0.1:5180');
  await page.getByRole('button',{name:'도안 바꾸기',exact:true}).click();
  await page.getByRole('button',{name:/^공주/}).click();
  await page.getByRole('button',{name:'보석 티아라를 쓰고 춤추는 파티 공주 밑그림 선택',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.complete-button').disabled);
  const result=await page.locator('canvas').evaluate(async canvas=>{
   const {createFillMap,floodFill}=await import('/src/fill.js');
   const ctx=canvas.getContext('2d'),original=ctx.getImageData(0,0,700,600);
   const map=createFillMap(original), image=new ImageData(original.data.slice(),700,600);
   const seeds=[[324,347],[351,335],[383,328],[342,375],[386,361]];
   const ids=[...new Set(seeds.map(([x,y])=>map.regions[y*700+x]))];
   let fringe=0,changedOutside=0,changedInk=0;
   for(const [x,y] of seeds)floodFill(image,x,y,'#906b55',map);
   for(let p=0;p<map.regions.length;p++){
    const o=p*4,d=original.data;
    const changed=[0,1,2].some(c=>image.data[o+c]!==d[o+c]);
    if(changed&&!ids.includes(map.regions[p]))changedOutside++;
    if(changed&&Math.max(d[o],d[o+1],d[o+2])<65)changedInk++;
    if(changed&&d[o]>=65&&d[o]<=210)fringe++;
   }
   for(const [x,y] of seeds)floodFill(image,x,y,'#4189ed',map);
   for(const [x,y] of seeds)floodFill(image,x,y,'#ffffff',map);
   const restored=image.data.every((v,i)=>v===original.data[i]);
   return {ids,fringe,changedOutside,changedInk,restored,seeds};
  });
  assert(result.ids.every(Boolean));assert.equal(result.ids.length,5);
  assert(result.fringe>0);assert.equal(result.changedOutside,0);assert.equal(result.changedInk,0);assert(result.restored);
  await page.getByRole('button',{name:'색상 #906b55',exact:true}).click();
  const box=await page.locator('canvas').boundingBox();
  for(const [x,y] of result.seeds)await page.mouse.click(box.x+box.width*(x+.5)/700,box.y+box.height*(y+.5)/600);
  await page.screenshot({path:'ribbon-fixed.png'});
  console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

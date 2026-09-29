// Run with Playwright available on NODE_PATH and the Vite server running.
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const catalog = JSON.parse(fs.readFileSync('artwork/catalog.json','utf8'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 await page.goto(process.env.APP_URL||'http://127.0.0.1:5180');
 const results=[];
 for(const item of catalog){
  if(!fs.existsSync(`public/artwork/${item.id}.png`)){
   if(process.argv.includes('--partial'))continue;
   throw new Error(`Missing artwork: ${item.id}`);
  }
  const result=await page.evaluate(async id=>{
   const {floodFill,createFillMap}=await import('/src/fill.js');
   const img=new Image();img.src=`/artwork/${id}.png`;await img.decode();
   const c=document.createElement('canvas');c.width=700;c.height=600;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   ctx.fillStyle='white';ctx.fillRect(0,0,700,600);
   const scale=Math.min(700/img.width,600/img.height);
   ctx.drawImage(img,(700-img.width*scale)/2,(600-img.height*scale)/2,img.width*scale,img.height*scale);
   const original=ctx.getImageData(0,0,700,600), d=original.data;
   const visited=new Uint8Array(420000), regions=[];
   let dark=0,edgeInk=0;
   for(let p=0;p<420000;p++){
    if(d[p*4]<100){dark++;if(p%700<3||p%700>696||p<2100||p>=417900)edgeInk++;}
    if(visited[p]||d[p*4]<220||d[p*4+1]<220||d[p*4+2]<220)continue;
    const queue=[p];visited[p]=1;let border=false;
    for(let j=0;j<queue.length;j++){
     const q=queue[j],x=q%700,y=Math.floor(q/700);
     if(x===0||x===699||y===0||y===599)border=true;
     for(const n of [x>0?q-1:-1,x<699?q+1:-1,y>0?q-700:-1,y<599?q+700:-1]){
      if(n<0||visited[n])continue;
      visited[n]=1;
      if(d[n*4]>=220&&d[n*4+1]>=220&&d[n*4+2]>=220)queue.push(n);
     }
    }
    if(!border&&queue.length>=900)regions.push({area:queue.length,seed:queue[Math.floor(queue.length/2)]});
   }
   regions.sort((a,b)=>b.area-a.area);
   let fillPass=true;
   for(const region of regions.slice(0,3)){
    const copy=new ImageData(new Uint8ClampedArray(d),700,600);
    const changed=floodFill(copy,region.seed%700,Math.floor(region.seed/700),'#f17977',createFillMap(original));
    let colored=0,leak=false,lineChanged=false;
    for(let p=0;p<420000;p++){
     const o=p*4;
     if(copy.data[o]!==d[o]||copy.data[o+1]!==d[o+1]||copy.data[o+2]!==d[o+2]){colored++;if(p%700===0||p%700===699||p<700||p>=419300)leak=true;}
     if(d[o]<65&&d[o+1]<65&&d[o+2]<65&&copy.data[o]!==d[o])lineChanged=true;
    }
    fillPass&&=changed&&!leak&&!lineChanged&&colored>=region.area*.95;
   }
   return {id,width:img.width,height:img.height,largeRegions:regions.length,largestRegion:regions[0]?.area||0,darkPixels:dark,edgeInk,fillPass,seed:regions[0]?.seed};
  },item.id);
  result.pass=result.largeRegions>=3&&result.darkPixels>3000&&result.edgeInk===0&&result.fillPass;
  results.push(result);
 }
 fs.writeFileSync('artwork/qa-results.json',JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({checked:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass)},null,2));
 await browser.close();
 assert(results.every(r=>r.pass),'Some artwork needs inspection or repair');
})().catch(e=>{console.error(e);process.exit(1)});

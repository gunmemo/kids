import { test } from 'node:test';
import assert from 'node:assert/strict';
import { floodFill, createFillMap } from './fill.js';

test('anti-aliased edges recolor from original ink without halos or leaking', () => {
 const levels=[255,240,180,100,20,100,180,240,255];
 const original={width:9,height:1,data:new Uint8ClampedArray(levels.flatMap(v=>[v,v,v,255]))};
 const image={...original,data:original.data.slice()};
 const map=createFillMap(original);
 floodFill(image,0,0,'#906b55',map);
 assert.deepEqual([...image.data.slice(8,12)],[102,76,60,255]);
 assert.deepEqual([...image.data.slice(12,16)],[56,42,33,255]);
 assert.deepEqual([...image.data.slice(16)], [...original.data.slice(16)]);
 floodFill(image,0,0,'#000000',map);
 assert.equal(floodFill(image,0,0,'#4189ed',map),true);
 assert.deepEqual([...image.data.slice(8,12)],[46,97,167,255]);
 floodFill(image,0,0,'#ffffff',map);
 assert.deepEqual(image.data,original.data);
 assert.equal(floodFill(image,4,0,'#ff0000',map),false);
});
test('fill stays inside boundaries and supports recoloring', () => {
 const image = { width: 5, height: 3, data: new Uint8ClampedArray(60).fill(255) };
 for(let y=0;y<3;y++) image.data.set([30,30,30,255], (y*5+2)*4);
 const map=createFillMap(image);
 assert.equal(floodFill(image,0,0,'#ff0000',map), true);
 assert.deepEqual([...image.data.slice(0,4)], [255,0,0,255]);
 assert.deepEqual([...image.data.slice(16,20)], [255,255,255,255]);
 assert.equal(floodFill(image,2,0,'#00ff00',map), false);
 floodFill(image,0,0,'#00ff00',map);
 assert.deepEqual([...image.data.slice(0,4)], [0,255,0,255]);
 assert.equal(floodFill(image,-1,0,'#00ff00',map), false);
 floodFill(image,0,0,'#424b52',map);
 floodFill(image,0,0,'#f17977',map);
 assert.deepEqual([...image.data.slice(8,12)], [30,30,30,255]);
 assert.deepEqual([...image.data.slice(16,20)], [255,255,255,255]);
});

test('generated-art gap repair seals a four-pixel break and protects outside background',()=>{
 const original={width:30,height:30,data:new Uint8ClampedArray(30*30*4).fill(255)};
 const ink=(x,y)=>original.data.set([0,0,0,255],(y*30+x)*4);
 for(let v=5;v<=24;v++){ink(5,v);ink(24,v);ink(v,24);if(v<12||v>15)ink(v,5);}
 const raw=createFillMap(original);assert.equal(raw.regions[15*30+15],raw.regions[0]);
 const map=createFillMap(original,{closeGaps:true,protectBackground:true});
 assert.notEqual(map.regions[15*30+15],map.regions[0]);
 const image={...original,data:original.data.slice()};assert(floodFill(image,15,15,'#ff0000',map));
 assert.deepEqual([...image.data.slice(0,4)],[255,255,255,255]);
 assert.deepEqual([...image.data.slice((5*30+5)*4,(5*30+5)*4+4)],[0,0,0,255]);
 assert.equal(floodFill(image,0,0,'#00ff00',map),false);
 floodFill(image,15,15,'#ffffff',map);assert.deepEqual(image.data,original.data);
});
test('large unrepairable openings never flood the entire generated-art canvas',()=>{
 const image={width:30,height:30,data:new Uint8ClampedArray(3600).fill(255)};
 const map=createFillMap(image,{closeGaps:true,protectBackground:true});
 assert.equal(floodFill(image,15,15,'#ff0000',map),false);
 assert(image.data.every(v=>v===255));
});

test('gap closing preserves tiny enclosed crater centers',()=>{
 const image={width:20,height:20,data:new Uint8ClampedArray(1600).fill(255)};
 for(let y=7;y<=12;y++)for(let x=7;x<=12;x++)if(x===7||x===12||y===7||y===12)image.data.set([0,0,0,255],(y*20+x)*4);
 const map=createFillMap(image,{closeGaps:true,protectBackground:true});
 assert(map.regions[9*20+9]>0);assert(!map.background.has(map.regions[9*20+9]));
 assert(floodFill(image,9,9,'#ff0000',map));
 assert.deepEqual([...image.data.slice((9*20+9)*4,(9*20+9)*4+4)],[255,0,0,255]);
 assert.deepEqual([...image.data.slice(0,4)],[255,255,255,255]);
});

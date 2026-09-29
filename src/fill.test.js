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

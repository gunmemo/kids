import {test} from 'node:test';
import assert from 'node:assert/strict';
import {speakColor,stopSpeech,colorNames} from './sound.js';
test('recorded color clips replace previous playback and stop on mute',async()=>{
 const clips=[];
 globalThis.window={Audio:class {
  constructor(src){this.src=src;this.currentTime=0;this.paused=true;clips.push(this);}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
 }};
 try {
  assert.equal(Object.keys(colorNames).length,14);
  await speakColor('#f17977');assert.match(clips[0].src,/red\.mp3$/);
  await speakColor('#4189ed');assert(clips[0].paused);assert.match(clips[1].src,/blue\.mp3$/);
  stopSpeech();assert(clips[1].paused);
  await speakColor('#85bddd');assert.match(clips[2].src,/light-blue\.mp3$/);
  clips[2].currentTime=.5;await speakColor('#85bddd');assert.equal(clips[2].currentTime,0);
  clips[2].play=()=>Promise.reject(new Error('Audio unavailable'));
  assert.equal(await speakColor('#85bddd'),false);
 } finally {stopSpeech();delete globalThis.window;}
});

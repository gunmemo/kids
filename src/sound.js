let context;
let audioEpoch=0, brushEpoch=0, neonStep=0, lastBrushTime=-Infinity;
const sources=new Set(), brushSources=new Set();
async function audioContext(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  context ||= new Audio();await context.resume();return context;
}
function track(source,nodes,brush=false){
  sources.add(source);if(brush)brushSources.add(source);
  source.onended=()=>{sources.delete(source);brushSources.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
}
export function stopBrushSound(){
  brushEpoch++;
  for(const source of brushSources){try{source.stop();}catch{}}
  brushSources.clear();
}
export function stopSounds(){
  audioEpoch++;stopBrushSound();stopSpeech();
  for(const source of sources){try{source.stop();}catch{}}
  sources.clear();
}
export const colorNames = {
  '#f17977':'Red', '#f7ae6b':'Orange', '#f7d665':'Yellow',
  '#a5ca8b':'Green', '#72bba7':'Mint', '#85bddd':'Light blue',
  '#9e9bcf':'Lavender', '#d9a1bf':'Pink', '#906b55':'Brown',
  '#424b52':'Gray', '#ffffff':'White', '#4189ed':'Blue',
  '#6654c0':'Purple', '#49c8c1':'Turquoise',
};
const voiceClips=new Map();
let activeVoice;
export function stopSpeech() {
  if(activeVoice){activeVoice.pause();activeVoice.currentTime=0;activeVoice=null;}
}
export async function speakColor(hex) {
  const name=colorNames[hex];
  if(!name)return false;
  stopSpeech();
  try {
    if(!voiceClips.has(hex)) {
      const file=name.toLowerCase().replaceAll(' ','-');
      const clip=new window.Audio((import.meta.env?.BASE_URL || '/')+'audio/colors/'+file+'.mp3');
      clip.preload='auto';clip.volume=.9;
      voiceClips.set(hex,clip);
    }
    const clip=voiceClips.get(hex);activeVoice=clip;
    await clip.play();
    return true;
  } catch { return false; }
}
export async function playSound(complete = false, index = 0) {
  try {
    const epoch=audioEpoch;
    if(!await audioContext() || epoch!==audioEpoch)return;
    const notes = complete ? [523.25, 659.25, 783.99, 1046.5] : [440 * 2 ** (index / 12)];
    notes.forEach((frequency, i) => {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const start = context.currentTime + i * .13;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      if (!complete) oscillator.frequency.exponentialRampToValueAtTime(frequency * .5, start + .14);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.09, start + .012);
      gain.gain.exponentialRampToValueAtTime(.001, start + .22);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + .24);
      track(oscillator,[gain]);
    });
  } catch { /* Audio restrictions must never interrupt coloring. */ }
}

// Short envelopes stay quiet when the pointer is held still; movement renews them.
export async function startBrushSound(kind, preview=false) {
  stopBrushSound();const epoch=brushEpoch;
  try {
    if(!await audioContext() || epoch!==brushEpoch)return;
    const start=context.currentTime;
    if(kind==='crayon'){
      const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.22),context.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
      source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.7;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.055,start+.012);gain.gain.linearRampToValueAtTime(0,start+.2);
      source.connect(filter);filter.connect(gain);gain.connect(context.destination);
      track(source,[filter,gain],true);source.start();source.stop(start+.22);
    }else{
      const notes=[523.25,659.25,783.99,1046.5,1318.51];
      const frequency=notes[preview?0:neonStep++%notes.length];
      for(const [ratio,volume] of [[1,.065],[2.76,.012]]){
        const source=context.createOscillator(),gain=context.createGain();source.type='sine';source.frequency.value=frequency*ratio;
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+.18);
        source.connect(gain);gain.connect(context.destination);
        track(source,[gain],true);source.start();source.stop(start+.2);
      }
    }
  }catch{/* Sound must never block drawing. */}
}
export function beginBrushSound(kind){neonStep=0;lastBrushTime=-Infinity;continueBrushSound(kind);}
export function continueBrushSound(kind){
  const now=performance.now();if(now-lastBrushTime<110)return;
  lastBrushTime=now;startBrushSound(kind);
}

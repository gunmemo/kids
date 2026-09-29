import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Undo2, Redo2, Trash2, Download, Images, X, Check, Sparkles, ChevronRight, Volume2, VolumeX, Trophy, Eraser, RotateCw, Cloud, Star, Paintbrush, PaintBucket, Stamp, Heart, Flower2, BookOpen, Pencil, WandSparkles } from 'lucide-react';
import { drawings, labels, artUrl, categoryFor } from './art';
import { floodFill, createFillMap } from './fill';
import './style.css';
import {drawStamp} from './stamps';
import {drawBrush} from './brush';
import {DrawingGallery} from './DrawingGallery';
import { playSound, speakColor, stopSounds, stopBrushSound, startBrushSound, beginBrushSound, continueBrushSound } from './sound';

const colors = ['#f17977','#f7ae6b','#f7d665','#a5ca8b','#72bba7','#85bddd','#9e9bcf','#d9a1bf','#906b55','#424b52','#ffffff','#4189ed','#6654c0','#49c8c1'];
function IconButton({label, children, ...props}) { return <button title={label} aria-label={label} {...props}>{children}</button>; }
function HoldReset({disabled,onConfirm}) {
 const hold=useRef(null), timer=useRef(null);const [holding,setHolding]=useState(false);
 function cancel(){clearTimeout(timer.current);hold.current=null;setHolding(false);}
 function start(id){if(disabled||hold.current!==null)return;hold.current=id;setHolding(true);timer.current=setTimeout(()=>{hold.current=null;setHolding(false);onConfirm();},1500);}
 useEffect(()=>{window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);return()=>{clearTimeout(timer.current);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',cancel);};},[]);
 useEffect(()=>{if(disabled)cancel();},[disabled]);
 return <button className={'reset-button hold-reset '+(holding?'holding':'')} disabled={disabled} title="1.5초 꾹 눌러 전체 지우기" aria-label="전체 지우기" onPointerDown={e=>{if(!e.isPrimary||e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);start(e.pointerId);}} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cancel();}} onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)start('key');}}} onKeyUp={cancel} onClick={e=>e.preventDefault()}><Trash2 size={23} aria-hidden="true"/><svg className="hold-progress" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" pathLength="100"/></svg></button>;
}
function App() {
 const stroke = useRef(null), outline = useRef(null);
 const [brushKind,setBrushKind]=useState('crayon');
 const [brushSize,setBrushSize]=useState(16), [stamp,setStamp]=useState('star');
 const canvas = useRef(null), lineArt = useRef(null), fillMap = useRef(null), history = useRef([]), cursor = useRef(-1);
 const [drawing,setDrawing] = useState(drawings[0]), [category,setCategory] = useState(categoryFor(drawings[0])), [color,setColor] = useState(colors[0]), [tool,setTool] = useState('fill');
 const visibleDrawings = [...(category==='basic'?['blank']:[]),...drawings.filter(id => categoryFor(id) === category)];
 const [counts,setCounts] = useState([0,0]), [modal,setModal] = useState(null), [saved,setSaved] = useState([]), [toast,setToast] = useState(''), [ready,setReady] = useState(false);
 const [loadError,setLoadError] = useState(false);
 const [sound,setSound] = useState(true);
 const [finished,setFinished] = useState('');
 const [resetPreview,setResetPreview]=useState('');
 const [pickerPage,setPickerPage] = useState(0), [galleryPage,setGalleryPage] = useState(0);
 const [burst,setBurst] = useState(null);
 useEffect(()=>{if(!burst)return;const t=setTimeout(()=>setBurst(null),650);return()=>clearTimeout(t);},[burst]);
 function chooseColor(value) { if(tool==='eraser')setTool('fill');setColor(value); if(sound)speakColor(value); }
 function finish() { if(!ready)return; setFinished(canvas.current.toDataURL('image/png'));setModal('complete');if(sound)playSound(true); }
 const ctx = () => canvas.current.getContext('2d', {willReadFrequently:true});
 function paintOriginal(img) {
   const c=ctx(), scale=Math.min(700/img.naturalWidth,600/img.naturalHeight);
   c.fillStyle='white';c.fillRect(0,0,700,600);
   c.drawImage(img,(700-img.naturalWidth*scale)/2,(600-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);
 }
 function pushHistory() {
   history.current = history.current.slice(0,cursor.current+1);
   history.current.push(ctx().getImageData(0,0,700,600));
   // ponytail: cap full-canvas snapshots at 30 to bound mobile memory.
   if(history.current.length>30) history.current.shift();
   cursor.current=history.current.length-1; setCounts([cursor.current,0]);
 }
 useEffect(() => {
   let active=true;stopBrushSound();stroke.current=null;if(drawing==='blank')setTool('brush'); setReady(false);setLoadError(false);
   const img=new Image(); img.onload=()=>{if(!active)return; lineArt.current=img; paintOriginal(img); fillMap.current=createFillMap(ctx().getImageData(0,0,700,600)); outline.current=document.createElement('canvas');outline.current.width=700;outline.current.height=600;outline.current.getContext('2d').putImageData(ctx().getImageData(0,0,700,600),0,0); history.current=[]; cursor.current=-1; pushHistory(); setReady(true);}; img.onerror=()=>{if(active){setLoadError(true);setToast('도안을 불러오지 못했어요. 다른 도안을 선택해 주세요.');}}; img.src=artUrl(drawing);
   return ()=>{active=false;};
 },[drawing]);
 useEffect(()=>{try{setSaved(JSON.parse(localStorage.getItem('little-palette-gallery')||'[]'));}catch{setToast('저장한 그림을 불러오지 못했어요');}},[]);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(t);}},[toast]);
 useEffect(()=>{if(!modal)return;const previous=document.activeElement;function key(e){if(e.key==='Escape')setModal(null);if(e.key==='Tab'){const buttons=[...document.querySelectorAll('.modal button')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};},[modal]);
 useEffect(()=>{const stop=()=>stopSounds();window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);return()=>{stop();window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',stop);};},[]);
 useEffect(()=>{stopBrushSound();},[modal,tool]);
 function undo(delta) { const next=cursor.current+delta; if(next<0||next>=history.current.length)return; cursor.current=next;ctx().putImageData(history.current[next],0,0);setCounts([next,history.current.length-next-1]); }
 function position(e) {const r=canvas.current.getBoundingClientRect();return [(e.clientX-r.left)*700/r.width,(e.clientY-r.top)*600/r.height];}
 function down(e) {
   if(!ready || stroke.current || !e.isPrimary || (e.pointerType==='mouse' && e.button!==0))return;
   const [x,y]=position(e), c=ctx();
   if(tool==='stamp'){drawStamp(c,x,y,stamp,brushSize*4,color);pushHistory();if(sound)playSound(false,3);return;}
   if(tool==='brush'){
     stroke.current={id:e.pointerId,x,y,color,size:brushSize,kind:brushKind,outline:outline.current};if(sound)beginBrushSound(brushKind);canvas.current.setPointerCapture(e.pointerId);
     drawBrush(c,x,y,x,y,stroke.current);if(brushKind==='neon')setBurst({x:x/700*100,y:y/600*100,id:performance.now()});return;
   }
   if(tool==='fill'||tool==='eraser'){const data=c.getImageData(0,0,700,600);if(floodFill(data,x,y,tool==='eraser'?'#ffffff':color,fillMap.current)){c.putImageData(data,0,0);pushHistory();setBurst({x:x/700*100,y:y/600*100,id:performance.now()});if(sound)playSound(false,3);}return;}
 }
 function move(e){
   const s=stroke.current;if(!s||s.id!==e.pointerId)return;
   if(sound)continueBrushSound(s.kind);
   const [x,y]=position(e),c=ctx();drawBrush(c,s.x,s.y,x,y,s);
   if(s.kind==='neon'&&performance.now()-(s.lastSpark||0)>100){setBurst({x:x/700*100,y:y/600*100,id:performance.now()});s.lastSpark=performance.now();}s.x=x;s.y=y;
 }
 function up(e){if(stroke.current?.id!==e.pointerId)return;stroke.current=null;stopBrushSound();pushHistory();}
 function clear(){paintOriginal(lineArt.current);pushHistory();setModal(null);}
 function save(){
   const url=canvas.current.toDataURL('image/png'); const item={id:Date.now(),drawing,url};
   try{const next=[item,...saved].slice(0,24);localStorage.setItem('little-palette-gallery',JSON.stringify(next));setSaved(next);setToast('내 갤러리에 저장했어요!');return true;}
   catch{setToast('저장 공간이 부족해요. PNG로 내려받아 주세요.');setModal('saved');return false;}
 }
 function download(url=canvas.current.toDataURL('image/png')){const a=document.createElement('a');a.href=url;a.download=`little-palette-${Date.now()}.png`;a.click();}
 function select(id){if(id===drawing){setModal(null);return;}if(counts[0]>0){setModal({type:'switch',id});return;}setReady(false);setDrawing(id);setModal(null);}
 return <div className="app-shell" onClickCapture={e=>{const b=e.target.closest('button');if(sound&&b&&!b.disabled&&!b.matches('.swatch,.sound-toggle,.complete-button,.hold-reset,[data-brush]'))playSound();}} onDoubleClick={e=>e.preventDefault()} onContextMenu={e=>e.preventDefault()}>
   <header className="header">
     <div className="header-left"><div className="brand"><span className="brand-icon">🎨</span><span>마법 색칠나라<small>작은 손으로 만드는 큰 상상</small></span></div>
     <IconButton className="drawing-book" label="도안 바꾸기" onClick={()=>{setPickerPage(0);setModal('drawings');}}><BookOpen size={27}/></IconButton></div>
     <div className="header-space" aria-hidden="true"/>
     <div className="history-tools"><IconButton label="실행 취소" disabled={!counts[0]||!ready} onClick={()=>undo(-1)}><Undo2/></IconButton><IconButton label="다시 실행" disabled={!counts[1]||!ready} onClick={()=>undo(1)}><Redo2/></IconButton><span className="control-divider" aria-hidden="true"/><HoldReset disabled={!ready} onConfirm={()=>{setResetPreview(canvas.current.toDataURL('image/png'));setModal('clear');}}/><span className="control-divider" aria-hidden="true"/><IconButton className="sound-toggle" label={sound?'효과음 끄기':'효과음 켜기'} aria-pressed={sound} onClick={()=>{if(sound)stopSounds();setSound(!sound);}}>{sound?<Volume2/>:<VolumeX/>}</IconButton></div>
   </header>
   <main className="studio">
     <div className="sky-decoration" aria-hidden="true"><Cloud className="cloud cloud-left"/><Cloud className="cloud cloud-right"/><Star className="sky-star star-one"/><Sparkles className="sky-star star-two"/><Star className="sky-star star-three"/></div>
     <div className="paper">{!ready&&<div className="loading-art" role="status">{loadError?'다른 도안을 선택해 주세요':'도안을 불러오는 중…'}</div>}<canvas className={ready?'canvas-ready':''} ref={canvas} width="700" height="600" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} aria-label="색칠 캔버스: 색과 도구를 선택한 후 터치해 색칠하세요"/>{burst&&<div key={burst.id} className="tap-sparkles" aria-hidden="true" style={{left:burst.x+'%',top:burst.y+'%'}}>{Array.from({length:6},(_,i)=><span key={i} style={{'--dx':Math.cos(i*Math.PI/3)*55+'px','--dy':Math.sin(i*Math.PI/3)*55+'px','--spark':colors[i]}}>✦</span>)}</div>}</div>
     <div className="board-actions"><IconButton className="gallery-button" label="내 갤러리" onClick={()=>{setGalleryPage(0);setModal('saved');}}><Images/><span>내 작품</span></IconButton><button className="complete-button" disabled={!ready} onClick={finish}><Sparkles size={34} aria-hidden="true"/> 완성했어요!</button></div>
   </main>
   <aside className="palette-dock" role="toolbar" aria-label="색칠 도구">
     <div className="dock-heading">나만의 마법 도구 ✨</div>
     <div className="drawing-tools">{[['fill','색 채우기',PaintBucket],['brush','자유그림 펜',Paintbrush],['stamp','스탬프',Stamp]].map(([id,label,Icon])=><IconButton key={id} label={label} aria-pressed={tool===id} className={tool===id?'active':''} onClick={()=>setTool(id)}><Icon size={25}/></IconButton>)}</div>
     <div className="side-colors">{colors.map(c=><IconButton key={c} label={'색상 '+c} aria-pressed={tool!=='eraser'&&color===c} className={'swatch '+(c==='#ffffff'?'white-swatch ':'')+(tool!=='eraser'&&color===c?'active':'')} style={{'--swatch':c}} onClick={()=>chooseColor(c)}>{tool!=='eraser'&&color===c&&<Check size={26} color={c==='#ffffff'?'#53645c':'white'}/>}</IconButton>)}<IconButton label="지우개" aria-pressed={tool==='eraser'} className={'palette-eraser '+(tool==='eraser'?'active':'')} onClick={()=>setTool('eraser')}><Eraser size={28}/></IconButton></div>
     {tool==='brush'?<div className="brush-choices">{[['crayon','크레용',Pencil],['neon','네온',WandSparkles]].map(([id,label,Icon])=><button key={id} data-brush={id} aria-label={label} title={label} aria-pressed={brushKind===id} className={brushKind===id?'active':''} onClick={()=>{setBrushKind(id);if(sound)startBrushSound(id,true);}}><Icon size={38} strokeWidth={2.5} aria-hidden="true"/></button>)}</div>:<div className="stamp-choices">{[['star','별',Star],['heart','하트',Heart],['flower','꽃',Flower2]].map(([id,label,Icon])=><IconButton key={id} label={label+' 스탬프'} aria-pressed={tool==='stamp'&&stamp===id} className={tool==='stamp'&&stamp===id?'active':''} onClick={()=>{setStamp(id);setTool('stamp');}}><Icon size={26}/></IconButton>)}</div>}

     <div className="brush-sizes">{[8,16,26].map(n=><IconButton key={n} label={'도구 크기 '+n} aria-pressed={brushSize===n} className={brushSize===n?'active':''} onClick={()=>setBrushSize(n)}><span style={{width:n,height:n}}/></IconButton>)}</div>
   </aside>
   <div className="rotate-notice"><RotateCw size={60}/><h2>태블릿을 가로로 돌려 주세요</h2><p>넓은 화면에서 색칠 놀이를 시작해요!</p></div>
   {toast&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}
   {modal&&<div className="modal-backdrop"><section className={'modal '+(modal==='drawings'?'art-gallery':modal==='clear'?'reset-choice-modal':'')} role="dialog" aria-modal="true" aria-label={modal==='drawings'?'도안 고르기':modal==='complete'?'작품 완성':modal==='saved'?'내 갤러리':'그림 변경 확인'} onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2>{modal==='drawings'?<span aria-hidden="true">🎨</span>:modal==='complete'?'멋진 작품이 완성됐어요!':modal==='saved'?'내 작은 갤러리':modal==='clear'?<span className="sr-only">정말 다시 칠할까요?</span>:'다른 그림으로 바꿀까?'}</h2><IconButton autoFocus label="닫기" onClick={()=>setModal(null)}><X/></IconButton></div>{modal==='drawings'?<DrawingGallery category={category} setCategory={setCategory} page={pickerPage} setPage={setPickerPage} items={visibleDrawings} selected={drawing} onSelect={select}/>:modal==='complete'?<div className="completion"><div className="confetti" aria-hidden="true">{Array.from({length:30},(_,i)=><i key={i} style={{'--x':`${(i*37)%100}%`,'--delay':`${(i%7)*.08}s`,'--color':colors[i%8],'--turn':`${i*47}deg`}}/>)}</div><Trophy className="trophy" size={45}/><p>너의 상상력이 담긴 하나뿐인 그림!</p><img className="finished-art" src={finished} alt={`완성한 ${labels[drawing]}`}/><div className="completion-actions"><button className="save-button" onClick={save}><Download size={18}/> 갤러리에 저장</button><button className="continue-button" onClick={()=>setModal(null)}>더 색칠하기</button><button className="download-link" onClick={()=>download(finished)}>PNG 내려받기</button></div></div>:modal==='clear'?<div className="reset-choices"><div className="reset-preview"><span aria-hidden="true">📸</span><img src={resetPreview} alt="방금 그린 그림"/></div><div className="reset-card-grid"><button className="reset-card keep-art" onClick={()=>{if(save()){setPickerPage(0);setModal('drawings');}}}><span className="choice-emoji" aria-hidden="true">🖼️</span><strong>앨범에 쏙!</strong><small>저장하기</small></button><button className="reset-card fresh-art" onClick={clear}><span className="choice-emoji" aria-hidden="true">📄<span className="paper-sparkle">✨</span></span><strong>새 도화지</strong><small>다시 그리기</small></button></div><button className="keep-drawing" onClick={()=>setModal(null)}><Paintbrush size={21}/>계속 그릴래요</button></div>:modal==='saved'?<><div className="saved-grid">{saved.length?saved.slice(galleryPage*8,galleryPage*8+8).map(item=><button key={item.id} onClick={()=>download(item.url)} title="PNG 내려받기"><img src={item.url} alt={`색칠한 ${labels[item.drawing]}`}/><Download size={17}/></button>):<div className="empty-gallery"><Images size={46}/><p>너의 첫 작품을 기다리고 있어!</p></div>}</div>{saved.length>8&&<div className="picker-pages"><button disabled={galleryPage===0} onClick={()=>setGalleryPage(galleryPage-1)} aria-label="이전 작품">←</button><span>{galleryPage+1} / {Math.ceil(saved.length/8)}</span><button disabled={(galleryPage+1)*8>=saved.length} onClick={()=>setGalleryPage(galleryPage+1)} aria-label="다음 작품">→</button></div>}<button className="save-button" onClick={()=>download()}><Download size={18}/> 지금 그림 내려받기</button></>:<><p>지금 색칠한 그림은 지워져요. 먼저 저장할 수 있어요.</p><div className="confirm-actions"><button onClick={()=>{save();setModal(null);}}><Download size={18}/> 저장하고 돌아가기</button><button className="save-button" onClick={()=>{if(modal==='clear')clear();else{setReady(false);setDrawing(modal.id);setModal(null);}}}>{modal==='clear'?<Trash2 size={18}/>:<ChevronRight size={18}/>} {modal==='clear'?'지우기':'바꾸기'}</button></div></>}</section></div>}
 </div>;
}
createRoot(document.getElementById('root')).render(<App/>);



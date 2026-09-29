// A complete neon stroke is rendered once per frame: halo first, white core last.
export function drawBrush(ctx,x1,y1,x2,y2,stroke){
 const {color,size,kind}=stroke;
 function path(points,width,ink){
  ctx.strokeStyle=ink;ctx.fillStyle=ink;ctx.lineWidth=width;ctx.beginPath();
  if(points.length===1){ctx.arc(points[0][0],points[0][1],width/2,0,Math.PI*2);ctx.fill();}
  else{ctx.moveTo(...points[0]);for(const point of points.slice(1))ctx.lineTo(...point);ctx.stroke();}
 }
 if(kind!=='neon'){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';path(x1===x2&&y1===y2?[[x1,y1]]:[[x1,y1],[x2,y2]],size,color);ctx.restore();return;
 }
 if(!stroke.points){stroke.points=[[x1,y1]];stroke.base=ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height);}
 if(x1!==x2||y1!==y2)stroke.points.push([x2,y2]);
 ctx.putImageData(stroke.base,0,0);
 // Keep the chosen hue, but give pastel palette colors a saturated neon emitter.
 const rgb=color.match(/\w\w/g).map(v=>parseInt(v,16)),low=Math.min(...rgb),high=Math.max(...rgb);
 const glow=high-low<20?color:`rgb(${rgb.map(v=>Math.round(24+(v-low)/(high-low)*231)).join(',')})`;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=glow;ctx.shadowBlur=20;ctx.globalAlpha=.7;
 path(stroke.points,size*1.5,glow);ctx.restore();
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=glow;ctx.shadowBlur=8;ctx.globalAlpha=1;
 path(stroke.points,size*.4,'#FFFFFF');ctx.restore();
 // Darken composites the original monochrome art above the light without
 // multiplying already antialiased edges darker on each successive stroke.
 if(stroke.outline){ctx.save();ctx.globalCompositeOperation='darken';ctx.drawImage(stroke.outline,0,0);ctx.restore();}
}

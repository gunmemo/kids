// Vector shapes stay crisp and use the selected palette color.
export function drawStamp(ctx, x, y, shape, size, color) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);
  ctx.fillStyle=color;ctx.beginPath();
  if(shape==='heart') {
    ctx.moveTo(0,40);ctx.bezierCurveTo(-75,-5,-40,-65,0,-25);
    ctx.bezierCurveTo(40,-65,75,-5,0,40);
  } else if(shape==='flower') {
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5-Math.PI/2;
      ctx.moveTo(Math.cos(a)*24+23,Math.sin(a)*24);
      ctx.arc(Math.cos(a)*24,Math.sin(a)*24,23,0,Math.PI*2);
    }
    ctx.moveTo(23,0);ctx.arc(0,0,23,0,Math.PI*2);
  } else {
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5-Math.PI/2,r=i%2?21:48;
      const px=Math.cos(a)*r,py=Math.sin(a)*r;
      if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
    }
    ctx.closePath();
  }
  ctx.fill();ctx.restore();
}

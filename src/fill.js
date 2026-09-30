// Regions are measured once from the unpainted art, never from the chosen color.
export function createFillMap(image, {closeGaps=false, protectBackground=false}={}) {
  const {width,height}=image, original=image.data.slice(), count=width*height;
  const regions=new Int32Array(count), queue=new Int32Array(count);
  const light=p=>Math.max(original[p*4],original[p*4+1],original[p*4+2]);
  let barrier=Uint8Array.from({length:count},(_,p)=>light(p)<=128?1:0);
  if(closeGaps){
    // Close narrow breaks in generated line art without changing the visible ink.
    function morph(input,dilate){
      const horizontal=new Uint8Array(count),out=new Uint8Array(count),radius=2;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        let value=dilate?0:1;
        for(let d=-radius;d<=radius;d++){
          const n=x+d,bit=n>=0&&n<width?input[y*width+n]:0;
          if(dilate?bit:!bit){value=dilate?1:0;break;}
        }
        horizontal[y*width+x]=value;
      }
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        let value=dilate?0:1;
        for(let d=-radius;d<=radius;d++){
          const n=y+d,bit=n>=0&&n<height?horizontal[n*width+x]:0;
          if(dilate?bit:!bit){value=dilate?1:0;break;}
        }
        out[y*width+x]=value;
      }
      return out;
    }
    const closed=morph(morph(barrier,true),false);
    // Repair only regions connected to the outside. Already enclosed tiny
    // details (such as crater centers) must never be swallowed by closing.
    const raw=createFillMap(image,{protectBackground:true});
    barrier=barrier.map((v,p)=>v||(closed[p]&&raw.background.has(raw.regions[p])));
  }
  function neighbors(p,visit) {
    if(p%width)visit(p-1);
    if(p%width<width-1)visit(p+1);
    if(p>=width)visit(p-width);
    if(p<count-width)visit(p+width);
  }
  let id=0;
  for(let p=0;p<count;p++) {
    if(regions[p]||barrier[p])continue;
    let head=0,tail=1;queue[0]=p;regions[p]=++id;
    while(head<tail)neighbors(queue[head++],n=>{
      if(!regions[n]&&!barrier[n]){regions[n]=id;queue[tail++]=n;}
    });
  }
  const background=new Set();
  if(protectBackground){
    for(let x=0;x<width;x++){background.add(regions[x]);background.add(regions[(height-1)*width+x]);}
    for(let y=0;y<height;y++){background.add(regions[y*width]);background.add(regions[y*width+width-1]);}
  }
  // Extend paint into the gray inner edge without crossing or replacing dark ink.
  // Each fringe pixel keeps one owner; expansion never merges adjacent regions.
  for(let pass=0;pass<2;pass++) {
    const previous=regions.slice();
    for(let p=0;p<count;p++) {
      if(previous[p]||light(p)<65)continue;
      neighbors(p,n=>{if(!regions[p]&&previous[n])regions[p]=previous[n];});
    }
  }
  return {width,height,regions,original,background};
}

export function floodFill(image,x,y,hex,map) {
  const {width,height,data}=image;
  x=Math.floor(x);y=Math.floor(y);
  if(x<0||y<0||x>=width||y>=height)return false;
  const region=map.regions[y*width+x];
  if(!region||map.background?.has(region))return false;
  const color=hex.match(/\w\w/g).map(v=>parseInt(v,16));
  let changed=false;
  for(let p=0;p<map.regions.length;p++) {
    if(map.regions[p]!==region)continue;
    const offset=p*4;
    for(let c=0;c<3;c++) {
      // Multiply the selected color under the original grayscale outline.
      const value=Math.round(map.original[offset+c]*color[c]/255);
      if(data[offset+c]!==value)changed=true;
      data[offset+c]=value;
    }
    data[offset+3]=255;
  }
  return changed;
}

// Regions are measured once from the unpainted art, never from the chosen color.
export function createFillMap(image) {
  const {width,height}=image, original=image.data.slice(), count=width*height;
  const regions=new Int32Array(count), queue=new Int32Array(count);
  const light=p=>Math.max(original[p*4],original[p*4+1],original[p*4+2]);
  function neighbors(p,visit) {
    if(p%width)visit(p-1);
    if(p%width<width-1)visit(p+1);
    if(p>=width)visit(p-width);
    if(p<count-width)visit(p+width);
  }
  let id=0;
  for(let p=0;p<count;p++) {
    if(regions[p]||light(p)<=128)continue;
    let head=0,tail=1;queue[0]=p;regions[p]=++id;
    while(head<tail)neighbors(queue[head++],n=>{
      if(!regions[n]&&light(n)>128){regions[n]=id;queue[tail++]=n;}
    });
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
  return {width,height,regions,original};
}

export function floodFill(image,x,y,hex,map) {
  const {width,height,data}=image;
  x=Math.floor(x);y=Math.floor(y);
  if(x<0||y<0||x>=width||y>=height)return false;
  const region=map.regions[y*width+x];
  if(!region)return false;
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

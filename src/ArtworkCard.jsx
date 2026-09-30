import React from 'react';
import {Download} from 'lucide-react';
export function ArtworkCard({image,title,onClick}){
 return <button className="artwork-card" onClick={onClick} aria-label={title+' 그림 내려받기'}><span className="artwork-frame"><img src={image} alt={title}/></span><span className="artwork-title">{title}</span><span className="artwork-action"><Download size={18} aria-hidden="true"/>내려받기</span></button>;
}


const data=window.PORTFOLIO;const root=document.getElementById('works');const dialog=document.querySelector('dialog');let currentWork,currentImage=0,opener;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}function safeImage(src){return typeof src==='string'&&(/^(data:image\/(jpeg|png|webp|gif);base64,)/i.test(src)||/^images\/[a-z0-9_-]+\.(webp|png|jpe?g|gif)$/i.test(src)||/^https:\/\//i.test(src))?src:''}

const displaySrc=p=>safeImage(p.preview||p.src);
const fullSrc=p=>safeImage(p.full||p.src);
const decodedImages=new Map();
function prepareImage(src,priority='low'){
 src=safeImage(src);if(!src)return Promise.resolve(false);
 const existing=decodedImages.get(src);
 if(existing){if(priority==='high'&&existing.image)existing.image.fetchPriority='high';return existing.ready;}
 const image=new Image();image.decoding='async';image.fetchPriority=priority;
 const entry={image,ready:null};
 image.src=src;
 entry.ready=image.decode().then(()=>true).catch(()=>{decodedImages.delete(src);return false;}).finally(()=>{entry.image=null;});
 decodedImages.set(src,entry);return entry.ready;
}
// Start immediately after the lightweight page loads, with two low-priority workers.
// Load each work's first photo first, then its additional angles. Clicks take priority.
async function preloadFullImages(){
 const photos=data.works.flatMap(w=>w.images||[]);
 const queue=[...new Set([...data.works.map(w=>w.images?.[0]).filter(Boolean),...photos].map(fullSrc))];
 let next=0;
 async function worker(){while(next<queue.length){const src=queue[next++];await prepareImage(src);}}
 await Promise.all([worker(),worker()]);
}
if(document.readyState==='complete')void preloadFullImages();
else window.addEventListener('load',()=>void preloadFullImages(),{once:true});
data.works.forEach((w,i)=>{const id='work-'+(i+1),num=String(i+1).padStart(2,'0');const article=el('article','work');article.id=id;const visual=el('div','visual');const text=el('div','text');const images=w.images||[];let selected=0;const photo=el('button','photo');photo.type='button';photo.setAttribute('aria-label','放大查看'+w.title);const img=el('img');img.alt=w.title;img.loading=i===0?'eager':'lazy';img.decoding='async';if(images.length)img.src=displaySrc(images[0]);else photo.append(el('p','empty','尚未加入作品圖片'));photo.append(img);if(!images.length){photo.disabled=true;img.hidden=true}photo.onclick=()=>show(w,selected,photo);const stage=el('div','photo-stage');stage.append(photo);visual.append(stage);const line=el('div','photoline');const cap=el('span','',images[0]?.caption||'');const total=el('span','mono',images.length?'01 / '+String(images.length).padStart(2,'0'):'');line.append(cap,total);visual.append(line);if(images.length>1){
function selectImage(index){selected=(index+images.length)%images.length;const p=images[selected];img.src=displaySrc(p);img.alt=p.caption||w.title;cap.textContent=p.caption||'';total.textContent=String(selected+1).padStart(2,'0')+' / '+String(images.length).padStart(2,'0')}
total.setAttribute('aria-live','polite');
for(const [cls,label,symbol,delta] of [['gallery-back','上一張圖片','←',-1],['gallery-forward','下一張圖片','→',1]]){const arrow=el('button','gallery-arrow '+cls,symbol);arrow.type='button';arrow.setAttribute('aria-label',label);arrow.onclick=()=>selectImage(selected+delta);stage.append(arrow)}
stage.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();selectImage(selected+(event.key==='ArrowLeft'?-1:1))}});
}text.append(el('span','number','WORK '+num+' / LEATHER CRAFT'),el('span','tag',w.technique||'皮革工藝'),el('h2','',w.shortTitle||w.title),el('div','rule'));text.append(el('p','desc'+(!w.description?' placeholder':''),w.description||'作品介紹待補。\n可在此寫下創作概念、造形發展，以及希望觀者留意的細節。'));const dl=el('dl','details');[['技法 / TECHNIQUE',w.technique],['材質 / MATERIAL',w.material],['年份 / YEAR',w.year],['尺寸 / DIMENSIONS',w.dimensions]].forEach(([k,v])=>{if(v){const item=el('div');item.append(el('dt','',k),el('dd','',v));dl.append(item)}});text.append(dl);article.append(visual,text);root.append(article)});if(!data.works.length)root.append(el('p','empty','作品整理中，敬請期待。'));
let lightRequest=0;
function updateLight(){resetView();const p=currentWork.images[currentImage];const request=++lightRequest;const target=document.querySelector('.lightimage');target.src=displaySrc(p);void prepareImage(fullSrc(p),'high').then(ready=>{if(ready&&request===lightRequest&&dialog.open)target.src=fullSrc(p);});document.querySelector('.lightimage').alt=p.caption||currentWork.title;document.getElementById('lighttitle').textContent=currentWork.shortTitle||currentWork.title;document.querySelector('.lightcaption').textContent=(currentImage+1)+' / '+currentWork.images.length+'　'+(p.caption||'作品圖片');document.querySelector('.prev').disabled=currentWork.images.length<2;document.querySelector('.next').disabled=currentWork.images.length<2}
function show(w,i,button){currentWork=w;currentImage=i;opener=button;updateLight();dialog.showModal();document.body.style.overflow='hidden';document.querySelector('.close').focus()}
document.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{document.body.style.overflow='';opener?.focus({preventScroll:true})});document.querySelector('.prev').onclick=()=>{currentImage=(currentImage-1+currentWork.images.length)%currentWork.images.length;updateLight()};document.querySelector('.next').onclick=()=>{currentImage=(currentImage+1)%currentWork.images.length;updateLight()};dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();document.querySelector('.prev').click()}if(e.key==='ArrowRight'){e.preventDefault();document.querySelector('.next').click()}});


const viewport=document.querySelector('.lightviewport'),lightImage=document.querySelector('.lightimage');
let zoom=1,panX=0,panY=0,drag=null;
function paintView(){
 const width=viewport.clientWidth,height=viewport.clientHeight;
 const ratio=Math.min(width/(lightImage.naturalWidth||width),height/(lightImage.naturalHeight||height));
 const limitX=Math.max(0,((lightImage.naturalWidth||width)*ratio*zoom-width)/2);
 const limitY=Math.max(0,((lightImage.naturalHeight||height)*ratio*zoom-height)/2);
 panX=Math.max(-limitX,Math.min(limitX,panX));panY=Math.max(-limitY,Math.min(limitY,panY));
 lightImage.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
}
function resetView(){zoom=1;panX=0;panY=0;drag=null;if(typeof viewport!=='undefined'){viewport.classList.remove('dragging');paintView()}}
function zoomAt(value,x=0,y=0){const next=Math.max(1,Math.min(5,value)),ratio=next/zoom;panX=x-(x-panX)*ratio;panY=y-(y-panY)*ratio;zoom=next;paintView()}
viewport.addEventListener('wheel',event=>{event.preventDefault();const rect=viewport.getBoundingClientRect();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);zoomAt(zoom*Math.exp(-Math.max(-120,Math.min(120,delta))*.002),event.clientX-rect.left-rect.width/2,event.clientY-rect.top-rect.height/2)},{passive:false});
viewport.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();viewport.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,y:event.clientY};viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging')});
viewport.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;panX+=event.clientX-drag.x;panY+=event.clientY-drag.y;drag.x=event.clientX;drag.y=event.clientY;paintView()});
function endDrag(){drag=null;viewport.classList.remove('dragging')}
for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,endDrag);
viewport.addEventListener('dblclick',resetView);
viewport.addEventListener('keydown',event=>{if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')resetView();else zoomAt(zoom*(event.key==='-'?1/1.2:1.2))}});
lightImage.addEventListener('load',paintView);addEventListener('resize',()=>{if(dialog.open)paintView()});dialog.addEventListener('close',()=>{lightRequest++;resetView()});

const firstPicture=(data.cover ? {src:data.cover,preview:data.coverPreview} : data.works.find(w=>w.images?.length)?.images[0]);const drawing=document.querySelector('.drawing-hero');
if(firstPicture){for(const cls of ['hero-object']){const image=el('img',cls);image.fetchPriority='high';image.src=displaySrc(firstPicture);image.alt=cls==='hero-cut'?'同一作品照片的局部取景':'皮革作品形體觀察';drawing.append(image)}drawing.append(el('span','drawing-label a','LEATHER / HAND-FORMED'))}else drawing.hidden=true;
document.querySelectorAll('.work').forEach((article,i)=>{const w=data.works[i],tech=w.technique||'',kind=tech.includes('編織')?'weave':tech.includes('鑲嵌')||tech.includes('焊接')?'join':tech.includes('腐蝕')?'etch':'hammer';article.classList.add(kind);if(w.images?.length){const background=el('img','work-background');background.src=displaySrc(w.images[0]);background.alt='';background.setAttribute('aria-hidden','true');background.loading='lazy';background.decoding='async';article.prepend(background)}article.querySelector('.number').dataset.number=String(i+1).padStart(2,'0');});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');observer.unobserve(e.target)}})},{threshold:.12});document.querySelectorAll('.work').forEach(w=>observer.observe(w))}else document.querySelectorAll('.work').forEach(w=>w.classList.add('seen'));

const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let lightingFrame=0;
document.addEventListener('pointermove',event=>{if(motionPreference.matches||event.pointerType==='touch'||lightingFrame)return;const position=Math.max(25,Math.min(70,25+event.clientX/innerWidth*45));lightingFrame=requestAnimationFrame(()=>{document.documentElement.style.setProperty('--surface-light',position+'%');lightingFrame=0})},{passive:true});

let scrollFrame=0;const surfaces=[...document.querySelectorAll('.work')];
function updateSurfaces(){scrollFrame=0;if(motionPreference.matches)return;const height=innerHeight;for(const panel of surfaces){const bounds=panel.getBoundingClientRect();if(bounds.bottom>0&&bounds.top<height){const progress=Math.max(0,Math.min(1,(height-bounds.top)/(height+bounds.height)));panel.style.setProperty('--reveal',progress.toFixed(4))}}const hero=document.querySelector('.hero');const bounds=hero.getBoundingClientRect();hero.style.setProperty('--hero-progress',Math.max(0,Math.min(1,-bounds.top/bounds.height)).toFixed(4))}
function queueSurfaces(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateSurfaces)}addEventListener('scroll',queueSurfaces,{passive:true});addEventListener('resize',queueSurfaces);updateSurfaces();

// Keep both portions of the cover photo at the same scale and crop.
const firstWork=document.getElementById('work-1');
if(firstWork&&firstPicture){const hero=document.querySelector('.hero');const bridge=el('div','hero-transition');bridge.setAttribute('aria-hidden','true');const photo=el('img');photo.alt='';photo.src=displaySrc(firstPicture);bridge.append(photo);hero.append(bridge);const veil=el('div','work-transition');veil.setAttribute('aria-hidden','true');firstWork.append(veil);const syncCrop=()=>hero.style.setProperty('--first-photo-height',(firstWork.offsetHeight+140)+'px');syncCrop();if('ResizeObserver' in window)new ResizeObserver(syncCrop).observe(firstWork);else addEventListener('resize',syncCrop)}

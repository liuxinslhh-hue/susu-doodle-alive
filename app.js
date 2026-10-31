(() => {
  'use strict';
  const $=id=>document.getElementById(id), canvas=$('stage'), ctx=canvas.getContext('2d');
  const W=720,H=440, floor=365, N=10, TAU=Math.PI*2;
  const ink='#293d38', texture=document.createElement('canvas'), tx=texture.getContext('2d',{willReadFrequently:true});
  const feeding=window.DoodleFeeding.create(), foods=window.DoodleFeeding.foods;
  const foodCanvas=$('foodCanvas'), fx=foodCanvas.getContext('2d');
  let foodKind='rice',foodStrokes=[],foodActive=null,foodImage=null,storyKey='',exporting=false;
  texture.width=W;texture.height=H;
  let strokes=[],color=ink,brush=8,erasing=false,mode='draw',active=null,hasTouched=false,autoTimer;
  let sprite=null,body=null,lastTime=0,time=0,sayUntil=0,poke={x:0,y:0,power:0},wakeTime=0,lastIdle=0;
  let currentPreset='blob',particles=[],history=[],drawDirty=true,aliveEyes=true,dragging=false,reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function say(text,seconds=2.2){$('speech').textContent=text;$('speech').classList.add('show');sayUntil=time+seconds;}
  function status(text){$('status').textContent=text;}
  function stopDemo(){hasTouched=true;clearTimeout(autoTimer);}
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);}
  new ResizeObserver(resize).observe(canvas);
  function aspect(){return canvas.height*W/(canvas.width*H)||1;}
  function point(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;return{x:mode==='draw'&&currentPreset?W/2+(x-W/2)/aspect():x,y:(e.clientY-r.top)/r.height*H};}
  function drawStroke(c,s){if(!s.points.length)return;c.save();c.globalCompositeOperation=s.erase?'destination-out':'source-over';c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=s.width;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(s.points[0].x,s.points[0].y);for(let i=1;i<s.points.length;i++)c.lineTo(s.points[i].x,s.points[i].y);if(s.points.length===1){c.arc(s.points[0].x,s.points[0].y,s.width/2,0,TAU);c.fill();}else c.stroke();c.restore();}
  function updateTexture(){if(!drawDirty)return;tx.clearRect(0,0,W,H);strokes.forEach(s=>drawStroke(tx,s));drawDirty=false;}
  function save(){try{if(JSON.stringify(strokes).length<500000)localStorage.setItem('susu-doodle-v1',JSON.stringify({strokes,name:$('petName').value,eyes:$('eyes').checked,preset:currentPreset}));}catch(e){/* Local storage is optional. */}}
  function readSaved(){try{const data=JSON.parse(localStorage.getItem('susu-doodle-v1'));if(!data||!Array.isArray(data.strokes)||data.strokes.length>500)return false;const valid=data.strokes.every(s=>s&&/^#[0-9a-f]{6}$/i.test(s.color)&&Number.isFinite(s.width)&&s.width>=1&&s.width<=44&&Array.isArray(s.points)&&s.points.length<=15000&&s.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=W&&p.y>=0&&p.y<=H));if(!valid)return false;strokes=data.strokes;currentPreset=['blob','bunny','star'].includes(data.preset)?data.preset:null;$('petName').value=String(data.name||'小家伙').slice(0,10);$('eyes').checked=data.eyes!==false;drawDirty=true;return true;}catch(e){return false;}}
  function path(points,col=ink,width=7){return{points:points.map(p=>({x:p[0],y:p[1]})),color:col,width,erase:false};}
  function renderFoodPad(){fx.clearRect(0,0,320,160);foodStrokes.forEach(s=>drawStroke(fx,s));$('foodGuide').hidden=foodStrokes.length>0;updateKitchen();}
  function foodPoint(e){const r=foodCanvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width*320,0,320),y:clamp((e.clientY-r.top)/r.height*160,0,160)};}
  foodCanvas.addEventListener('pointerdown',e=>{if(foodActive||exporting)return;stopDemo();foodCanvas.setPointerCapture(e.pointerId);const s={color:foods[foodKind].color,width:7,erase:false,points:[foodPoint(e)]};foodStrokes.push(s);foodActive={id:e.pointerId,stroke:s};renderFoodPad();});
  foodCanvas.addEventListener('pointermove',e=>{if(!foodActive||foodActive.id!==e.pointerId)return;const p=foodPoint(e),a=foodActive.stroke.points.at(-1);if(Math.hypot(p.x-a.x,p.y-a.y)>1){foodActive.stroke.points.push(p);renderFoodPad();}});
  const endFood=e=>{if(foodActive&&foodActive.id===e.pointerId){foodActive=null;updateKitchen();}};
  foodCanvas.addEventListener('pointerup',endFood);foodCanvas.addEventListener('pointercancel',endFood);foodCanvas.addEventListener('lostpointercapture',endFood);
  function chooseFood(kind){if(!foods[kind]||exporting)return;foodKind=kind;foodStrokes=[];foodActive=null;document.querySelectorAll('[data-food]').forEach(b=>{const chosen=b.dataset.food===kind;b.classList.toggle('chosen',chosen);b.setAttribute('aria-pressed',String(chosen));});$('foodInstruction').textContent='画一个'+foods[kind].name+'。歪歪扭扭也能吃。';renderFoodPad();}
  function exampleFood(){foodStrokes=[];const c=foods[foodKind].color;
    if(foodKind==='rice'){
      foodStrokes.push(path([[160,31],[219,117],[215,129],[107,129],[100,119],[152,36],[160,31]],c,7));
      foodStrokes.push(path([[140,106],[140,129],[177,129],[177,106],[140,106]],c,9));
      foodStrokes.push(path([[139,69],[142,72]],c,3),path([[170,80],[173,83]],c,3));
    }else if(foodKind==='chili'){
      const p=[];for(let i=0;i<=30;i++){const a=i/30;p.push([110+99*a,83-36*Math.sin(a*Math.PI)]);}for(let i=30;i>=0;i--){const a=i/30;p.push([110+99*a,83+20*Math.sin(a*Math.PI)]);}foodStrokes.push(path(p,c,8),path([[111,80],[100,60],[112,49]],'#6d9180',7));
    }else{
      const p=[];for(let i=0;i<=45;i++){const a=i/45*TAU;p.push([160+Math.cos(a)*58,82+Math.sin(a)*43]);}foodStrokes.push(path(p,c,8),path([[178,38],[184,22],[203,23]],'#6d9180',6));
      for(let i=0;i<4;i++){const a=i*Math.PI/2+.3;foodStrokes.push(path([[160,82],[160+Math.cos(a)*35,82+Math.sin(a)*25]],c,3));}
    }renderFoodPad();
  }
  function cropFood(){const data=fx.getImageData(0,0,320,160).data;let l=320,r=0,t=160,b=0,n=0;for(let y=0;y<160;y++)for(let x=0;x<320;x++)if(data[(y*320+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;}if(n<30)return null;
    const img=document.createElement('canvas');img.width=r-l+9;img.height=b-t+9;img.getContext('2d').drawImage(foodCanvas,l,t,r-l+1,b-t+1,4,4,r-l+1,b-t+1);return img;
  }
  function updateKitchen(){const meal=feeding.sample(time),busy=exporting||['flying','reacting'].includes(meal.phase);$('feed').disabled=busy||!foodStrokes.length||!!foodActive;$('feedExample').disabled=busy;
    $('feed').innerHTML=busy&&!exporting?'正在尝味道… <span>·</span>':'喂给它 <span>↗</span>';$('tasteCount').textContent='口味 '+meal.discovered+' / 3';$('mealCount').textContent=meal.count?'已经喂了 '+meal.count+' 口':'还没开饭';
    const collection=feeding.collection();document.querySelectorAll('[data-taste]').forEach(el=>{const found=collection.includes(el.dataset.taste);el.classList.toggle('found',found);el.textContent=found?foods[el.dataset.taste].title:'？';});
  }
  function feedPet(useExample=false){if(mode!=='play'||exporting||dragging||foodActive)return;if(['flying','reacting'].includes(feeding.sample(time).phase))return;if(useExample)exampleFood();const image=cropFood();if(!image){say('先画点吃的，或试试示例食物。');return;}const meal=feeding.feed(foodKind,time);if(!meal)return;foodImage=image;body.vx=0;body.vy=0;resetBody();status('它盯住了你画的'+foods[foodKind].name);say('这个……真的给我吃？',.85);$('mealStory').textContent='你递来一个'+foods[foodKind].name+'，它凑过去闻了闻。';updateKitchen();
    if(matchMedia('(max-width: 800px)').matches)document.querySelector('.paper').scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});
  }
  function storyTick(){if(mode!=='play')return;const meal=feeding.sample(time),key=meal.phase+':'+meal.at;if(key===storyKey)return;storyKey=key;updateKitchen();if(meal.phase==='reacting'){
      say(meal.line,4);$('mealStory').textContent=meal.line;status(foods[meal.kind].title+' · 新表情记进手账了');burst(body.x,body.y,10);
    }else if(meal.phase==='settled'){
      const text=meal.all?'三种都尝过啦。从今天起，你就是我的饭搭子！':meal.kind==='rice'?'吃饱了。要不要再试试别的味道？':'缓过来了……换个味道再尝一口？';say(text,3.5);$('mealStory').textContent=meal.all?'饭搭子达成！三种表情已收集，也可以重喂看看它怎么吐槽。':text;status(meal.all?'饭搭子达成 · 可以带走它的小表情':'还差 '+(3-meal.discovered)+' 种口味，去厨房看看');
    }
  }
  function makePreset(kind){
    currentPreset=kind;strokes=[];history=[];
    const points=[];
    if(kind==='blob'){
      for(let i=0;i<=100;i++){const a=i/100*TAU,r=1+.06*Math.sin(a*5)+.035*Math.cos(a*3);points.push([360+Math.cos(a)*98*r,215+Math.sin(a)*92*r]);}
      strokes.push(path(points,'#e67559',9));strokes.push(path([[291,280],[285,304],[310,304]],'#e67559',8));strokes.push(path([[413,280],[429,302],[407,305]],'#e67559',8));
      $('petName').value='软趴趴';
    } else if(kind==='bunny'){
      const raw=[[293,252],[290,221],[302,194],[312,182],[308,144],[305,102],[310,84],[320,81],[331,101],[343,170],[365,170],[380,107],[390,84],[401,83],[408,95],[407,121],[399,181],[418,197],[429,223],[426,251],[409,275],[378,283],[342,284],[311,273],[293,252]];
      strokes.push(path(raw,'#a084b0',8));strokes.push(path([[309,279],[305,296],[326,297]],'#a084b0',7));strokes.push(path([[397,280],[411,293],[393,297]],'#a084b0',7));$('petName').value='长耳朵';
    } else {
      for(let i=0;i<=10;i++){const a=-Math.PI/2+i/10*TAU,r=i%2?52:112;points.push([360+Math.cos(a)*r,218+Math.sin(a)*r*(i===2?1.15:1)]);}
      strokes.push(path(points,'#6d9180',8));$('petName').value='歪星星';
    }
    drawDirty=true;status('小家伙还在装睡');$('cornerNote').textContent='↓ 这是示例，你也可以自己画';
  }
  function makeSprite(){updateTexture();const data=tx.getImageData(0,0,W,H).data;let l=W,r=0,t=H,b=0,n=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);n++;}
    if(n<40||r-l<8||b-t<8){say('先给小家伙画一点模样吧');return false;}
    l=Math.max(0,l-8);t=Math.max(0,t-8);r=Math.min(W,r+9);b=Math.min(H,b+9);
    const img=document.createElement('canvas');img.width=Math.max(1,Math.round((r-l)/(currentPreset?1:aspect())));img.height=b-t;img.getContext('2d').drawImage(texture,l,t,r-l,b-t,0,0,img.width,img.height);
    const scale=Math.min(245/img.width,245/img.height,1.45);
    sprite={img,w:img.width*scale,h:img.height*scale,faceY:currentPreset==='bunny'?.68:.48};return true;
  }
  function wake(){if(mode==='play')return;if(!makeSprite())return;mode='play';aliveEyes=$('eyes').checked;wakeTime=time;lastIdle=time;
    feeding.reset();foodImage=null;storyKey='';$('mealStory').textContent='第一次见面，它正饿着肚子看你。';updateKitchen();
    body={x:W/2,y:floor-sprite.h/2-35,vx:0,vy:-85,angle:0,av:.9,sx:1,sy:1,svx:0,svy:0,shear:0};
    document.body.classList.add('playing');$('drawControls').hidden=true;$('playControls').hidden=false;$('wake').hidden=true;$('exportControls').hidden=false;$('quickWake').textContent='↶ 再画两笔';$('panelTitle').textContent='它有点自己的想法';$('panelSub').textContent='轻轻戳，拎起来，再松手。';$('modeLabel').textContent='02 / 它醒啦';$('paperHint').textContent='按住拎起来 · 松手弹回去';$('cornerNote').textContent='你画的线条，一笔都还在';status('醒了！试着戳它一下');say('嗯？到我出场了？');
    $('quickWake').textContent='喂它吃饭 ↗';$('panelTitle').textContent='它好像有点饿了';$('panelSub').textContent='画点吃的，解锁它的小表情。';$('paperHint').textContent='先选食物，再画给它吃';$('cornerNote').textContent='它在等你开饭';status('给它画点吃的，看看会发生什么');say('咕噜……有我的饭吗？',3.5);burst(body.x,body.y,18);save();
  }
  function redraw(){mode='draw';dragging=false;active=null;body=null;document.body.classList.remove('playing','grabbing');$('drawControls').hidden=false;$('playControls').hidden=true;$('wake').hidden=false;$('exportControls').hidden=true;$('quickWake').textContent='✦ 叫醒它';$('panelTitle').textContent='再给它一点模样';$('panelSub').textContent='加一笔，它还是你的小家伙。';$('modeLabel').textContent='01 / 随便画画';$('paperHint').textContent='不用画得好，歪一点也很可爱';$('speech').classList.remove('show');$('cornerNote').textContent='画完，再叫醒它';status('准备好就叫醒它');}
  function burst(x,y,n){for(let i=0;i<n;i++){const a=Math.random()*TAU;particles.push({x,y,vx:Math.cos(a)*(35+Math.random()*90),vy:Math.sin(a)*(35+Math.random()*90)-30,life:.5+Math.random()*.5,size:2+Math.random()*3});}}
  function resetBody(){if(!body)return;body.x=W/2;body.y=floor-sprite.h/2-45;body.vx=0;body.vy=0;body.angle=0;body.av=0;body.sx=body.sy=1;body.svx=body.svy=0;}
  function hit(p){return body&&Math.abs(p.x-body.x)<sprite.w*aspect()*.65+16&&Math.abs(p.y-body.y)<sprite.h*.65+16;}
  function pointerDown(e){if(active)return;stopDemo();const p=point(e);canvas.setPointerCapture(e.pointerId);active={id:e.pointerId,start:p,last:p,lastAt:performance.now(),moved:false,dx:0,dy:0};
    if(mode==='draw'){history=[];const s={color,width:erasing?brush*2:brush,erase:erasing,points:[p]};strokes.push(s);active.stroke=s;drawDirty=true;$('cornerNote').textContent='画完，点一下「叫醒」';status('正在画你的独一无二');}
    else if(hit(p)){active.pet=true;active.dx=body.x-p.x;active.dy=body.y-p.y;poke={x:(p.x-body.x)/sprite.w,y:(p.y-body.y)/sprite.h,power:1};body.svx+=2;body.svy-=3;body.vx+=(body.x-p.x)*1.4;burst(p.x,p.y,6);say(['哎呀，软的！','谁戳我！','我醒着呢。','再戳就变扁了。'][Math.floor(Math.random()*4)]);status('戳到了！按住还可以把它拎起来');}
  }
  function pointerMove(e){if(!active||active.id!==e.pointerId)return;const p=point(e),now=performance.now(),elapsed=Math.max(.008,(now-active.lastAt)/1000);
    if(Math.hypot(p.x-active.start.x,p.y-active.start.y)>6)active.moved=true;
    if(mode==='draw'){if(Math.hypot(p.x-active.last.x,p.y-active.last.y)>1){active.stroke.points.push({x:clamp(p.x,0,W),y:clamp(p.y,0,H)});drawDirty=true;}}
    else if(active.pet&&active.moved){if(!dragging)say('欸——脚离地了！');dragging=true;document.body.classList.add('grabbing');body.vx=clamp((p.x-active.last.x)/elapsed,-1200,1200)*.6+body.vx*.4;body.vy=clamp((p.y-active.last.y)/elapsed,-1200,1200)*.6+body.vy*.4;body.x=clamp(p.x+active.dx,40,W-40);body.y=clamp(p.y+active.dy,35,floor-20);body.shear=clamp(body.vx/1800,-.3,.3);body.svy+=.08;status('松开手，让它弹回去');}
    active.last=p;active.lastAt=now;
  }
  function pointerUp(e){if(!active||active.id!==e.pointerId)return;if(mode==='draw')save();else if(dragging){if(performance.now()-active.lastAt>100){body.vx=0;body.vy=0;}body.svx-=1.5;body.svy+=2;body.av=clamp(body.vx/500,-2,2);say('落地！我刚才很优雅。');status('还可以拎起来再玩一次');}dragging=false;document.body.classList.remove('grabbing');active=null;}
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',e=>{pointerUp(e);if(body){body.vx=0;body.vy=0;}});canvas.addEventListener('lostpointercapture',e=>{if(active&&active.id===e.pointerId)pointerUp(e);});
  function physics(dt){if(!body)return;
    if(!dragging){body.vy+=900*dt;body.x+=body.vx*dt;body.y+=body.vy*dt;body.vx*=Math.exp(-1.2*dt);
      const bottom=floor-sprite.h*.5;
      if(body.y>bottom){body.y=bottom;if(body.vy>65){body.svx+=Math.min(6,body.vy/160);body.svy-=Math.min(7,body.vy/140);body.vy=-body.vy*.48;}else body.vy=0;body.vx*=.93;}
      const edge=Math.max(20,sprite.w*aspect()*.55);if(body.x<edge||body.x>W-edge){body.x=clamp(body.x,edge,W-edge);body.vx=-body.vx*.65;body.svx-=2;body.svy+=1.5;}
      if(body.y<sprite.h*.4){body.y=sprite.h*.4;body.vy=Math.max(40,body.vy);}
      if(!reduceMotion&&time-lastIdle>7&&Math.abs(body.vy)<1){body.vy=-170;body.av=(Math.random()-.5)*1.2;lastIdle=time;}
    }
    body.svx+=((1-body.sx)*110-body.svx*11)*dt;body.svy+=((1-body.sy)*110-body.svy*11)*dt;body.sx=clamp(body.sx+body.svx*dt,.65,1.4);body.sy=clamp(body.sy+body.svy*dt,.6,1.4);
    body.av+=(-body.angle*30-body.av*6)*dt;body.angle+=body.av*dt;body.shear*=Math.exp(-6*dt);poke.power*=Math.exp(-6*dt);
  }
  function deformed(u,v,b,t,extra=0){const {w,h}=sprite;let x=(u-.5)*w,y=(v-.5)*h;
    const breathing=reduceMotion?0:Math.sin(t*2.3)*.012;
    x*=b.sx+breathing;y*=b.sy-breathing;
    const d=Math.hypot((u-.5)-poke.x,(v-.5)-poke.y),pressure=poke.power*Math.exp(-d*d*18);
    x+=pressure*((u-.5)-poke.x)*30;y+=pressure*((v-.5)-poke.y)*30;
    x+=Math.sin(v*7+t*8)*extra+y*b.shear;
    const a=b.angle,c=Math.cos(a),s=Math.sin(a);return{x:b.x+x*c-y*s,y:b.y+x*s+y*c};
  }
  function triangle(c,img,s0,s1,s2,p0,p1,p2){
    const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);if(!den)return;
    const a=(p0.x*(s1.y-s2.y)+p1.x*(s2.y-s0.y)+p2.x*(s0.y-s1.y))/den,b=(p0.y*(s1.y-s2.y)+p1.y*(s2.y-s0.y)+p2.y*(s0.y-s1.y))/den;
    const cc=(p0.x*(s2.x-s1.x)+p1.x*(s0.x-s2.x)+p2.x*(s1.x-s0.x))/den,d=(p0.y*(s2.x-s1.x)+p1.y*(s0.x-s2.x)+p2.y*(s1.x-s0.x))/den;
    const e=p0.x-a*s0.x-cc*s0.y,f=p0.y-b*s0.x-d*s0.y;
    c.save();c.beginPath();c.moveTo(p0.x,p0.y);c.lineTo(p1.x,p1.y);c.lineTo(p2.x,p2.y);c.closePath();c.clip();c.transform(a,b,cc,d,e,f);c.drawImage(img,0,0);c.restore();
  }
  function renderPet(c,b,t,compensation=1,mealOverride=null){
    const meal=mealOverride||feeding.sample(time),power=meal.strength||0,kind=meal.kind;
    b={...b};if(kind==='rice'){b.sx+=power*.27;b.sy+=power*.10;}else if(kind==='lemon'){b.sx*=1-power*.25;b.sy*=1+power*.08;b.angle+=Math.sin(t*24)*.045*power;}else if(kind==='chili'){b.angle+=Math.sin(t*33)*.035*power;}
    c.save();c.translate(b.x,b.y);c.scale(compensation,1);c.translate(-b.x,-b.y);c.fillStyle='#33433812';c.beginPath();const elevation=clamp((floor-b.y-sprite.h/2)/250,0,.8);c.ellipse(b.x,floor+7,sprite.w*.36*(1-elevation*.5),7*(1-elevation*.5),0,0,TAU);c.fill();
    const mesh=[];for(let y=0;y<=N;y++){mesh[y]=[];for(let x=0;x<=N;x++)mesh[y][x]=deformed(x/N,y/N,b,t);}
    const sw=sprite.img.width/N,sh=sprite.img.height/N;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const a={x:x*sw,y:y*sh},bb={x:(x+1)*sw,y:y*sh},cc={x:x*sw,y:(y+1)*sh},d={x:(x+1)*sw,y:(y+1)*sh};triangle(c,sprite.img,a,bb,cc,mesh[y][x],mesh[y][x+1],mesh[y+1][x]);triangle(c,sprite.img,bb,d,cc,mesh[y][x+1],mesh[y+1][x+1],mesh[y+1][x]);}
    if(aliveEyes){
      const blink=(t%4.7>4.51),eyeY=sprite.faceY,eyeSize=clamp(Math.min(sprite.w,sprite.h)*.028,3.5,6);
      for(const u of [.4,.6]){const p=deformed(u,eyeY,b,t);c.fillStyle=ink;c.strokeStyle=ink;c.lineWidth=3;c.lineCap='round';if(power>.1&&kind==='lemon'){const dir=u<.5?1:-1;c.beginPath();c.moveTo(p.x-dir*6,p.y-5);c.lineTo(p.x+dir*4,p.y);c.lineTo(p.x-dir*6,p.y+5);c.stroke();}else if(blink||(power>.1&&kind==='rice')){c.beginPath();c.moveTo(p.x-eyeSize,p.y);c.quadraticCurveTo(p.x,p.y-5,p.x+eyeSize,p.y);c.stroke();}else{c.beginPath();c.ellipse(p.x,p.y,eyeSize,eyeSize*1.35,b.angle,0,TAU);c.fill();c.fillStyle='#fffef9';c.beginPath();c.arc(p.x+1,p.y-2,1.4,0,TAU);c.fill();}}
      const m=deformed(.5,eyeY+.13,b,t);c.strokeStyle=ink;c.lineWidth=2.5;c.beginPath();if(meal.phase==='flying'||(power>.1&&kind==='chili')){c.ellipse(m.x,m.y,8,10,0,0,TAU);c.fillStyle=ink;c.fill();}else if(power>.1&&kind==='lemon'){c.moveTo(m.x-8,m.y);for(let i=0;i<5;i++)c.lineTo(m.x-8+i*4,m.y+(i%2?3:-3));}else c.arc(m.x,m.y-4,6,.15,Math.PI-.15);c.stroke();
      for(const u of [.31,.69]){const p=deformed(u,eyeY+.08,b,t);c.fillStyle='#e9897045';c.beginPath();c.ellipse(p.x,p.y,9,5,b.angle,0,TAU);c.fill();}
    }
    if(power>.05){const mouth=deformed(.5,sprite.faceY+.13,b,t);
      if(kind==='chili'){
        for(let i=0;i<7;i++){const flame=i/7,reach=(40+Math.sin(t*17-i)*9)*power,x=mouth.x+15+flame*88,y=mouth.y-flame*24+Math.sin(t*15-i)*7;c.globalAlpha=power*(1-flame*.65);c.fillStyle=i%2?'#ffd765':'#ed7955';c.beginPath();c.moveTo(x,y+9);c.quadraticCurveTo(x+reach,y+6,x+reach+12,y-18);c.quadraticCurveTo(x+13,y-5,x,y-12);c.closePath();c.fill();}c.globalAlpha=1;
      }else if(kind==='lemon'){
        c.fillStyle='#91b4ca';for(let i=0;i<4;i++){const a=i*Math.PI/2+t*.4,x=b.x+Math.cos(a)*sprite.w*.62,y=b.y+Math.sin(a)*sprite.h*.38;c.globalAlpha=power;c.beginPath();c.ellipse(x,y,3,7,a,0,TAU);c.fill();}c.globalAlpha=1;
      }else{
        c.fillStyle='#de997e';c.font='18px sans-serif';for(let i=0;i<3;i++){c.globalAlpha=power*.8;c.fillText('♥',b.x-42+i*35,b.y-sprite.h*.45-10-Math.sin(t*3+i)*8);}c.globalAlpha=1;
      }
    }
    c.restore();
  }
  function render(t){ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
    if(mode==='draw'){updateTexture();ctx.save();if(currentPreset){ctx.translate(W/2,0);ctx.scale(aspect(),1);ctx.translate(-W/2,0);}ctx.drawImage(texture,0,0);if(currentPreset&&strokes.length){ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.lineCap='round';for(const x of [340,381]){ctx.beginPath();ctx.moveTo(x-5,218);ctx.quadraticCurveTo(x,223,x+5,218);ctx.stroke();}ctx.font='12px sans-serif';ctx.fillStyle='#9ca58d';ctx.fillText('z',465,159);ctx.font='16px sans-serif';ctx.fillText('z',476,145);}ctx.restore();}
    else if(body){ctx.strokeStyle='#dfe4d4';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(76,floor+9);ctx.lineTo(W-76,floor+9);ctx.stroke();renderPet(ctx,body,t,aspect());ctx.font='11px -apple-system, sans-serif';ctx.textAlign='center';ctx.fillStyle='#849178';ctx.fillText($('petName').value||'小家伙',body.x,floor+33);ctx.textAlign='start';}
    if(mode==='play'&&foodImage&&feeding.sample(time).phase==='flying'){
      const p=feeding.sample(time).progress,e=1-Math.pow(1-p,3),mouthY=body.y+sprite.h*(sprite.faceY+.13-.5),x=body.x-170+170*e,y=floor-35+(mouthY-(floor-35))*e-Math.sin(p*Math.PI)*55,size=62*(1-.55*p),ratio=foodImage.width/foodImage.height;
      ctx.save();ctx.translate(x,y);ctx.scale(aspect(),1);ctx.rotate((1-p)*-.35);ctx.drawImage(foodImage,-size/2,-size/(2*ratio),size,size/ratio);ctx.restore();
    }
    particles.forEach(p=>{ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle='#afc85e';ctx.save();ctx.translate(p.x,p.y);ctx.rotate(t*2);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();});ctx.globalAlpha=1;
  }
  function frame(stamp){const dt=Math.min(.025,lastTime?(stamp-lastTime)/1000:1/60);lastTime=stamp;time+=dt;physics(dt);storyTick();particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);if(time>sayUntil)$('speech').classList.remove('show');render(time);requestAnimationFrame(frame);}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function exportGIF(){if(!sprite||dragging||exporting)return;const button=$('gif'),savedPoke=poke,exportName=($('petName').value||'小家伙').slice(0,10),meal=feeding.sample(time),exportMeal={phase:meal.kind?'reacting':'hungry',kind:meal.kind,strength:meal.kind ? .95 : 0};exporting=true;updateKitchen();button.disabled=true;$('redraw').disabled=true;button.textContent='小家伙正在拍动图…';status('正在生成本地动图，请稍等');
    try{const side=280,c=document.createElement('canvas');c.width=c.height=side;const cc=c.getContext('2d'),frames=[];poke={x:0,y:0,power:0};
      for(let i=0;i<36;i++){
        const phase=i/36*TAU,b={x:360,y:244-Math.sin(phase)*7,sx:1+Math.sin(phase)*.065,sy:1-Math.sin(phase)*.065,angle:Math.sin(phase)*.055,shear:Math.sin(phase)*.025};
        cc.setTransform(1,0,0,1,0,0);cc.fillStyle='#fffef9';cc.fillRect(0,0,side,side);cc.save();cc.scale(side/390,side/390);cc.translate(-165,-24);renderPet(cc,b,i/12,1,exportMeal);cc.restore();cc.fillStyle=ink;cc.font='13px sans-serif';cc.textAlign='center';cc.fillText(exportName,side/2,252);cc.font='9px sans-serif';cc.fillStyle='#8c9585';cc.fillText(meal.kind?foods[meal.kind].title+' · 乱画成精':'乱画成精 · Susu',side/2,270);frames.push(cc.getImageData(0,0,side,side).data);if(i%6===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
      download(new Blob([window.encodeGIF(frames,side,side,8)],{type:'image/gif'}),'乱画成精-'+exportName.replace(/[\\/:*?"<>|]/g,'')+'.gif');say('拍好了，记得带我走！');status('动图已生成：查看浏览器下载');
    }catch(e){say('动图没有生成，再试一下');status('导出失败，画作仍在，可重新尝试');}
    finally{poke=savedPoke;exporting=false;updateKitchen();button.disabled=false;$('redraw').disabled=false;button.innerHTML='带走它的小表情 <span>↓</span>';}
  }
  $('wake').onclick=()=>{stopDemo();wake();};$('redraw').onclick=()=>{stopDemo();redraw();};$('gif').onclick=exportGIF;
  $('swatches').onclick=e=>{const b=e.target.closest('[data-color]');if(!b)return;stopDemo();color=b.dataset.color;$('colorName').textContent=b.dataset.name;document.querySelectorAll('[data-color]').forEach(el=>el.classList.toggle('selected',el===b));erasing=false;setTool();};
  function setTool(){$('pen').classList.toggle('active',!erasing);$('eraser').classList.toggle('active',erasing);$('pen').setAttribute('aria-pressed',String(!erasing));$('eraser').setAttribute('aria-pressed',String(erasing));}
  $('brush').oninput=e=>{stopDemo();brush=+e.target.value;$('brushValue').textContent=String(brush);};$('pen').onclick=()=>{stopDemo();erasing=false;setTool();};$('eraser').onclick=()=>{stopDemo();erasing=true;setTool();};
  $('undo').onclick=()=>{stopDemo();if(strokes.length){history.push(strokes.pop());drawDirty=true;currentPreset=null;save();status('撤销了一笔');}};
  $('clear').onclick=()=>{stopDemo();strokes=[];history=[];currentPreset=null;drawDirty=true;save();$('cornerNote').textContent='在这里随便画，闭合的轮廓更有模样';status('空白画布，轮到你啦');};
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{stopDemo();makePreset(b.dataset.preset);save();});
  $('jump').onclick=()=>{if(body&&!dragging){body.vy=-430;body.svx+=2;body.svy-=3;say('我先蹦为敬！');}};$('calm').onclick=()=>{if(dragging)return;resetBody();say('好，我回来了。');};$('petName').oninput=save;$('eyes').onchange=()=>{stopDemo();save();};
  $('quickWake').onclick=()=>{if($('gif').disabled)return;stopDemo();if(mode==='play')$('feedPanel').scrollIntoView({block:'start',behavior:reduceMotion?'auto':'smooth'});else wake();};
  $('quickClear').onclick=()=>{if($('gif').disabled)return;stopDemo();if(mode==='play')redraw();$('clear').click();};
  $('quickPreset').onclick=()=>{if($('gif').disabled)return;stopDemo();const names=['blob','bunny','star'],next=names[(names.indexOf(currentPreset)+1)%3];if(mode==='play')redraw();makePreset(next);save();};
  document.querySelectorAll('[data-food]').forEach(b=>b.onclick=()=>chooseFood(b.dataset.food));$('foodUndo').onclick=()=>{if(exporting)return;foodStrokes.pop();renderFoodPad();};$('foodClear').onclick=()=>{if(exporting)return;foodStrokes=[];foodActive=null;renderFoodPad();};$('feed').onclick=()=>feedPet(false);$('feedExample').onclick=()=>feedPet(true);
  document.addEventListener('visibilitychange',()=>{lastTime=0;});
  if(!readSaved()){makePreset('blob');}else{$('cornerNote').textContent='你上次的小家伙，还在这里';}
  requestAnimationFrame(frame);
  if(!reduceMotion)autoTimer=setTimeout(()=>{if(!hasTouched&&mode==='draw')wake();},2600);
})();

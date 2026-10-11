// PDF bytes and passwords remain in the browser; the shared parser receives text.
(() => {
  let task=null,passwordCallback=null;
  window.FinWebPdf={
    cancel(){passwordCallback=null;task?.destroy();task=null;closeSheet();setImportStatus('error','PDF import cancelled','Existing transactions were retained.');},
    unlock(){const input=document.getElementById('webPdfPassword');const password=input?.value;if(!password)return;input.value='';closeSheet();passwordCallback?.(password);passwordCallback=null;},
    async import(file){
      if(file.size>12*1024*1024){handleNativePdfError('Choose a PDF no larger than 12 MB.');return;}
      try{
        await task?.destroy();
        handleNativePdfStarted(file.name);
        const pdf=await import('./pdfjs/pdf.mjs');
        pdf.GlobalWorkerOptions.workerSrc=new URL('./pdfjs/pdf.worker.mjs',location.href).href;
        task=pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,cMapUrl:new URL('./pdfjs/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('./pdfjs/standard_fonts/',location.href).href,wasmUrl:new URL('./pdfjs/wasm/',location.href).href});
        task.onPassword=(callback,reason)=>{
          passwordCallback=callback;
          openSheet(`<h2>Unlock PDF statement</h2><p>${reason===2?'Incorrect password. Try again.':'Enter the statement password. It is used in this browser and never sent online.'}</p><input id="webPdfPassword" type="password" autocomplete="off" aria-label="PDF password"><button class="btn primary block" onclick="FinWebPdf.unlock()">Unlock and analyze</button><button class="btn soft block" onclick="FinWebPdf.cancel()">Cancel</button>`);
        };
        const document=await task.promise;
        if(document.numPages>120)throw Error('PDF exceeds the 120-page limit.');
        const pages=[],alternate=[];
        for(let n=1;n<=document.numPages;n++){
          const page=await document.getPage(n),content=await page.getTextContent();
          const items=content.items.filter(item=>typeof item.str==='string');
          alternate.push(items.map(item=>item.str+(item.hasEOL?'\n':' ')).join(''));
          const lines=[];
          for(const item of [...items].sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){
            let line=lines.find(row=>Math.abs(row.y-item.transform[5])<3);
            if(!line){line={y:item.transform[5],items:[]};lines.push(line);}line.items.push(item);
          }
          pages.push(lines.sort((a,b)=>b.y-a.y).map(line=>line.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(item=>item.str).join(' ')).join('\n'));
          page.cleanup();
        }
        handleNativePdfText({text:pages.join('\n'),alternateText:alternate.join('\n'),pages:document.numPages});
      }catch(error){if(task)handleNativePdfError(error?.message||'PDF extraction failed. Try a text-based statement or CSV.');}
      finally{await task?.destroy();task=null;passwordCallback=null;}
    }
  };
})();

// Small transform/opacity animations keep scrolling and financial updates responsive.
(() => {
  document.body.classList.add('fin-web');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const hero=document.querySelector('#view-home .hero');
  if(hero){
    const scene=document.createElement('div');scene.className='fin-coin-stage';scene.setAttribute('aria-hidden','true');scene.dataset.rawValue='true';
    scene.innerHTML=`<div class="fin-coin-halo"></div><div class="fin-coin-tilt"><div class="fin-coin-spin">${Array.from({length:19},(_,i)=>`<span class="fin-coin-edge" style="--depth:${i-9}px"></span>`).join('')}<div class="fin-coin-face fin-coin-front"><span class="fin-coin-caption">FINANCIAL CLARITY</span><strong>$</strong><span class="fin-coin-caption">FIN · YOUR FUTURE</span></div><div class="fin-coin-face fin-coin-back"><span class="fin-coin-caption">BUILD YOUR RESERVE</span><strong>FIN</strong><span class="fin-coin-caption">ONE STEP AT A TIME</span></div></div></div><div class="fin-coin-shadow"></div>`;
    hero.classList.add('has-fin-coin');hero.append(scene);
    let frame=0,pointerX=0,pointerY=0;
    hero.addEventListener('pointermove',event=>{
      if(motion.matches||event.pointerType!=='mouse')return;
      const bounds=hero.getBoundingClientRect();pointerX=(event.clientX-bounds.left)/bounds.width-.5;pointerY=(event.clientY-bounds.top)/bounds.height-.5;
      if(!frame)frame=requestAnimationFrame(()=>{frame=0;scene.style.setProperty('--tilt-x',`${-pointerY*18}deg`);scene.style.setProperty('--tilt-y',`${pointerX*22}deg`);});
    },{passive:true});
    hero.addEventListener('pointerleave',()=>{if(frame)cancelAnimationFrame(frame);frame=0;scene.style.setProperty('--tilt-x','0deg');scene.style.setProperty('--tilt-y','0deg');});
    let visible=false;
    const pause=()=>scene.classList.toggle('is-paused',!visible||document.hidden);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;pause();},{threshold:.05}).observe(scene);
    document.addEventListener('visibilitychange',pause);
  }
  const ambient=document.createElement('div');ambient.className='fin-web-ambient';ambient.setAttribute('aria-hidden','true');ambient.innerHTML='<i></i><i></i>';document.body.prepend(ambient);
  const progress=document.createElement('div');progress.className='fin-web-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
  let scrollFrame=0;
  function updateScroll(){scrollFrame=0;const maximum=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${maximum>0?Math.min(1,scrollY/maximum):0})`;}
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);},{passive:true});
  addEventListener('resize',updateScroll);updateScroll();
  const seen=new WeakSet(),animations=new Set();
  function animate(element,keyframes,options){
    if(motion.matches||document.hidden)return;
    const animation=element.animate(keyframes,options);animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
  }
  const reveals=new IntersectionObserver(entries=>{
    let index=0;
    for(const entry of entries){if(!entry.isIntersecting)continue;reveals.unobserve(entry.target);
      animate(entry.target,[{opacity:.35,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:Math.min(index++*35,140),easing:'cubic-bezier(.22,1,.36,1)'});
    }
  },{threshold:.08});
  function discover(){
    document.querySelectorAll('.view.active .card,.view.active .metric,.view.active .hero,body>main .card').forEach(element=>{if(!seen.has(element)){seen.add(element);reveals.observe(element);}});
    updateScroll();
  }
  let discoveryFrame=0;
  const observer=new MutationObserver(records=>{
    for(const record of records){if(record.type==='attributes'&&record.target.matches('.view.active'))animate(record.target,[{opacity:.4,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'});}
    if(!discoveryFrame)discoveryFrame=requestAnimationFrame(()=>{discoveryFrame=0;discover();});
  });
  const app=document.getElementById('app');if(app)observer.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  const sheet=document.getElementById('sheetContent');
  if(sheet)new MutationObserver(()=>{animate(sheet,[{opacity:.6,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});}).observe(sheet,{childList:true});
  document.addEventListener('pointerdown',event=>{
    if(motion.matches)return;const button=event.target.closest('button');if(!button||button.disabled)return;
    const bounds=button.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='fin-web-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.left=`${event.clientX-bounds.left}px`;ripple.style.top=`${event.clientY-bounds.top}px`;button.append(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
  });
  motion.addEventListener('change',()=>{if(motion.matches){for(const animation of animations)animation.cancel();document.querySelectorAll('.fin-web-ripple').forEach(element=>element.remove());}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const animation of animations)animation.cancel();});
  discover();
})();

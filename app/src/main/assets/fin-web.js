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

// Public, disposable demonstration using the same planner as the signed-in app.
(() => {
  const section=document.getElementById('simulation');if(!section)return;
  const defaults={income:60000,essential:28000,discretionary:10000,debt:5000,cash:45000,reserve:30000,savings:4000,variability:10};
  const money=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
  const percent=value=>`${Math.round(value*100)}%`;
  const descriptions={stable:'Stable income: the sample income and declared variability continue across six months.', 'income-reduction':'Income reduction: monthly income falls by 30% from month 2. Variability remains at the declared sample scale.', 'essential-shock':'Unexpected expense: an additional ₹25,000 essential expense occurs in month 2.',infeasible:'Infeasible stress test: income falls by 40% from month 2 and a ₹25,000 essential expense occurs in month 2.'};
  let scenario='stable',selectedId=null,result=null,frame=0;
  function input(){
    const values=Object.fromEntries(Object.keys(defaults).map(key=>[key,Number(document.getElementById(`sim-${key}`).value)]));
    return {startingCash:values.cash,monthlyIncome:values.income,essentialExpenses:values.essential,debtMinimum:values.debt,discretionaryBaseline:values.discretionary,minimumReserve:values.reserve,monthlySavingsGoal:values.savings,incomeSd:values.income*values.variability/100,essentialSd:values.essential*.1,totalDebt:180000,scenario,shockAmount:25000,paths:500,historyProfile:{months:0,transactionCount:0,reliabilityLabel:'synthetic assumptions; no imported history'}};
  }
  const baseline=FinActionPlanner.buildPlans(input()),initial=baseline.sequences[0];
  function chart(plan,reserve){
    const values=plan.uncertainty.ranges.flatMap(range=>[range.p10,range.p90]).concat(plan.periods.map(period=>period.closing),[reserve,0]);
    const low=Math.min(...values),high=Math.max(...values),span=Math.max(1,high-low),y=value=>240-(value-low)/span*195,x=index=>65+index*120;
    const path=plan.periods.map((period,index)=>`${index?'L':'M'}${x(index)},${y(period.closing).toFixed(1)}`).join(' ');
    const band=plan.uncertainty.ranges.map((range,index)=>`${x(index)},${y(range.p90).toFixed(1)}`).concat([...plan.uncertainty.ranges].reverse().map((range,index)=>`${x(5-index)},${y(range.p10).toFixed(1)}`)).join(' ');
    const grid=[0,.5,1].map(t=>{const value=low+t*span,position=y(value);return `<line x1="65" y1="${position}" x2="665" y2="${position}" stroke="#d9e7ee"/><text x="55" y="${position+4}" text-anchor="end">₹${Math.round(value/1000)}k</text>`;}).join('');
    document.getElementById('sim-chart').innerHTML=`<title>${plan.name}: expected cash, P10–P90 simulated range and reserve</title><text x="65" y="23">Expected cash · shaded P10–P90 range · dashed reserve</text>${grid}<polygon points="${band}" fill="#087f8318"/><line class="chart-reserve" x1="65" x2="665" y1="${y(reserve)}" y2="${y(reserve)}"/><path class="chart-path" d="${path}"/>${plan.periods.map((period,index)=>`<circle cx="${x(index)}" cy="${y(period.closing)}" r="4" fill="#087f83"/><text x="${x(index)}" y="265" text-anchor="middle">Month ${index+1}</text>`).join('')}`;
  }
  function render(){
    frame=0;const assumptions=input();result=FinActionPlanner.buildPlans(assumptions);
    const selected=result.sequences.find(plan=>plan.id===selectedId)||result.sequences[0];selectedId=selected.id;
    for(const key of Object.keys(defaults))document.getElementById(`sim-${key}-value`).textContent=key==='variability'?`${document.getElementById('sim-variability').value}%`:money.format(Number(document.getElementById(`sim-${key}`).value));
    document.getElementById('sim-headroom').textContent=money.format(assumptions.monthlyIncome-assumptions.essentialExpenses-assumptions.debtMinimum-assumptions.discretionaryBaseline);
    document.getElementById('sim-preferred').textContent=result.sequences[0].name;
    document.getElementById('sim-closing').textContent=money.format(selected.periods.at(-1).closing);
    document.getElementById('sim-scenario-description').textContent=descriptions[scenario]+' Baseline headroom excludes savings and extra debt payments.';
    document.getElementById('sim-plans').innerHTML=result.sequences.map(plan=>`<button type="button" data-sim-plan="${plan.id}" aria-pressed="${plan.id===selectedId}"><em>${plan.id===result.recommendedId?'PREFERRED STRATEGY':'ALTERNATIVE STRATEGY'}</em><strong>${plan.name}</strong><span>Reserve-shortfall simulation: ${percent(plan.uncertainty.shortfallRisk)}</span><span>Six-month saving: ${money.format(plan.totals.saved)}</span><span>Extra debt repaid: ${money.format(plan.totals.extraDebt)}</span></button>`).join('');
    document.getElementById('sim-reason').textContent=result.recommendationReason;
    document.getElementById('sim-table-caption').textContent=selected.name+' · six monthly periods';
    document.getElementById('sim-periods').innerHTML=selected.periods.map((period,index)=>`<tr><th scope="row">${period.period}</th>${['income','essential','debtMinimum','discretionary','savings','extraDebt','closing'].map(key=>`<td>${money.format(period[key])}</td>`).join('')}<td>${money.format(selected.uncertainty.ranges[index].p10)} – ${money.format(selected.uncertainty.ranges[index].p90)}</td></tr>`).join('');
    const preferred=result.sequences[0];
    document.getElementById('sim-change').textContent=`Compared with the initial synthetic sample: preferred strategy ${initial.name} → ${preferred.name}; preferred plan's month-6 cash ${money.format(initial.periods.at(-1).closing)} → ${money.format(preferred.periods.at(-1).closing)}; simulated reserve-shortfall risk ${percent(initial.uncertainty.shortfallRisk)} → ${percent(preferred.uncertainty.shortfallRisk)}.`;
    const conflict=document.getElementById('sim-conflicts');
    if(selected.feasibility.infeasible){conflict.innerHTML=`<strong>Some goals or constraints remain unmet</strong><ul>${selected.feasibility.conflicts.slice(0,6).map(text=>`<li>${text}</li>`).join('')}</ul><strong>Proposed relaxation</strong><ul>${selected.feasibility.proposals.map(text=>`<li>${text}</li>`).join('')}</ul>`;}else{conflict.textContent='The selected expected plan meets the declared reserve and savings goals in all six periods. Simulated outcomes can still fall below the reserve.';}
    chart(selected,assumptions.minimumReserve);
    section.querySelectorAll('[data-sim-scenario]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.simScenario===scenario)));
  }
  section.addEventListener('input',event=>{if(event.target.matches('input[type="range"]')){selectedId=null;if(!frame)frame=requestAnimationFrame(render);}});
  section.addEventListener('click',event=>{
    const preset=event.target.closest('[data-sim-scenario]'),plan=event.target.closest('[data-sim-plan]');
    if(preset){scenario=preset.dataset.simScenario;selectedId=null;render();}
    else if(plan){selectedId=plan.dataset.simPlan;render();}
    else if(event.target.closest('#sim-reset')){for(const [key,value] of Object.entries(defaults))document.getElementById(`sim-${key}`).value=value;scenario='stable';selectedId=null;render();}
  });
  render();
})();

// Small transform/opacity animations keep scrolling and financial updates responsive.
(() => {
  document.body.classList.add('fin-web');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const hero=document.querySelector('#view-home .hero,[data-coin-hero]');
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
  let parallaxCoin=null,parallaxOrb=null;
  if(document.body.classList.contains('portfolio')){
    const backdrop=document.createElement('div');backdrop.className='portfolio-parallax';backdrop.setAttribute('aria-hidden','true');
    parallaxCoin=document.createElement('div');parallaxCoin.className='portfolio-background-coin';
    const source=hero?.querySelector('.fin-coin-stage');if(source)parallaxCoin.append(source.cloneNode(true));
    parallaxOrb=document.createElement('div');parallaxOrb.className='portfolio-liquid-orb';
    const orbDrift=document.createElement('div');orbDrift.className='portfolio-orb-drift';orbDrift.append(parallaxOrb);
    const glints=document.createElement('div');glints.className='portfolio-glints';glints.innerHTML='<i></i><i></i><i></i>';
    backdrop.append(parallaxCoin,orbDrift,glints);document.body.prepend(backdrop);
    const pauseBackground=()=>backdrop.classList.toggle('is-paused',document.hidden);
    document.addEventListener('visibilitychange',pauseBackground);pauseBackground();
  }
  let scrollFrame=0;
  function updateScroll(){
    scrollFrame=0;const maximum=document.documentElement.scrollHeight-innerHeight,p=maximum>0?Math.max(0,Math.min(1,scrollY/maximum)):0;
    progress.style.transform=`scaleX(${p})`;
    if(parallaxCoin&&!motion.matches&&!document.hidden){
      parallaxCoin.style.transform=`translate3d(${Math.sin(p*Math.PI*2)*14}vw,${p*36-8}vh,0) rotateZ(${p*65}deg)`;
      parallaxCoin.querySelector('.fin-coin-spin').style.transform=`rotateX(${22+p*25}deg) rotateY(${-30+p*540}deg)`;
      parallaxOrb.style.transform=`translate3d(${p*18}vw,${-p*30}vh,0) rotate(${p*90}deg)`;
    }
  }
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll);},{passive:true});
  addEventListener('resize',updateScroll);updateScroll();
  document.addEventListener('toggle',updateScroll,{capture:true});
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
    document.querySelectorAll('.view.active .card,.view.active .metric,.view.active .hero,body>main .card,.portfolio-card,.portfolio-gallery figure,.portfolio-step,.portfolio-section>h2,.portfolio-explainer').forEach(element=>{if(!seen.has(element)){seen.add(element);reveals.observe(element);}});
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

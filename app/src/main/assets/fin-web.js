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

import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
export function buildWeb(destination=path.join(root,'build/web')){
  fs.mkdirSync(destination,{recursive:true});
  const assets=path.join(root,'app/src/main/assets');
  const files=['index.html','login.html','login.js','fin-auth.js','fin-locale.js','forecast-reliability.js','financial-action-planner.js','fin-web.js','fin-web.css'];
  for(const file of files)fs.copyFileSync(path.join(assets,file),path.join(destination,file));
  for(const page of ['index.html','login.html']){
    const filename=path.join(destination,page);
    fs.writeFileSync(filename,fs.readFileSync(filename,'utf8').replace('</head>','<link rel="stylesheet" href="fin-web.css"><script src="fin-web.js" defer></script></head>').replace(',user-scalable=no',''));
  }
  fs.copyFileSync(path.join(destination,'index.html'),path.join(destination,'app.html'));
  fs.copyFileSync(path.join(assets,'fin-portfolio.html'),path.join(destination,'index.html'));
  const loginScript=path.join(destination,'login.js');
  fs.writeFileSync(loginScript,fs.readFileSync(loginScript,'utf8').replace("location.replace('index.html')","location.replace('app.html')"));
  files.push('app.html');
  fs.mkdirSync(path.join(destination,'screenshots'),{recursive:true});
  for(const name of ['financial-health','predictive-insights','action-impact','change-simulator']){
    const file=`screenshots/${name}.png`;fs.copyFileSync(path.join(root,'docs',file),path.join(destination,file));files.push(file);
  }
  const pdfDir=path.join(destination,'pdfjs');fs.mkdirSync(pdfDir,{recursive:true});
  for(const file of ['pdf.mjs','pdf.worker.mjs'])fs.copyFileSync(path.join(root,'node_modules/pdfjs-dist/build',file),path.join(pdfDir,file));
  for(const folder of ['cmaps','standard_fonts','wasm'])fs.cpSync(path.join(root,'node_modules/pdfjs-dist',folder),path.join(pdfDir,folder),{recursive:true});
  console.log('FIN web built: shared app, responsive layout, browser-local PDF extraction.');
  return files;
}
if(process.argv[1]===import.meta.filename)buildWeb();

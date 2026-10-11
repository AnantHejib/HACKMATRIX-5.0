// Session gate for the separate mobile/password page. The backend validates all sessions.
let isEmailVerified=false;
let authApiBase='';
function authToken(){return sessionStorage.getItem('finAuthToken')||''}
function getAuthApiUrl(endpoint){const base=(authApiBase||copilotApiBase||(/^https?:$/.test(location.protocol)?location.origin:'')).replace(/\/$/,'');return base?base+endpoint:null}
function showAuthError(message){
  let box=document.getElementById('authError');
  if(!box){box=document.createElement('p');box.id='authError';box.setAttribute('role','alert');box.style.cssText='margin:14px 0 0;padding:12px;border-radius:12px;background:rgba(226,74,85,.09);color:var(--ink);font-size:13px;line-height:1.6';document.querySelector('#authOverlay .auth-card').appendChild(box)}
  box.textContent=message||'';box.hidden=!message;if(message)toast(message);
}
async function callAuthApi(endpoint,payload){
  const url=getAuthApiUrl(endpoint);
  if(!url)return{ok:false,status:503,data:{error:'Email sign-in requires a configured HTTPS server.'}};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
    const headers={'Content-Type':'application/json'};
    if(authToken())headers.Authorization='Bearer '+authToken();
    const res=await fetch(url,{method:payload===undefined?'GET':'POST',headers,body:payload===undefined?undefined:JSON.stringify(payload),signal:controller.signal});
    if(res.status===404||res.status===405)return{ok:false,status:res.status,data:{error:'Email sign-in is not deployed on the connected server. The FIN backend needs an authentication update; no code was sent.'}};
    const data=await res.json().catch(()=>null);
    if(!data||typeof data!=='object'||Array.isArray(data))return{ok:false,status:res.status,data:{error:'The sign-in server returned an unexpected response. Please try again later.'}};
    if(!res.ok&&typeof data.error!=='string')data.error=res.status===429?'Too many requests. Please wait one minute and try again.':'The sign-in service is unavailable. Please try again later.';
    return{ok:res.ok,status:res.status,data};
  }catch{return{ok:false,status:0,data:{error:'Cannot reach the sign-in server. Check your connection and try again.'}}}
  finally{clearTimeout(timer)}
}
function lockFIN(){
  isEmailVerified=false;
  document.getElementById('app').inert=true;
  document.getElementById('app').style.display='none';
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('authOverlay').classList.add('hidden');
}
function unlockFIN(){
  isEmailVerified=true;
  document.getElementById('app').inert=false;
  document.getElementById('app').style.display='';
  document.getElementById('authOverlay').classList.add('hidden');
  scheduleDrawCharts();
  if(localStorage.getItem('finConsent')!=='yes')document.getElementById('onboarding').classList.remove('hidden');
}
async function restoreAuth(){
  lockFIN();
  if(!authToken()){localStorage.removeItem('finSession');location.replace('login.html');return}
  const res=await callAuthApi('/api/v1/auth/session');
  if(res.ok&&res.data.user){
    const email=res.data.user.email;
    localStorage.setItem('finSession',JSON.stringify({name:res.data.user.name,email,identity:email,emailVerified:res.data.user.emailVerified}));
    switchAccount(email);updateProfile();unlockFIN();
  }else{sessionStorage.removeItem('finAuthToken');localStorage.removeItem('finSession');location.replace('login.html')}
}
async function validateActiveSession(){
  if(!isEmailVerified||!authToken())return;
  const res=await callAuthApi('/api/v1/auth/session');
  if(res.status===401){sessionStorage.removeItem('finAuthToken');closeSheet();lockFIN();location.replace('login.html')}
}
if(typeof window.addEventListener==='function'){
  window.addEventListener('focus',()=>validateActiveSession());
  setInterval(()=>validateActiveSession(),5*60*1000);
}
async function logout(){
  closeSheet();const result=await callAuthApi('/api/v1/auth/logout',{});
  sessionStorage.removeItem('finAuthToken');localStorage.removeItem('finSession');lockFIN();updateProfile();
  location.replace('login.html');
  toast(result.ok?'Signed out. Local financial data was retained.':'Signed out locally. Server session could not be revoked; it will expire automatically.');
}

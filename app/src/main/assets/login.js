(() => {
  const byId=id=>document.getElementById(id);
  let busy=false;
  const signup=()=>location.hash==='#signup';
  function show(message,success=false){const box=byId('message');box.textContent=message;box.hidden=!message;box.classList.toggle('success',success)}
  function render(){
    const create=signup();
    byId('title').textContent=create?'Create account':'Sign in';
    document.title=(create?'Sign up':'Sign in')+' | FIN';
    byId('intro').textContent=create?'Create your FIN account to get started.':'Welcome back. Sign in to your financial workspace.';
    for(const id of ['signupFields','confirmFields','passwordHint'])byId(id).hidden=!create;
    byId('email').required=create;byId('confirmPassword').required=create;
    byId('password').autocomplete=create?'new-password':'current-password';
    byId('password').value='';byId('confirmPassword').value='';
    byId('submitButton').textContent=create?'Sign up':'Sign in';
    byId('switchCopy').innerHTML=create?'Already have an account? <a href="#signin">Sign in</a>':"Don't have an account? <a href=\"#signup\">Sign up</a>";
    show('');
  }
  function apiBase(){
    try{const runtime=JSON.parse(window.FinNative.runtimeConfig());if(runtime.ok&&runtime.data.authBaseUrl)return runtime.data.authBaseUrl.replace(/\/$/,'')}catch{}
    return /^https?:$/.test(location.protocol)?location.origin:'https://fin-auth-gilt.vercel.app';
  }
  byId('accessForm').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    const create=signup(),phone=byId('phone').value,password=byId('password').value;
    if(!/^[0-9]{10}$/.test(phone)){show('Enter a mobile number containing exactly 10 digits.');return}
    if(create&&password!==byId('confirmPassword').value){show('Passwords do not match.');return}
    busy=true;show('');byId('submitButton').disabled=true;byId('submitButton').textContent=create?'Creating account...':'Signing in...';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{
      const response=await fetch(apiBase()+'/api/v1/auth/'+(create?'signup':'signin'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,password,...(create?{email:byId('email').value.trim()}: {})}),signal:controller.signal});
      const data=await response.json().catch(()=>null);
      if(!response.ok||data?.success!==true){show(data?.error||'Sign-in service is unavailable. Please try again.');return}
      byId('password').value='';byId('confirmPassword').value='';
      if(create){location.hash='#signin';render();show('Account created. Sign in with your mobile number and password.',true);byId('password').focus();return}
      if(typeof data.token!=='string'||!data.user?.id){show('The server could not confirm your sign-in. Please try again.');return}
      sessionStorage.setItem('finAuthToken',data.token);
      location.replace('index.html');
    }catch{show('Cannot reach the sign-in server. Check your connection and try again.')}
    finally{clearTimeout(timer);busy=false;byId('submitButton').disabled=false;byId('submitButton').textContent=signup()?'Sign up':'Sign in'}
  });
  window.addEventListener('hashchange',render);render();
})();

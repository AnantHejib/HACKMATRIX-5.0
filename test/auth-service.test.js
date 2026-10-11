import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { createFINAuth, otpEmail } from '../lib/auth-service.js';
import { handleAuth } from '../api/v1/auth.js';
import { sendSmtp, verifySmtp } from '../lib/smtp-client.js';
import nodemailer from 'nodemailer';

function fixture(delivery) {
  const db={user:[],session:[],account:[],verification:[],rateLimit:[]},outbox=[];
  const auth=createFINAuth({database:memoryAdapter(db),secret:'synthetic-test-secret-never-used-in-production-123',baseURL:'http://localhost:3000',deliver:delivery||(async message=>{outbox.push(message)})});
  const call=async(action,body,token,extraHeaders={})=>{
    const req=new Request('http://localhost:3000/api/v1/auth/'+action,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...extraHeaders},body:body===undefined?undefined:JSON.stringify(body)});
    const response=await handleAuth(req,auth);return{status:response.status,data:await response.json()};
  };
  return{db,outbox,call};
}
const target='synthetic@example.com',payload={type:'email',target};
test('Android null-origin JSON signup and sign-in work with Fetch Metadata; forms and untrusted web origins fail',async()=>{
  const {call}=fixture(),account={email:target,phone:'9876543210',password:'Test-only-password-483!'};
  const native={Origin:'null','Sec-Fetch-Site':'cross-site','Sec-Fetch-Mode':'cors','Sec-Fetch-Dest':'empty'};
  assert.equal((await call('signup',account,undefined,{...native,'Sec-Fetch-Mode':'navigate','Sec-Fetch-Dest':'document'})).status,403);
  assert.equal((await call('signup',account,undefined,{...native,'Content-Type':'text/plain'})).status,403);
  assert.equal((await call('signup',account,undefined,{...native,Origin:'https://untrusted.example'})).status,403);
  assert.equal((await call('signup',account,undefined,native)).status,200);
  const signed=await call('signin',account,undefined,native);
  assert.equal(signed.status,200);assert.ok(signed.data.token);
  assert.equal((await call('session',undefined,signed.data.token,native)).status,200);
  assert.equal((await call('logout',{},signed.data.token,native)).status,200);
  const other={email:'no-origin@example.com',phone:'9876543211',password:'Test-only-password-483!'};
  assert.equal((await call('signup',other)).status,200,'Android may omit Origin entirely');
  assert.equal((await call('signin',other)).status,200);
});
test('mobile/password registration stores hashes, rejects incorrect passwords, duplicates and invalid numbers',async()=>{
  const {db,call}=fixture(),account={email:target,phone:'9876543210',password:'Test-only-password-483!'};
  assert.equal((await call('signup',account)).status,200);
  assert.equal(db.user[0].username,account.phone);
  assert.ok(db.account[0].password);
  assert.notEqual(db.account[0].password,account.password);
  assert.equal((await call('session')).status,401);
  assert.equal((await call('signin',{phone:account.phone,password:'wrong-password'})).status,401);
  const signed=await call('signin',account);
  assert.equal(signed.status,200);assert.ok(signed.data.token);
  assert.equal((await call('session',undefined,signed.data.token)).data.user.email,target);
  assert.notEqual((await call('signup',{...account,email:'other@example.com'})).status,200);
  await call('signup',{...account,phone:'9876543211'});
  assert.equal(db.user.length,1,'Duplicate email must not create a second account');
  for(const phone of ['123456789','12345678901','98765abc10','98765.4321','+919876543210',9876543210]){
    assert.equal((await call('signin',{phone,password:account.password})).status,400);
  }
});

test('styled email includes both formats and no arbitrary HTML injection',()=>{
  const email=otpEmail('123456');assert.ok(email.html.includes('123456'));assert.ok(email.text.includes('123456'));assert.ok(email.html.includes('Never share'));assert.throws(()=>otpEmail('<script>'));
});
test('real framework OTP -> verified session -> sign-out; OTP never returned and replay fails',async()=>{
  const {db,outbox,call}=fixture();
  const sent=await call('send-otp',payload);assert.equal(sent.status,200);assert.equal(sent.data.devCode,undefined);assert.equal(outbox.length,1);
  const code=outbox[0].otp;assert.match(code,/^\d{6}$/);assert.ok(!JSON.stringify(db.verification).includes(code));
  assert.equal((await call('verify-otp',{...payload,code:'000000'})).status,400);
  const verified=await call('verify-otp',{...payload,code});assert.equal(verified.status,200);assert.ok(verified.data.token);
  const session=await call('session',undefined,verified.data.token);assert.equal(session.status,200);assert.equal(session.data.user.email,target);
  assert.equal((await call('verify-otp',{...payload,code})).status,400);
  assert.equal((await call('logout',{},verified.data.token)).status,200);
  assert.equal((await call('session',undefined,verified.data.token)).status,401);
});
test('a verified first-time email creates the requested named FIN account',async()=>{
  const {outbox,call}=fixture();
  await call('send-otp',payload);
  const verified=await call('verify-otp',{...payload,name:'Asha Patil',code:outbox[0].otp});
  assert.equal(verified.status,200);
  const session=await call('session',undefined,verified.data.token);
  assert.equal(session.data.user.name,'Asha Patil');
});
test('resend cooldown is enforced server-side',async()=>{
  const {call}=fixture();assert.equal((await call('send-otp',payload)).status,200);assert.equal((await call('send-otp',payload)).status,429);
});
test('expired codes and unauthenticated sessions fail',async()=>{
  const {db,outbox,call}=fixture();await call('send-otp',payload);db.verification.forEach(row=>row.expiresAt=new Date(0));
  assert.equal((await call('verify-otp',{...payload,code:outbox[0].otp})).status,400);assert.equal((await call('session')).status,401);
});
test('delivery failure, invalid input and public credential mutations fail closed',async()=>{
  const {call}=fixture(async()=>{throw Error('synthetic SMTP failure secret must not leak')});
  const sent=await call('send-otp',payload);assert.equal(sent.status,503);assert.ok(!JSON.stringify(sent).includes('secret must not leak'));
  assert.equal((await call('send-otp',{type:'email',target:'not-email'})).status,400);
  assert.equal((await call('config',{smtpPass:'must-not-write'})).status,403);
});
test('SMTP refuses header injection and unsupported insecure ports',async()=>{
  await assert.rejects(sendSmtp({host:'smtp.example.com',port:25,user:'synthetic',pass:'synthetic',from:'a@example.com',to:'b@example.com'}),/SMTP_PORT/);
  await assert.rejects(sendSmtp({host:'smtp.example.com',user:'synthetic',pass:'synthetic',from:'a@example.com',to:'b@example.com\r\nBCC:other@example.com'}),/header/);
});
test('SMTP sends styled and plain-text email using verified TLS on 465 and STARTTLS on 587',async()=>{
  const original=nodemailer.createTransport;let options,mail,closed;
  nodemailer.createTransport=value=>{options=value;return{sendMail:async value=>{mail=value;return{accepted:['synthetic@example.com'],rejected:[]}},close:()=>{closed=true}}};
  try{
    for(const port of [465,587]){
      closed=false;await sendSmtp({host:'smtp.example.com',port,user:'synthetic',pass:'do not strip spaces',from:'FIN <sender@example.com>',to:target,...otpEmail('123456')});
      assert.equal(options.secure,port===465);assert.equal(options.requireTLS,true);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(options.auth.pass,'do not strip spaces');assert.ok(mail.html&&mail.text);assert.ok(closed);
    }
  }finally{nodemailer.createTransport=original}
});
test('attempt limits, random tokens and session expiry are enforced',async()=>{
  const {db,outbox,call}=fixture();await call('send-otp',payload);
  for(let i=0;i<5;i++)assert.equal((await call('verify-otp',{...payload,code:'000000'})).status,400);
  assert.notEqual((await call('verify-otp',{...payload,code:outbox[0].otp})).status,200);
  assert.equal((await call('session',undefined,'random-invalid-token')).status,401);
  const f=fixture();await f.call('send-otp',payload);const signed=await f.call('verify-otp',{...payload,code:f.outbox[0].otp});
  f.db.session.forEach(row=>row.expiresAt=new Date(0));assert.equal((await f.call('session',undefined,signed.data.token)).status,401);
  assert.equal(db.session.length,0);
});
test('SMTP readiness authenticates without sending mail and always closes its connection',async()=>{
  const original=nodemailer.createTransport;let closed=false,shouldFail=false;
  nodemailer.createTransport=()=>({verify:async()=>{if(shouldFail)throw Object.assign(Error('synthetic failure'),{code:'EAUTH'})},sendMail:()=>{assert.fail('Readiness must not send email')},close:()=>{closed=true}});
  const settings={host:'smtp.example.com',port:465,user:'synthetic',pass:'synthetic',from:'sender@example.com'};
  try{
    assert.equal((await verifySmtp(settings)).success,true);assert.ok(closed);
    shouldFail=true;closed=false;await assert.rejects(verifySmtp(settings),error=>error.code==='EAUTH');assert.ok(closed);
  }finally{nodemailer.createTransport=original}
});

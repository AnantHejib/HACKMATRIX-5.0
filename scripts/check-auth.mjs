import fs from 'node:fs';
import { Pool } from 'pg';
import { getAuthConfig } from '../lib/auth-service.js';
import { verifySmtp } from '../lib/smtp-client.js';
import { getMigrations } from 'better-auth/db/migration';
import { createFINAuth } from '../lib/auth-service.js';

// Node preserves already-set keys: private settings load before defaults.
// Never echo secret values or raw errors.
for(const file of ['.env.local','.env'])if(fs.existsSync(file))process.loadEnvFile(file);
const config=getAuthConfig();
let ready=true;
for(const [label,key] of [['Email settings','emailConfigured'],['Authentication secret','secretConfigured'],['Backend URL','baseUrlConfigured'],['Database URL','databaseConfigured']]){
  console.log(`${label}: ${config[key]?'configured':'MISSING'}`);
  if(!config[key])ready=false;
}
if(config.emailConfigured){
  try{
    await verifySmtp({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),user:process.env.SMTP_USER,pass:process.env.SMTP_PASS,from:process.env.SMTP_FROM});
    console.log('SMTP: TLS connection and sender authentication passed. No email was sent.');
  }catch(error){
    ready=false;
    const reason=error.code==='EAUTH'?'credentials rejected':error.code==='ETIMEDOUT'?'connection timed out':'connection or configuration failed';
    console.log(`SMTP: FAILED (${reason}). Secret values and server responses were suppressed.`);
  }
}
if(config.databaseConfigured&&config.secretConfigured&&config.baseUrlConfigured){
  const database=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:8000,query_timeout:10000});
  database.on('error',()=>{ready=false});
  try{
    await database.query('SELECT 1');
    const auth=createFINAuth({database,secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL});
    const plan=await getMigrations(auth.options,{throwOnUnsafe:false});
    const pending=plan.toBeCreated.length+plan.toBeAdded.length+plan.toBeAddedIndexes.length;
    if(pending||plan.unsafeChanges.length||plan.schemaProblems.length){ready=false;console.log('Database: connected, but authentication schema requires migration/review. Run npm run auth:migrate after confirming the database target.')}
    else console.log('Database: connected; authentication schema is current.');
  }catch{ready=false;console.log('Database: connection/schema check FAILED. Credentials and raw errors were suppressed.')}
  finally{await database.end().catch(()=>{})}
}
console.log(ready?'Authentication prerequisites passed. Real OTP receipt and deployed login still need verification.':'Authentication is NOT ready. Resolve the missing/failed settings above.');
process.exitCode=ready?0:1;

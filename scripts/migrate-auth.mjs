import fs from 'node:fs';
for(const name of ['.env.local','.env']){if(fs.existsSync(name))process.loadEnvFile(name)}
const {createFINAuth,getAuthConfig}=await import('../lib/auth-service.js');
const {Pool}=await import('pg');
const {getMigrations}=await import('better-auth/db/migration');
let auth;
try{
  const config=getAuthConfig();
  if(!config.databaseConfigured||!config.secretConfigured||!config.baseUrlConfigured)throw Error('Missing database/authentication configuration');
  auth=createFINAuth({database:new Pool({connectionString:process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL,max:1,connectionTimeoutMillis:8000,query_timeout:10000}),secret:process.env.BETTER_AUTH_SECRET,baseURL:process.env.BETTER_AUTH_URL});
  const plan=await getMigrations(auth.options);
  if(plan.schemaProblems.length||plan.unsafeChanges.length)throw Error('Schema requires review');
  await plan.runMigrations();
  console.log('FIN authentication schema migration completed. No credentials were printed.');
}catch{
  console.error('Authentication migration failed. Check private configuration, database access and schema compatibility. No credentials or raw errors were printed.');
  process.exitCode=1;
}finally{if(auth)await auth.options.database.end().catch(()=>{})}

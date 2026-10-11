// Creates an auth-only deployment artifact, never a copy of the full repository.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const project=JSON.parse(fs.readFileSync(path.join(root,'.vercel/project.json'),'utf8'));
if(project.projectName!=='fin-auth'||project.projectId!=='prj_5ZYTgZWx1ni1HpKctKjut5DfLlJ0'||project.orgId!=='team_V7AVosKZYJzfS7WmdvIM9sB4')throw Error('Workspace must be linked to the approved fin-auth project.');
const stage=path.join(root,'build/fin-auth-deploy');
const files=['api/v1/auth.js','lib/auth-service.js','lib/smtp-client.js','lib/http.js','package.json','package-lock.json','scripts/migrate-auth.mjs'];
for(const file of files){const destination=path.join(stage,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,file),destination)}
fs.mkdirSync(path.join(stage,'.vercel'),{recursive:true});
fs.writeFileSync(path.join(stage,'.vercel/project.json'),JSON.stringify({projectId:project.projectId,orgId:project.orgId,projectName:project.projectName}));
fs.writeFileSync(path.join(stage,'vercel.json'),JSON.stringify({fluid:true,regions:['sin1'],buildCommand:'node scripts/migrate-auth.mjs',outputDirectory:'public',rewrites:[{source:'/api/v1/auth/:action',destination:'/api/v1/auth?action=:action'}],functions:{'api/**/*.js':{maxDuration:30}},headers:[{source:'/api/(.*)',headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Content-Type-Options',value:'nosniff'}]}]},null,2));
fs.mkdirSync(path.join(stage,'public'),{recursive:true});
fs.writeFileSync(path.join(stage,'public/index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FIN Authentication</title><body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:24px;background:#081e35;color:#e8f5ff"><h1>FIN Authentication Service</h1><p>This backend verifies email ownership for the FIN mobile application.</p><p>Use the mobile app to sign in. Service availability does not mean email delivery is configured.</p></body></html>');
const allowed=new Set([...files,'.vercel/project.json','vercel.json','public/index.html']);
function audit(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const filename=path.join(directory,entry.name);if(entry.isDirectory())audit(filename);else if(!allowed.has(path.relative(stage,filename).split(path.sep).join('/')))throw Error('Unexpected file in auth deployment artifact. Review the staging directory before deployment.')}}
audit(stage);
console.log('Auth-only artifact prepared: no environment files, passwords, APKs, financial records, or AI endpoints copied.');

import {mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {buildSync} from 'esbuild';
buildSync({entryPoints:['public/game.mjs'],bundle:true,format:'esm',minify:true,legalComments:'eof',outfile:'public/game.bundle.js'});
mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});
const files=Object.fromEntries(['index.html','style.css','game.css','app.js','game.bundle.js'].map(f=>[f,readFileSync('public/'+f,'utf8')]));
const api=readFileSync('server/api.mjs','utf8');
writeFileSync('dist/server/index.js',api+'\nconst files='+JSON.stringify(files)+';\nexport default {async fetch(request,env){const p=new URL(request.url).pathname;if(p.startsWith("/api/"))return api(request,env);const f=p==="/"?"index.html":p.slice(1);return files[f]?new Response(files[f],{headers:{"content-type":f.endsWith(".js")?"text/javascript; charset=utf-8":f.endsWith(".css")?"text/css; charset=utf-8":"text/html; charset=utf-8"}}):new Response("Not found",{status:404});}};');
copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');console.log('Built Worker + embedded assets');

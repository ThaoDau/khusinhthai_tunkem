import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {api} from './api.mjs';
mkdirSync('.data',{recursive:true});
const sqlite=new DatabaseSync(process.env.DB_PATH||'.data/village.sqlite');
sqlite.exec('PRAGMA journal_mode=WAL');
sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY)');
for(const name of ['0000_village','0001_auth_rate','0002_positions','0003_social_life','0004_village_mystery']){
 const key=name.slice(0,4);
 if(!sqlite.prepare('SELECT name FROM _migrations WHERE name=?').get(key)){
  sqlite.exec(readFileSync(`drizzle/${name}.sql`,'utf8'));
  sqlite.prepare('INSERT INTO _migrations VALUES(?)').run(key);
 }
}
const wrap=(sql,args=[])=>({bind:(...a)=>wrap(sql,a),first:()=>sqlite.prepare(sql).get(...args)||null,all:()=>({results:sqlite.prepare(sql).all(...args)}),run:()=>sqlite.prepare(sql).run(...args)});
const DB={prepare:wrap,batch:statements=>{sqlite.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
const port=Number(process.argv[2]||process.env.PORT||3000);
createServer(async(req,res)=>{
 try{
  const origin=`http://${req.headers.host}`,url=new URL(req.url,origin);let response;
  if(url.pathname.startsWith('/api/')){
   const chunks=[];let size=0;
   for await(const c of req){size+=c.length;if(size>8192){res.writeHead(413);res.end();return;}chunks.push(c);}
   response=await api(new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}),{DB});
  }else{
   const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
   response=['index.html','app.js','style.css','game.css','performance.css','mystery.css','game.bundle.js'].includes(file)?new Response(file==='app.js'?readFileSync('public/app.js','utf8')+'\n'+readFileSync('public/life-ui.mjs','utf8')+'\n'+readFileSync('public/mystery-ui.mjs','utf8'):readFileSync('public/'+file),{headers:{'content-type':types[file.split('.').at(-1)]}}):new Response('Not found',{status:404});
  }
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Server error');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://localhost:${port}`));

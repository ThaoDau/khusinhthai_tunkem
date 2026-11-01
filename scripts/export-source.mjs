import {readFileSync} from 'node:fs';
const paths=['README.md','package.json','.gitignore','.openai/hosting.json','public/index.html','public/style.css','public/app.js','server/api.mjs','server/local.mjs','scripts/build.mjs','scripts/export-source.mjs','tests/game.test.mjs','drizzle/0000_village.sql','drizzle/meta/_journal.json'];
console.log(JSON.stringify(paths.map(path=>({path,mode:'100644',type:'blob',content:readFileSync(path,'utf8')}))));

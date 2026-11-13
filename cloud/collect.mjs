import Parser from 'rss-parser';import fs from 'fs';import {createHash,pbkdf2Sync,randomBytes,createCipheriv,createDecipheriv} from 'crypto';import {rewrite} from './editor.js';
const F='docs/data/posts.enc.json',E=k=>process.env[k]||'',PW=E('PAGE_PASSWORD');
if(PW.length<8)throw new Error('Thiếu secret PAGE_PASSWORD (tối thiểu 8 ký tự)');
const key=(salt)=>pbkdf2Sync(PW,salt,200000,32,'sha256');
const enc=o=>{const salt=randomBytes(16),iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(salt),iv),d=Buffer.concat([c.update(JSON.stringify(o),'utf8'),c.final(),c.getAuthTag()]);return JSON.stringify({v:1,salt:salt.toString('base64'),iv:iv.toString('base64'),data:d.toString('base64')})};
const dec=txt=>{const o=JSON.parse(txt),b=Buffer.from(o.data,'base64'),d=createDecipheriv('aes-256-gcm',key(Buffer.from(o.salt,'base64')),Buffer.from(o.iv,'base64'));d.setAuthTag(b.subarray(b.length-16));return JSON.parse(Buffer.concat([d.update(b.subarray(0,b.length-16)),d.final()]).toString('utf8'))};
const feeds=(E('RSS_FEEDS')||'https://vnexpress.net/rss/bat-dong-san.rss,https://vnexpress.net/rss/kinh-doanh.rss').split(',').map(s=>s.trim()).filter(Boolean);
fs.mkdirSync('docs/data',{recursive:true});
let posts=[];
if(fs.existsSync(F)){try{posts=dec(fs.readFileSync(F,'utf8'))}catch{throw new Error('Không giải mã được dữ liệu cũ: PAGE_PASSWORD đã đổi? Xóa file docs/data/posts.enc.json rồi chạy lại.')}}
const seen=new Set(posts.map(p=>p.source_link)),max=+(E('AUTO_WRITE')||2),since=Date.now()-2*864e5,ps=new Parser({timeout:20000}),items=[];
const t=i=>Date.parse(i.isoDate||i.pubDate||'');
for(const u of feeds){try{const f=await ps.parseURL(u);for(const i of f.items)if(i.link&&!seen.has(i.link)&&t(i)>=since)items.push(i)}catch(e){console.error(u,e.message)}}
items.sort((a,b)=>t(b)-t(a));
let n=0,raw=0,ai=true;
for(const i of items){if(n>=max)break;
 const base={source_link:i.link,created:new Date().toISOString()};let p=null;
 if(ai){try{const r=await rewrite({text:`${i.title}\n${i.contentSnippet||''}`}),c=(r.content||'').trim();
  if(c)p={id:createHash('sha1').update(c).digest('hex').slice(0,12),title:r.title,content:c,hashtags:r.hashtags,image_note:r.image_note,...base}}
  catch(e){ai=false;console.error('AI:',e.message)}}
 if(!p){p={id:createHash('sha1').update(i.link).digest('hex').slice(0,12),title:i.title||'',content:(i.contentSnippet||'').trim(),hashtags:'',image_note:'',needs_ai:true,...base};raw++}
 if(posts.some(x=>x.id==p.id)){if(p.needs_ai)raw--;continue}
 posts.unshift(p);n++}
const cut=Date.now()-30*864e5;posts=posts.filter(x=>Date.parse(x.created)>=cut).slice(0,300);
fs.writeFileSync(F,enc(posts));console.log(`Bai moi cho duyet: ${n} (trong do ${raw} bai chua soan, se bam AI viet bai tren trang)`);

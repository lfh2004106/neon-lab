import {test} from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {createGuestbookHandler} from '../guestbook-api.mjs';
test('guestbook validates submissions, shares stored messages and handles rate limits',async()=>{
 const saved={...process.env};delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;let entries=[],rate=false;
 const handler=createGuestbookHandler(async(url,options)=>{
  assert.equal(options.headers.apikey,'test-server-key');
  if(url.includes('/rpc/')){const b=JSON.parse(options.body);assert.match(b.p_client_hash,/^[a-f0-9]{64}$/);assert(!JSON.stringify(b).includes('127.0.0.1'));if(rate)return new Response(JSON.stringify({code:'P0001'}),{status:400});entries.push({id:'test-id',nickname:b.p_nickname,message:b.p_message,created_at:new Date().toISOString()});return new Response('',{status:200});}
  return new Response(JSON.stringify(entries),{status:200});
 });
 const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;process.env.PORT=String(server.address().port);
 const post=(body,origin=base)=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
 try{assert.equal((await fetch(base)).status,503);process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_SECRET_KEY='test-server-key';
 assert.equal((await post({nickname:'Hi',message:'Hello'},'https://evil.test')).status,403);
 assert.equal((await post({nickname:'',message:'Hello'})).status,400);
 assert.equal((await post({nickname:'A',message:'x'.repeat(601)})).status,400);
 assert.equal((await post({nickname:'A',message:'Hello',website:'spam'})).status,400);
 assert.equal((await post({nickname:'Visitor',message:'<script>alert(1)</script> 你好 Spark'})).status,201);
 const list=await(await fetch(base)).json();assert.equal(list.messages.length,1);assert.equal(list.messages[0].nickname,'Visitor');assert(!JSON.stringify(list).includes('test-server-key'));
 rate=true;assert.equal((await post({nickname:'A',message:'Again'})).status,429);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));for(const key of ['PORT','SUPABASE_URL','SUPABASE_SECRET_KEY']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});

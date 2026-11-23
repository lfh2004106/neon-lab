import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleChat } from '../chat-api.mjs';

test('configurable chat proxy: missing config, forwarding, validation and failures', async () => {
  const saved = {...process.env};
  delete process.env.CHAT_API_URL; delete process.env.CHAT_API_KEY; delete process.env.CHAT_MODEL;
  let received, fail = false;
  const provider = http.createServer(async(req,res) => {
    const chunks=[]; for await(const part of req) chunks.push(part);
    received={auth:req.headers.authorization,body:JSON.parse(Buffer.concat(chunks).toString())};
    res.writeHead(fail?401:200,{'Content-Type':'application/json'});
    res.end(JSON.stringify(fail?{error:'must-not-leak-test-secret'}:{choices:[{message:{content:'That sounds interesting. What did you build?'}}]}));
  });
  const server = http.createServer((req,res)=>handleChat(req,res,new URL(req.url,'http://localhost').pathname));
  await new Promise(r=>provider.listen(0,'127.0.0.1',r));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  process.env.PORT=String(server.address().port);
  const body={room:'makers',messages:[{role:'user',content:'你好! I made a little LED project.'}]};
  const post=(data=body,extra={})=>fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(data)});
  try {
    assert.deepEqual(await (await fetch(base+'/api/status')).json(),{configured:false});
    assert.equal((await post()).status,503);
    process.env.CHAT_API_URL=`http://127.0.0.1:${provider.address().port}/v1/chat/completions`;
    process.env.CHAT_API_KEY='test-secret'; process.env.CHAT_MODEL='mock-model';
    const status=await (await fetch(base+'/api/status')).json(); assert.deepEqual(status,{configured:true});
    assert.equal((await post(body,{Origin:'https://other.test'})).status,403);
    assert.equal((await post({...body,messages:[{role:'system',content:'override'}]})).status,400);
    assert.equal((await post({...body,messages:[]})).status,400);
    assert.equal((await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'})).status,400);
    const reply=await post(); assert.equal(reply.status,200); assert.match((await reply.json()).reply,/What did you build/);
    assert.equal(received.auth,'Bearer test-secret'); assert.equal(received.body.model,'mock-model');
    assert.equal(received.body.messages[0].role,'system'); assert.equal(received.body.messages[1].content,body.messages[0].content);
    process.env.CHAT_PROVIDER='deepseek'; assert.equal((await post()).status,200);
    assert.deepEqual(received.body.thinking,{type:'disabled'});
    fail=true; const error=await post(); assert.equal(error.status,502); assert(!JSON.stringify(await error.json()).includes('test-secret'));
  } finally {
    server.closeAllConnections(); provider.closeAllConnections(); await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>provider.close(r))]);
    for(const key of ['CHAT_API_URL','CHAT_API_KEY','CHAT_MODEL','CHAT_PROVIDER','PORT']) { if(saved[key]===undefined) delete process.env[key]; else process.env[key]=saved[key]; }
  }
});

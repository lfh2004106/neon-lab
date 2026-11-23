import { createHmac } from 'node:crypto';
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function config(){try{const u=new URL(process.env.SUPABASE_URL);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)return null;const key=process.env.SUPABASE_SECRET_KEY;return key?{base:u.origin,key}:null;}catch{return null;}}
export function createGuestbookHandler(fetcher=fetch){return async function handleGuestbook(req,res){
 if(!['GET','POST'].includes(req.method)){json(res,405,{error:'不支持此操作。'});return;}
 const c=config();if(!c){json(res,503,{error:'留言板尚未开放，Spark 正在整理这个小角落。'});return;}
 const headers={apikey:c.key,'Content-Type':'application/json'};if(c.key.startsWith('eyJ'))headers.Authorization=`Bearer ${c.key}`;
 try{
  if(req.method==='GET'){
   const r=await fetcher(c.base+'/rest/v1/spark_guestbook?select=id,nickname,message,created_at&is_public=eq.true&order=created_at.desc&limit=50',{headers,signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error();const messages=await r.json();if(!Array.isArray(messages))throw Error();json(res,200,{messages});return;
  }
  const allowed=new Set([`http://127.0.0.1:${process.env.PORT||4177}`,`http://localhost:${process.env.PORT||4177}`,...(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean),process.env.RENDER_EXTERNAL_URL,process.env.SITE_URL].filter(Boolean));
  if(!allowed.has(req.headers.origin)){json(res,403,{error:'请从本站页面提交留言。'});return;}
  if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'请求格式不正确。'});return;}
  let bytes=0;const parts=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>6000){json(res,413,{error:'留言太长了。'});return;}parts.push(chunk);}
  let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{json(res,400,{error:'请求格式不正确。'});return;}
  const nickname=typeof body?.nickname==='string'?body.nickname.trim():'';const message=typeof body?.message==='string'?body.message.trim():'';
  if(body?.website||!nickname||nickname.length>24||!message||message.length>600||/[\u0000-\u001f]/.test(nickname)){json(res,400,{error:'请填写 1–24 字昵称与 1–600 字留言。'});return;}
  const forwarded=process.env.RENDER==='true'?String(req.headers['x-forwarded-for']||'').split(',').at(-1)?.trim():'';
  const address=forwarded||req.socket.remoteAddress||'unknown';const client=createHmac('sha256',c.key).update(address).digest('hex');
  const r=await fetcher(c.base+'/rest/v1/rpc/spark_add_guest_message',{method:'POST',headers,signal:AbortSignal.timeout(10000),body:JSON.stringify({p_nickname:nickname,p_message:message,p_client_hash:client})});
  if(!r.ok){let data;try{data=await r.json();}catch{}if(data?.code==='P0001'){json(res,429,{error:'留言太频繁了，请稍等一分钟再来。'});return;}throw Error();}
  json(res,201,{ok:true});
 }catch{json(res,502,{error:'留言板暂时没连上，你写的内容还在，请稍后重试。'});}
};}
export const handleGuestbook=createGuestbookHandler();

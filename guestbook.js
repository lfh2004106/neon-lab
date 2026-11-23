(()=>{
 const form=document.querySelector('#guest-form'),status=document.querySelector('#guest-status'),list=document.querySelector('#guest-list'),submit=document.querySelector('#guest-submit');let posting=false;
 const input=document.querySelector("#guest-text"),nickname=document.querySelector("#guest-name");const count=document.createElement("span");count.className="guest-count";input.after(count);function update(){count.textContent=input.value.length+" / 600";}input.addEventListener("input",update);update();try{nickname.value=localStorage.getItem("spark:guest-nickname")||"";}catch{}
 async function load(){
  try{const r=await fetch('./api/guestbook',{signal:AbortSignal.timeout(12000)});let data;try{data=await r.json();}catch{throw Error('请在完整网站打开留言板，静态镜像暂不支持留言。');}if(!r.ok)throw Error(data.error||'暂时无法读取留言。');list.replaceChildren();
   if(!data.messages.length){const p=document.createElement('p');p.className='quiet';p.textContent='还没有留言。来做第一个打招呼的人吧。';list.append(p);}
   for(const m of data.messages){const article=document.createElement('article');article.className='guest-note';const head=document.createElement('header');const name=document.createElement('strong');name.textContent=m.nickname;const time=document.createElement('time');time.dateTime=m.created_at;time.textContent=new Date(m.created_at).toLocaleDateString('zh-CN');const text=document.createElement('p');text.textContent=m.message;head.append(name,time);article.append(head,text);list.append(article);}return true;
  }catch(error){status.textContent=error.name==='TimeoutError'?'连接超时，请稍后刷新。':error.message;return false;}
 }
 form.addEventListener('submit',async e=>{e.preventDefault();if(posting)return;posting=true;submit.disabled=true;status.textContent='正在送出你的留言……';
  try{const r=await fetch('./api/guestbook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:document.querySelector('#guest-name').value,message:document.querySelector('#guest-text').value,website:form.elements.website.value}),signal:AbortSignal.timeout(15000)});let data;try{data=await r.json();}catch{throw Error('留言服务不可用，请在完整网站重试。');}if(!r.ok)throw Error(data.error||'提交失败。');document.querySelector('#guest-text').value='';update();try{localStorage.setItem('spark:guest-nickname',nickname.value);}catch{}status.textContent='留言已送达，谢谢你来过。';if(!await load())status.textContent='留言已提交，列表暂时未刷新，请勿重复发送。';
  }catch(error){status.textContent=(error.name==='TimeoutError'?'提交结果暂时无法确认，请先刷新列表检查，再决定是否重试。':error.message)+' 输入已保留。';}finally{posting=false;submit.disabled=false;}
 });
 document.querySelector('#refresh-board').addEventListener('click',async()=>{if(await load())status.textContent='留言已刷新。';});
 load().then(ok=>{if(ok)status.textContent='写一点小事，或分享一个有趣的发现。';});
})();

document.querySelectorAll('[data-resources]').forEach(async container=>{
 try {
  const data=await window.SparkContent.readJSON('./data/resources.json');const items=data[container.dataset.resources];if(!Array.isArray(items))throw Error();
  const fragment=document.createDocumentFragment();
  if(!items.length){const p=document.createElement('p');p.className='quiet';p.textContent='这个书架正在慢慢填满，精选收藏很快见。';fragment.append(p);}
  for(const item of items){const url=new URL(item.url,location.href);const localLink=location.protocol==='file:'&&url.protocol==='file:'&&/^\.\/(?![./\\])/.test(item.url);if(!['https:','http:'].includes(url.protocol)&&!localLink)continue;const a=document.createElement('a');a.className='resource-item';a.href=url.href;const title=document.createElement('h3');title.textContent=item.title;const description=document.createElement('p');description.textContent=item.description;const tag=document.createElement('small');tag.textContent=item.tag||'收藏';a.append(tag,title,description);fragment.append(a);}
  container.replaceChildren(fragment);
 }catch{if(!container.querySelector('.resource-item'))container.textContent='书签暂时没打开，请通过网站网址访问后刷新。';}
});
const journal=document.querySelector('#journal-list');if(journal)(async()=>{try{const posts=(await window.SparkContent.readJSON('./posts/index.json')).filter(post=>!post.parent);journal.replaceChildren();for(const post of posts){const a=document.createElement('a');a.className='resource-item';a.href='./blog.html#post/'+encodeURIComponent(post.slug);const date=document.createElement('small');date.textContent=post.date;const h=document.createElement('h3');h.textContent=post.title;const p=document.createElement('p');p.textContent=post.summary;a.append(date,h,p);journal.append(a);}if(!posts.length)journal.textContent='第一篇实验记录正在路上。';}catch{journal.textContent='日志暂未加载，请通过下方入口查看。';}})();

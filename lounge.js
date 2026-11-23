'use strict';
const rooms = {
  coffee: { title: 'Night Café', description: 'Slow down. Tell us about your day.', starter: 'What was the best part of your day?', messages: [['A', '示例角色 Alex', 'Hey! What’s one small thing you learned today?'], ['J', '示例角色 Jamie', 'I finally made an LED blink. A small win, but it felt great.']], hint: '可以聊一个小收获，再问问对方今天的经历。' },
  makers: { title: 'Maker Talk', description: 'Small projects. Big conversations.', starter: "I'm working on a small project. Would you like to hear about it?", messages: [['A', '示例角色 Alex', 'What are you building at the moment?'], ['J', '示例角色 Jamie', 'A little room sensor. I’m still figuring out how to display the readings.']], hint: '尝试说明项目目标，以及你还在探索的部分。' },
  exchange: { title: 'Language Exchange', description: 'Different languages. Shared curiosity.', starter: "I'm practicing English. What language are you learning?", messages: [['J', '示例角色 Jamie', 'How would you describe your favorite hobby in English?'], ['A', '示例角色 Alex', 'I enjoy making things and learning how they work. What about you?']], hint: '先介绍兴趣，再邀请对方分享。示例角色不是真实在线用户。' }
};
let currentRoom = 'coffee';
let chatMode = 'local';
let sending = false;
const aiHistory = { coffee: [], makers: [], exchange: [] };
function setBusy(value) {
 sending = value;
 document.querySelectorAll('[data-room], #chat-mode, #new-chat, #send-chat').forEach(node => { node.disabled = value; });
 $('#chat-input').readOnly = value;
 $('#send-chat').textContent = value ? '正在回复…' : chatMode === 'ai' ? '发送给 AI' : '加入练习记录';
}
let practiceLog = {};
try {
  const saved = JSON.parse(storage.get('practice-log') || '{}');
  if (saved && typeof saved === 'object') for (const key of Object.keys(rooms)) {
    practiceLog[key] = Array.isArray(saved[key]) ? saved[key].filter(value => typeof value === 'string').slice(-50).map(value => value.slice(0,1500)) : [];
  }
} catch { /* A malformed local draft should not break the interface. */ }
const roomDrafts = {};
function addMessage(initial, name, text, self = false) {
  const message = document.createElement('div');
  message.className = `message${self ? ' self' : ''}`;
  const avatar = document.createElement('span'); avatar.className = 'message-avatar'; avatar.textContent = initial; avatar.setAttribute('aria-hidden','true');
  if(initial === 'AI') { avatar.classList.add('ai-portrait'); avatar.textContent = ''; }
  const content = document.createElement('div');
  const meta = document.createElement('p'); meta.className = 'message-meta'; meta.textContent = name;
  const bubble = document.createElement('div'); bubble.className = 'message-bubble'; bubble.textContent = text;
  content.append(meta, bubble); message.append(avatar,content); $('#message-log').append(message);
}
function renderRoom() {
  const room = rooms[currentRoom];
  $('#room-title').textContent = room.title;
  $('#room-description').textContent = room.description;
  $('#room-starter').textContent = room.starter;
  $('#message-log').replaceChildren();
  if (chatMode === 'ai') {
    if (!aiHistory[currentRoom].length) addMessage('AI','对话提示','这里是 AI 英语伙伴。发送一句问候，开始真实的模型对话。');
    for (const m of aiHistory[currentRoom]) addMessage(m.role === 'user' ? 'ME' : 'AI',m.role === 'user' ? '我' : 'AI 英语伙伴',m.content,m.role === 'user');
    $('#chat-input').value = roomDrafts[currentRoom] || '';
    $('#chat-status').textContent = '发送后，本房间最近的对话将交给你配置的 API 服务商；刷新后 AI 记录清空。';
    $('#message-log').scrollTop = $('#message-log').scrollHeight;
    return;
  }
  for (const message of room.messages) addMessage(...message);
  const hint = document.createElement('p'); hint.className = 'message translation-note'; hint.textContent = room.hint; $('#message-log').append(hint);
  for (const message of practiceLog[currentRoom] || []) addMessage('ME','我的本地练习',message,true);
  $('#chat-input').value = roomDrafts[currentRoom] || '';
  $('#chat-status').textContent = '仅本地练习，不会发送给其他人。';
  $('#message-log').scrollTop = $('#message-log').scrollHeight;
}
document.querySelectorAll('[data-room]').forEach(button => button.addEventListener('click', () => {
  roomDrafts[currentRoom] = $('#chat-input').value;
  currentRoom = button.dataset.room;
  document.querySelectorAll('[data-room]').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed',String(item === button)); });
  renderRoom();
}));
$('#use-starter').addEventListener('click', () => {
  const input = $('#chat-input');
  if (input.value.trim()) { $('#chat-status').textContent = '已保留正在写的回复；开场句可在右侧查看。'; }
  else { input.value = rooms[currentRoom].starter; $('#chat-status').textContent = '可以修改这句开场，再加入练习记录。'; }
  input.focus();
});
$('#chat-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('#chat-input').value.trim();
  if (!text) { $('#chat-status').textContent = '请先写一句回复。'; return; }
  if (sending) return;
  if (chatMode === 'ai') {
    if (location.protocol === 'file:') { $('#chat-status').textContent = '请通过 node server.mjs 启动，并从本地网址打开页面。'; return; }
    const room = currentRoom;
    const messages = [...aiHistory[room].slice(-10).map(m => ({...m,content:m.content.slice(0,2000)})), { role:'user', content:text }];
    addMessage('ME','我 · 等待回复',text,true);
    $('#message-log').scrollTop = $('#message-log').scrollHeight;
    setBusy(true);
    $('#chat-status').textContent = '正在等待 AI 回复…';
    try {
      const response = await fetch('./api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room,messages}),signal:AbortSignal.timeout(35000)});
      let data; try { data = await response.json(); } catch { throw new Error('当前托管不支持聊天后端，请通过本地 Node 服务打开。'); }
      if (!response.ok || typeof data.reply !== 'string') throw new Error(data.error || '暂时未收到有效回复。');
      aiHistory[room] = [...messages,{role:'assistant',content:data.reply}];
      roomDrafts[room] = '';
      renderRoom();
      $('#chat-status').textContent = 'AI 已回复。对话仅在本次页面会话中保留。';
    } catch(error) {
      roomDrafts[room] = text; renderRoom();
      $('#chat-status').textContent = (error.name === 'TimeoutError' ? '等待超时，请重试。' : error.message) + ' 你的输入已保留。';
    } finally { setBusy(false); $('#chat-input').focus(); }
    return;
  }
  practiceLog[currentRoom] = [...(practiceLog[currentRoom] || []), text].slice(-50);
  const saved = storage.set('practice-log',JSON.stringify(practiceLog));
  roomDrafts[currentRoom] = '';
  renderRoom();
  $('#chat-status').textContent = saved ? '已保存本地练习。这里不会收到真人或 AI 回复。' : '已加入本次练习，但浏览器未能保存；刷新后可能丢失。';
  $('#chat-input').focus();
});
$('#message-log').tabIndex = 0;
renderRoom();

$('#chat-mode').addEventListener('change', async () => {
 roomDrafts[currentRoom] = $('#chat-input').value;
 chatMode = $('#chat-mode').value;
 $('#new-chat').hidden = chatMode !== 'ai';
 renderRoom(); setBusy(false);
 if (chatMode === 'ai' && location.protocol !== 'file:') {
   try { const r=await fetch('./api/status'); const data=await r.json(); if(chatMode === 'ai' && !sending) $('#chat-status').textContent = data.configured ? 'API 配置已就绪；发送时会将本房间上下文交给服务商。' : 'API 尚未配置。在本地 .env 填好地址、密钥和模型后重启服务。'; } catch { if(chatMode === 'ai' && !sending) $('#chat-status').textContent='聊天后端不可用，请通过 Node 服务打开。'; }
 }
});
$('#new-chat').hidden = true;
$('#new-chat').addEventListener('click', () => { aiHistory[currentRoom] = []; roomDrafts[currentRoom] = ''; renderRoom(); });

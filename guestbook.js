(() => {
  const form = document.querySelector('#guest-form');
  const status = document.querySelector('#guest-status');
  const list = document.querySelector('#guest-list');
  const submit = document.querySelector('#guest-submit');
  const input = document.querySelector('#guest-text');
  const nickname = document.querySelector('#guest-name');
  const MAX_VISIBLE = 12;
  let posting = false;

  const count = document.createElement('span');
  count.className = 'guest-count';
  input.after(count);
  function updateCount() { count.textContent = `${input.value.length} / 600`; }
  input.addEventListener('input', updateCount);
  updateCount();

  try { nickname.value = localStorage.getItem('spark:guest-nickname') || ''; } catch {}

  function emptyState(text) {
    const p = document.createElement('p');
    p.className = 'quiet guest-empty';
    p.textContent = text;
    list.replaceChildren(p);
  }

  function trimForArc(text) {
    return text.length > 96 ? `${text.slice(0, 96)}…` : text;
  }

  function addMessage(message, isNew = false) {
    const empty = list.querySelector('.guest-empty');
    if (empty) empty.remove();
    const article = document.createElement('article');
    article.className = `guest-note${isNew ? ' guest-note--new' : ''}`;
    article.style.setProperty('--lane', `${12 + Math.random() * 68}%`);
    article.style.setProperty('--duration', `${16 + Math.random() * 11}s`);
    article.style.setProperty('--delay', isNew ? '0s' : `${Math.random() * 5}s`);
    article.title = `${message.nickname}：${message.message}`;
    article.setAttribute('aria-label', `${message.nickname}：${message.message}`);

    const header = document.createElement('header');
    const name = document.createElement('strong');
    name.textContent = message.nickname;
    const time = document.createElement('time');
    time.dateTime = message.created_at;
    time.textContent = new Date(message.created_at).toLocaleDateString('zh-CN');
    header.append(name, time);

    const text = document.createElement('p');
    text.textContent = trimForArc(message.message);
    article.append(header, text);
    list.append(article);

    const notes = list.querySelectorAll('.guest-note');
    if (notes.length > MAX_VISIBLE) notes[0].remove();
  }

  async function load() {
    try {
      const response = await fetch('./api/guestbook', { signal: AbortSignal.timeout(12000) });
      let data;
      try { data = await response.json(); }
      catch { throw new Error('请在完整网站打开留言板，静态镜像暂不支持留言。'); }
      if (!response.ok) throw new Error(data.error || '暂时无法读取留言。');
      if (!Array.isArray(data.messages)) throw new Error('留言数据格式不正确。');
      list.replaceChildren();
      if (!data.messages.length) {
        emptyState('还没有留言。来做第一个打招呼的人吧。');
      } else {
        for (const message of data.messages.slice(0, MAX_VISIBLE)) addMessage(message);
      }
      return true;
    } catch (error) {
      emptyState('留言板暂时没有亮起来。');
      status.textContent = error.name === 'TimeoutError' ? '连接超时，请稍后刷新。' : error.message;
      return false;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (posting) return;
    const text = input.value.trim();
    const name = nickname.value.trim();
    if (!text || !name) {
      status.textContent = '请先写下昵称和一句话。';
      return;
    }

    posting = true;
    submit.disabled = true;
    status.textContent = '正在把你的话变成一束光……';
    try {
      const response = await fetch('./api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: name, message: text, website: form.elements.website.value }),
        signal: AbortSignal.timeout(15000)
      });
      let data;
      try { data = await response.json(); }
      catch { throw new Error('留言服务不可用，请在完整网站重试。'); }
      if (!response.ok) throw new Error(data.error || '提交失败。');

      addMessage({ nickname: name, message: text, created_at: new Date().toISOString() }, true);
      input.value = '';
      updateCount();
      try { localStorage.setItem('spark:guest-nickname', name); } catch {}
      status.textContent = '你的话已经变成一束光。谢谢你来过。';
      list.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      status.textContent = `${error.name === 'TimeoutError'
        ? '提交结果暂时无法确认，请先刷新检查，再决定是否重试。'
        : error.message} 输入已保留。`;
    } finally {
      posting = false;
      submit.disabled = false;
    }
  });

  document.querySelector('#refresh-board').addEventListener('click', async () => {
    if (await load()) status.textContent = '留言已刷新，光弧重新出发。';
  });

  load().then((ok) => {
    if (ok) status.textContent = '写下的话，会变成一束光飘过。';
  });
})();

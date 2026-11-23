'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  posts: [],
  tag: '全部',
  activeSlug: null
};

const isLocalServer = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname) && /^https?:$/.test(location.protocol);

/* ---------------- Markdown ---------------- */

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeUrl(value) {
  const url = String(value).trim();
  if (/^(https?:|mailto:|#)/i.test(url)) return url;
  if (/^[./\w-]/.test(url)) return url;
  return '#';
}

function inline(raw) {
  const codes = [];
  let output = String(raw).replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@CODE${codes.length}@@`;
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  output = escapeHtml(output);

  output = output.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_match, alt, src, title) => {
    const caption = title ? ` title="${title}"` : '';
    return `<img src="${escapeHtml(safeUrl(src))}" alt="${alt}"${caption}>`;
  });

  output = output.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_match, label, href, title) => {
    const caption = title ? ` title="${title}"` : '';
    return `<a href="${escapeHtml(safeUrl(href))}"${caption} rel="noreferrer">${label}</a>`;
  });

  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/(^|[^\w])\*([^*\n]+)\*(?=\W|$)/g, '$1<em>$2</em>');

  for (let i = 0; i < codes.length; i += 1) {
    output = output.replace(`@@CODE${i}@@`, codes[i]);
  }
  return output;
}

function splitRow(row) {
  return row
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderMarkdown(source) {
  const codeBlocks = [];
  let text = String(source).replace(/\r\n/g, '\n');

  text = text.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_match, language, code) => {
    const token = `@@BLOCK${codeBlocks.length}@@`;
    const lang = language.trim();
    const className = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    codeBlocks.push(`<pre><code${className}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
    return `\n${token}\n`;
  });

  const lines = text.split('\n');
  const output = [];
  let index = 0;

  const isBlank = (line) => !line.trim();
  const isBlockStart = (line) => /^(#{1,4})\s+/.test(line) || /^>\s?/.test(line) || /^\s*([-*]|\d+\.)\s+/.test(line) || /^---+$/.test(line.trim()) || /^@@BLOCK\d+@@$/.test(line.trim());

  while (index < lines.length) {
    const line = lines[index];

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    if (/^@@BLOCK\d+@@$/.test(line.trim())) {
      output.push(line.trim());
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      output.push('<hr>');
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      output.push(`<blockquote>${quote.map((part) => `<p>${inline(part)}</p>`).join('')}</blockquote>`);
      continue;
    }

    if (line.includes('|') && index + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[index + 1])) {
      const header = splitRow(line);
      const separator = splitRow(lines[index + 1]);
      if (separator.length === header.length && separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        index += 2;
        const body = [];
        while (index < lines.length && lines[index].includes('|') && !isBlank(lines[index])) {
          body.push(splitRow(lines[index]));
          index += 1;
        }
        output.push(
          `<table><thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>` +
          `<tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
        );
        continue;
      }
    }

    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    if (unordered) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*[-*]\s+(.*)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      output.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
      continue;
    }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ordered) {
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*\d+\.\s+(.*)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && !isBlank(lines[index]) && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }

  let html = output.join('\n');
  for (let i = 0; i < codeBlocks.length; i += 1) {
    html = html.replace(`@@BLOCK${i}@@`, codeBlocks[i]);
  }
  return html;
}

function formatDate(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : String(value);
}

function readingTime(body) {
  const plain = body.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`|[\]()_-]/g, ' ');
  const chinese = (plain.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (plain.match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.ceil(chinese / 350 + words / 180));
}

/* ---------------- List ---------------- */

function renderTags() {
  const tags = [...new Set(state.posts.flatMap((post) => post.tags || []))];
  const all = ['全部', ...tags];
  $('#tag-filter').replaceChildren(
    ...all.map((tag) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = tag;
      button.className = tag === state.tag ? 'active' : '';
      button.setAttribute('aria-pressed', String(tag === state.tag));
      button.addEventListener('click', () => {
        state.tag = tag;
        renderTags();
        renderList();
      });
      return button;
    })
  );
}

function renderList() {
  const list = $('#post-list');
  const posts = state.tag === '全部' ? state.posts : state.posts.filter((post) => (post.tags || []).includes(state.tag));

  if (!posts.length) {
    list.innerHTML = '<p class="blog-empty">这个标签下还没有日志。完成一次练习后，写第一篇吧。</p>';
    return;
  }

  list.innerHTML = posts.map((post) => {
    const cover = post.cover ? `<img src="${escapeHtml(safeUrl(post.cover))}" alt="" loading="lazy">` : '';
    const tags = (post.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    return `<article class="post-card">
      <a class="post-cover" href="#post/${encodeURIComponent(post.slug)}" aria-label="阅读 ${escapeHtml(post.title)}">${cover}</a>
      <div class="post-body">
        <p class="post-date">${formatDate(post.date)} / FIELD NOTE</p>
        <div class="post-tags">${tags}</div>
        <h3><a href="#post/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h3>
        <p class="post-summary">${escapeHtml(post.summary || '')}</p>
        <a class="post-link" href="#post/${encodeURIComponent(post.slug)}">阅读全文 →</a>
      </div>
    </article>`;
  }).join('');
}

/* ---------------- Reader ---------------- */

async function openPost(slug) {
  const reader = $('#reader');
  document.body.classList.add('reading');
  reader.hidden = false;
  state.activeSlug = slug;
  $('#reader-title').textContent = '加载中……';
  $('#reader-date').textContent = '';
  $('#reader-summary').textContent = '';
  $('#reader-tags').replaceChildren();
  $('#reader-content').innerHTML = '<p>正在读取日志……</p>';
  $('#reader-cover').hidden = true;

  try {
    const response = await fetch(`./posts/${encodeURIComponent(slug)}.md`, { cache: 'no-store' });
    if (!response.ok) throw new Error('找不到这篇日志。');
    const source = await response.text();
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    const meta = state.posts.find((post) => post.slug === slug) || {};
    const title = meta.title || slug;

    $('#reader-title').textContent = title;
    $('#reader-date').textContent = `${formatDate(meta.date)} / ${readingTime(body)} MIN READ`;
    $('#reader-summary').textContent = meta.summary || '';
    $('#reader-tags').innerHTML = (meta.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');

    if (meta.cover) {
      $('#reader-cover-image').src = safeUrl(meta.cover);
      $('#reader-cover').hidden = false;
    } else {
      $('#reader-cover').hidden = true;
    }

    $('#reader-content').innerHTML = renderMarkdown(body);
    document.title = `${title} · NEON LAB`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    $('#reader-title').textContent = '日志读取失败';
    $('#reader-content').innerHTML = `<p>${escapeHtml(error.message)}</p><p>如果直接双击打开页面，浏览器会阻止读取 Markdown。请运行 <code>node server.mjs</code> 后通过本地网址访问。</p>`;
  }
}

function showList() {
  document.body.classList.remove('reading');
  $('#reader').hidden = true;
  state.activeSlug = null;
  document.title = '实验日志 · NEON LAB';
}

function route() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (hash.startsWith('post/')) {
    openPost(hash.slice(5));
    return;
  }
  showList();
  if (hash === 'compose') {
    requestAnimationFrame(() => $('#compose').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

/* ---------------- Compose ---------------- */

function readForm() {
  return {
    title: $('#post-title').value.trim(),
    date: $('#post-date').value,
    tags: $('#post-tags').value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
    summary: $('#post-summary').value.trim(),
    body: $('#post-body').value.trim()
  };
}

function postMarkdown(post) {
  const tags = post.tags.map((tag) => JSON.stringify(tag)).join(', ');
  return [
    '---',
    `title: ${JSON.stringify(post.title)}`,
    `date: ${post.date}`,
    `tags: [${tags}]`,
    ...(post.summary ? [`summary: ${JSON.stringify(post.summary)}`] : []),
    '---',
    '',
    post.body,
    ''
  ].join('\n');
}

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'post';
}

function setComposeStatus(message) {
  $('#compose-status').textContent = message;
}

function downloadPost() {
  const post = readForm();
  if (!post.title || !post.body) {
    setComposeStatus('先填写标题和正文，再下载。');
    return;
  }
  const filename = `${post.date || new Date().toISOString().slice(0, 10)}-${slugify(post.title)}.md`;
  const blob = new Blob([postMarkdown(post)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setComposeStatus(`已下载 ${filename}。把它放进 posts/，运行 node scripts/build-posts.mjs，然后提交到 GitHub。`);
}

async function publishPost() {
  const post = readForm();
  if (!post.title || !post.body) {
    setComposeStatus('先填写标题和正文，再发布。');
    return;
  }
  if (!isLocalServer) {
    downloadPost();
    setComposeStatus('当前是静态页面，已改为下载 Markdown。提交到 GitHub 后朋友才能看到。');
    return;
  }

  const button = $('#publish-post');
  button.disabled = true;
  setComposeStatus('正在写入 posts/ 并更新索引……');
  try {
    const response = await fetch('./api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.slug) throw new Error(data.error || '本地发布失败。');
    await loadPosts();
    setComposeStatus('已发布到本地。刷新页面即可看到，提交 GitHub 后线上也会出现。');
    location.hash = `#post/${encodeURIComponent(data.slug)}`;
  } catch (error) {
    setComposeStatus(`${error.message} 你可以改用「下载 Markdown」。`);
  } finally {
    button.disabled = false;
  }
}

/* ---------------- Init ---------------- */

async function loadPosts() {
  const list = $('#post-list');
  try {
    const response = await fetch('./posts/index.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取日志索引。');
    const data = await response.json();
    state.posts = Array.isArray(data) ? data : [];
    renderTags();
    renderList();
  } catch (error) {
    state.posts = [];
    $('#tag-filter').replaceChildren();
    list.innerHTML = '<p class="blog-empty">还没有加载到日志。请通过 <code>node server.mjs</code> 启动本地服务，或确认 posts/index.json 已生成。</p>';
  }
}

$('#post-date').value = new Date().toLocaleDateString('sv-SE');
$('#preview-post').addEventListener('click', () => {
  const post = readForm();
  if (!post.title || !post.body) {
    setComposeStatus('先填写标题和正文，再预览。');
    return;
  }
  $('#preview-title').textContent = post.title;
  $('#preview-content').innerHTML = renderMarkdown(post.body);
  $('#compose-preview').hidden = false;
  $('#compose-preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#download-post').addEventListener('click', downloadPost);
$('#compose-form').addEventListener('submit', (event) => {
  event.preventDefault();
  publishPost();
});

if (!isLocalServer) {
  $('#publish-post').hidden = true;
}

window.addEventListener('hashchange', route);
loadPosts().then(() => {
  route();
});

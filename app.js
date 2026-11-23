'use strict';

const $ = (selector) => document.querySelector(selector);
const storage = {
  get(key) { try { return localStorage.getItem(`neon-lab:${key}`); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(`neon-lab:${key}`, value); return true; } catch { return false; } }
};

$('#toggle-blink')?.addEventListener('click', () => {
  const running = $('#led').classList.toggle('is-running');
  $('#toggle-blink').setAttribute('aria-pressed', String(running));
  $('#toggle-blink').textContent = running ? '暂停闪烁' : '开始闪烁';
});
$('#speed')?.addEventListener('change', (event) => {
  const delay = Number(event.target.value);
  $('#led').style.animationDuration = `${delay * 2}ms`;
  $('#delay-value').textContent = String(delay);
});

document.querySelectorAll('[data-filter]').forEach(button => {
  button?.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-category]').forEach(project => {
      project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter;
    });
  });
});

const projects = {
  blink: { title: '第一束光 / Blink', description: '选题模板：记录一次 LED 闪烁实验，以及改变等待时间后观察到的现象。', intro: "I'm building an LED project with Arduino. It can…" },
  sensor: { title: '感知房间 / Room Sense', description: '选题模板：选定一种环境传感器，记录数据读取、展示和验证过程。', intro: "I'm building a room sensor. It can measure…" },
  display: { title: '口袋终端 / Pocket UI', description: '选题模板：用小屏幕展示信息，记录显示效果和交互设计。', intro: "I'm building a small display for…" }
};
let selectedProject = projects.blink;
let selectedProjectKey = "blink";
document.querySelectorAll('[data-project]').forEach(button => {
  button?.addEventListener('click', () => {
    selectedProjectKey = button.dataset.project;
    selectedProject = projects[selectedProjectKey];
    $('#dialog-title').textContent = selectedProject.title;
    $('#dialog-description').textContent = selectedProject.description;
    $('#project-dialog').showModal();
  });
});
$('.close')?.addEventListener('click', () => $('#project-dialog').close());
$('#use-project')?.addEventListener('click', () => {
  window.location.href = './english.html?project=' + encodeURIComponent(selectedProjectKey) + '#english';
});

const phrases = [
  ["I'm learning Arduino, and this is my first LED project.", '我正在学习 Arduino，这是我的第一个 LED 项目。'],
  ['I changed the delay to make the LED blink faster.', '我改变了等待时间，让 LED 闪烁得更快。'],
  ['Could you suggest a clearer way to explain my project?', '你能建议一种更清楚地介绍我的项目的方式吗？']
];
let phraseIndex = 0;
$('#translate')?.addEventListener('click', () => {
  const show = $('#translation').hidden;
  $('#translation').hidden = !show;
  $('#translate').textContent = show ? '隐藏中文' : '显示中文';
  $('#translate').setAttribute('aria-expanded', String(show));
});
$('#next-phrase')?.addEventListener('click', () => {
  phraseIndex = (phraseIndex + 1) % phrases.length;
  $('#phrase').textContent = `“${phrases[phraseIndex][0]}”`;
  $('#translation').textContent = phrases[phraseIndex][1];
});
if ($('#intro')) {
  $('#intro').value = storage.get('intro') || '';
  const projectKey = new URLSearchParams(window.location.search).get('project');
  if (Object.hasOwn(projects, projectKey)) {
    if (!$('#intro').value.trim()) {
      $('#intro').value = projects[projectKey].intro;
      $('#intro-status').textContent = '已带入项目开场，编辑后保存。';
    } else {
      $('#intro-status').textContent = '已保留你原来的练习草稿，可围绕新项目继续修改。';
    }
  }
}
$('#intro')?.addEventListener('input', () => { $('#intro-status').textContent = '有未保存的修改'; });
$('#save-intro')?.addEventListener('click', () => {
  const saved = storage.set('intro', $('#intro').value);
  $('#intro-status').textContent = saved ? '已保存到当前浏览器' : '浏览器无法保存，请手动复制练习内容。';
});

try {
  const draft = JSON.parse(storage.get('topic') || 'null');
  if ($('#topic-form') && draft && typeof draft === 'object') {
    if (typeof draft.channel === 'string' && [...$('#topic-channel').options].some(option => option.value === draft.channel)) $('#topic-channel').value = draft.channel;
    if (typeof draft.title === 'string') $('#topic-title').value = draft.title;
    if (typeof draft.body === 'string') $('#topic-body').value = draft.body;
  }
} catch { /* Invalid local data must not prevent use of the page. */ }
$('#topic-form')?.addEventListener('input', () => { $('#topic-status').textContent = '有未保存的修改；草稿不会公开发布。'; });
$('#topic-form')?.addEventListener('submit', event => {
  event.preventDefault();
  if (!$('#topic-title').value.trim() || !$('#topic-body').value.trim()) {
    $('#topic-status').textContent = '请输入有效的话题标题和内容。';
    return;
  }
  const saved = storage.set('topic', JSON.stringify({ channel: $('#topic-channel').value, title: $('#topic-title').value, body: $('#topic-body').value }));
  $('#topic-status').textContent = saved ? '话题已保存到当前浏览器，尚未发布。' : '本地保存失败，你仍可导出 Markdown。';
});
$('#export-topic')?.addEventListener('click', () => {
  if (!$('#topic-title').value.trim() || !$('#topic-body').value.trim()) {
    $('#topic-status').textContent = '请先填写话题标题和内容，再导出。';
    $('#topic-form').reportValidity();
    return;
  }
  const content = `# ${$('#topic-title').value.trim()}\n\n频道：${$('#topic-channel').value}\n\n状态：未发布草稿\n\n${$('#topic-body').value.trim()}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'NEON-LAB-话题草稿.md';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#topic-status').textContent = '已发起 Markdown 下载，可放入 Obsidian 笔记库。';
});

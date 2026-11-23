'use strict';

const EXAMPLES = {
  heartbeat: {
    title: '第一束光',
    tab: '第一束光',
    file: './examples/Heartbeat/Heartbeat.ino',
    fileName: 'Heartbeat.ino',
    meta: 'GPIO · 非阻塞计时',
    description: '用 millis() 驱动 LED 心跳，理解时间与循环的关系。',
    board: 'Arduino Uno',
    port: 'COM6'
  },
  'button-lamp': {
    title: '一次按下，一次回应',
    tab: '一次按下，一次回应',
    file: './examples/ButtonLamp/ButtonLamp.ino',
    fileName: 'ButtonLamp.ino',
    meta: '输入 · 软件消抖',
    description: '读取按键、过滤抖动，再用状态变化控制一盏灯。',
    board: 'Arduino Uno',
    port: 'COM6'
  },
  threshold: {
    title: '感知连续的世界',
    tab: '感知连续的世界',
    file: './examples/ThresholdMonitor/ThresholdMonitor.ino',
    fileName: 'ThresholdMonitor.ino',
    meta: 'ADC · 阈值与回差',
    description: '用电位器观察模拟量，通过上下阈值稳定报警状态。',
    board: 'Arduino Uno',
    port: 'COM6'
  }
};

const KEYWORDS = new Set(['void', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'const', 'static', 'volatile', 'sizeof']);
const TYPES = new Set(['bool', 'byte', 'char', 'int', 'long', 'short', 'float', 'double', 'unsigned', 'signed']);
const CONSTANTS = new Set(['HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'true', 'false', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5']);
const FUNCTIONS = new Set(['pinMode', 'digitalRead', 'digitalWrite', 'analogRead', 'analogWrite', 'millis', 'micros', 'delay', 'delayMicroseconds', 'Serial', 'setup', 'loop']);

const $ = (selector) => document.querySelector(selector);
const codeEl = $('#code');
const lineNumbers = $('#line-numbers');
const consoleOutput = $('#console-output');
const editor = $('#ide-editor');
const statusLine = $('#status-line');

const params = new URLSearchParams(location.search);
const requested = params.get('example');
const key = EXAMPLES[requested] ? requested : 'heartbeat';
const example = EXAMPLES[key];
let codeText = '';

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function tokenClass(token) {
  if (token.startsWith('//') || token.startsWith('/*')) return 'tok-com';
  if (token.startsWith('#')) return 'tok-pre';
  if (token.startsWith('"') || token.startsWith("'")) return 'tok-str';
  if (KEYWORDS.has(token)) return 'tok-key';
  if (TYPES.has(token)) return 'tok-type';
  if (FUNCTIONS.has(token)) return 'tok-fn';
  if (CONSTANTS.has(token)) return 'tok-const';
  if (/^\d/.test(token)) return 'tok-num';
  return '';
}

function highlightArduino(source) {
  const words = [
    ...KEYWORDS,
    ...TYPES,
    ...CONSTANTS,
    ...FUNCTIONS
  ].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    String.raw`(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[A-Za-z_]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:${words.join('|')})\b|\b\d+(?:\.\d+)?\b)`,
    'g'
  );

  let result = '';
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    result += escapeHtml(source.slice(cursor, match.index));
    const token = match[0];
    const className = tokenClass(token);
    result += className
      ? `<span class="${className}">${escapeHtml(token)}</span>`
      : escapeHtml(token);
    cursor = match.index + token.length;
  }
  result += escapeHtml(source.slice(cursor));
  return result;
}

function log(lines) {
  consoleOutput.innerHTML = lines.map(({ text, className = '' }) => {
    const cls = className ? ` class="${className}"` : '';
    return `<div${cls}>${escapeHtml(text)}</div>`;
  }).join('');
  consoleOutput.scrollTop = 0;
}

function setMeta() {
  document.title = `${example.title} · 示例代码 · Spark 的日记`;
  $('#window-title').textContent = `${example.title} · Arduino 1.8.15`;
  $('#tab-title').textContent = example.tab;
  $('#tab-file').textContent = example.fileName;
  $('#source-link').href = example.file;
  $('#status-meta').textContent = `${example.board} · ${example.port}`;
  $('#status-line').textContent = example.meta;
}

function lineCount() {
  return codeText ? codeText.split('\n').length : 0;
}

function renderCode(source) {
  codeText = source.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  if (!codeText) {
    codeEl.innerHTML = '<span class="code-empty">这个示例暂时没有代码。</span>';
    lineNumbers.replaceChildren();
    return;
  }
  codeEl.innerHTML = highlightArduino(codeText);
  lineNumbers.innerHTML = codeText.split('\n').map((_, index) => `<div>${index + 1}</div>`).join('');

  const chars = codeText.length;
  log([
    { text: `> 已打开示例：${example.title}`, className: 'ok' },
    { text: `> 项目：${example.meta}` },
    { text: `> 文件：${example.fileName} · ${lineCount()} 行 · ${chars} 字符` },
    { text: `> 开发板：${example.board} / ${example.port}`, className: 'muted' },
    { text: '> 这是只读预览。点击复制代码，粘贴到 Arduino IDE 后验证和上传。', className: 'muted' }
  ]);
}

async function loadExample() {
  setMeta();
  try {
    const response = await fetch(example.file, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderCode(await response.text());
  } catch (error) {
    codeEl.innerHTML = '<span class="code-empty">示例代码读取失败。</span>';
    lineNumbers.replaceChildren();
    statusLine.textContent = '示例读取失败';
    log([
      { text: `> 无法读取 ${example.file}`, className: 'warn' },
      { text: '> 请确认通过本地 Node 服务或线上站点打开，而不是直接双击 HTML 文件。', className: 'muted' }
    ]);
    console.warn(error);
  }
}

async function copyCode() {
  if (!codeText) {
    log([{ text: '> 还没有可复制的代码。', className: 'warn' }]);
    return;
  }
  try {
    await navigator.clipboard.writeText(codeText);
    log([
      { text: `> 已复制 ${example.fileName}，共 ${lineCount()} 行。`, className: 'ok' },
      { text: '> 打开 Arduino IDE，新建 Sketch，粘贴代码即可。', className: 'muted' }
    ]);
  } catch {
    const area = document.createElement('textarea');
    area.value = codeText;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    log([{ text: copied ? '> 代码已复制。' : '> 浏览器没有允许复制，请手动选择代码。', className: copied ? 'ok' : 'warn' }]);
  }
}

function downloadCode() {
  if (!codeText) {
    log([{ text: '> 还没有可下载的代码。', className: 'warn' }]);
    return;
  }
  const blob = new Blob([`${codeText}\n`], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = example.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  log([{ text: `> 已下载 ${example.fileName}。`, className: 'ok' }]);
}

function selectAllCode() {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(codeEl);
  selection.removeAllRanges();
  selection.addRange(range);
  log([{ text: '> 已选中全部代码。', className: 'muted' }]);
}

function explain() {
  log([
    { text: `> ${example.title}：${example.description}` },
    { text: '> 本页是 Arduino IDE 风格的只读预览。' },
    { text: '> 复制代码后，在 Arduino IDE 里新建 Sketch、粘贴、选择开发板和端口，再点击验证或上传。', className: 'muted' }
  ]);
}

function closeMenus() {
  for (const menu of document.querySelectorAll('.ide-menu[open]')) menu.open = false;
}

setMeta();
loadExample();

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    if (action === 'copy') copyCode();
    else if (action === 'download') downloadCode();
    else if (action === 'select') selectAllCode();
    else if (action === 'explain') explain();
  }

  const target = event.target;
  if (!target.closest('.ide-menu')) closeMenus();
  else if (target.closest('.menu-panel a, .menu-panel button')) closeMenus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenus();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    downloadCode();
  }
});

editor.addEventListener('click', (event) => {
  if (!codeText) return;
  const pre = codeEl.parentElement;
  const rect = pre.getBoundingClientRect();
  const line = Math.max(1, Math.min(lineCount(), Math.floor((event.clientY - rect.top) / 22) + 1));
  statusLine.textContent = `第 ${line} 行 · ${example.meta}`;
});

window.addEventListener('resize', () => {
  lineNumbers.style.height = `${codeEl.scrollHeight}px`;
});

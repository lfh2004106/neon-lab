'use strict';

const EXAMPLES = {
  'heart-matrix': {
    title: '爱心点阵', tab: '爱心点阵',
    file: './projects/heart-matrix/heart_matrix/heart_matrix.ino',
    fileName: 'heart_matrix.ino', meta: 'Spark 的第一个项目 · 8×32 MAX7219',
    description: '四片点阵级联，用亮度变化呈现 1.1 秒心跳。使用 Arduino 内置 SPI 库。',
    board: 'Arduino Uno R3', port: '未连接（网页只读预览）'
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
const key = EXAMPLES[requested] ? requested : 'heart-matrix';
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
  document.title = `${example.title} · 项目代码 · Spark 的日记`;
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
    codeEl.innerHTML = '<span class="code-empty">这个项目暂时没有代码。</span>';
    lineNumbers.replaceChildren();
    return;
  }
  codeEl.innerHTML = highlightArduino(codeText);
  lineNumbers.innerHTML = codeText.split('\n').map((_, index) => `<div>${index + 1}</div>`).join('');

  const chars = codeText.length;
  log([
    { text: `> 已打开项目：${example.title}`, className: 'ok' },
    { text: `> 项目：${example.meta}` },
    { text: `> 文件：${example.fileName} · ${lineCount()} 行 · ${chars} 字符` },
    { text: `> 开发板：${example.board} / ${example.port}`, className: 'muted' },
    { text: '> 这是只读预览。点击复制代码，粘贴到 Arduino IDE 后验证和上传。', className: 'muted' }
  ]);
}

async function loadExample() {
  setMeta();
  try {
    renderCode(await window.SparkContent.readText(example.file));
  } catch (error) {
    codeEl.innerHTML = '<span class="code-empty">项目代码读取失败。</span>';
    lineNumbers.replaceChildren();
    statusLine.textContent = '项目读取失败';
    log([
      { text: `> 无法读取 ${example.file}`, className: 'warn' },
      { text: '> 请刷新页面，或通过“文件 → 查看纯文本源码”打开原始文件。', className: 'muted' }
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

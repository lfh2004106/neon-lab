'use strict';
const lessons = {
  blink: { title: '点亮第一束光', label: 'GPIO / OUTPUT', goal: '给第一个 LED 项目设定一个明确目标：观察不同闪烁间隔，并记录变化。' },
  sensor: { title: '让电路感知环境', label: 'SENSOR / INPUT', goal: '选择一种传感器，记录器件型号、数据变化，以及验证读数的方式。' },
  display: { title: '给设备一个界面', label: 'DISPLAY / INTERFACE', goal: '确定你想展示的信息，记录屏幕布局、状态变化与实际运行效果。' }
};
let activeLesson = 'blink';
function readChecks() {
  try { const value = JSON.parse(storage.get(`lesson:${activeLesson}`) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
}
function refreshLesson() {
  const lesson = lessons[activeLesson];
  $('#lesson-title').textContent = lesson.title;
  $('#lesson-label').textContent = lesson.label;
  $('#lesson-goal').textContent = lesson.goal;
  $('#lesson-share').href = `./english.html?project=${activeLesson}#english`;
  const checks = readChecks();
  document.querySelectorAll('[data-check]').forEach(input => { input.checked = checks[input.dataset.check] === true; });
  $('#lesson-status').textContent = '完成情况保存在当前浏览器。';
}
document.querySelectorAll('[data-lesson]').forEach(button => button.addEventListener('click', () => {
  activeLesson = button.dataset.lesson;
  document.querySelectorAll('[data-lesson]').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  refreshLesson();
}));
document.querySelectorAll('[data-check]').forEach(input => input.addEventListener('change', () => {
  const checks = Object.fromEntries([...document.querySelectorAll('[data-check]')].map(item => [item.dataset.check, item.checked]));
  $('#lesson-status').textContent = storage.set(`lesson:${activeLesson}`, JSON.stringify(checks)) ? '已保存本节的完成情况。' : '本地保存失败，请手动记录完成情况。';
}));
refreshLesson();
$('#lab-notes').value = storage.get('lab-notes') || '';
$('#lab-notes').addEventListener('input', () => { $('#lab-status').textContent = '有未保存的修改'; });
$('#save-lab').addEventListener('click', () => {
  $('#lab-status').textContent = storage.set('lab-notes', $('#lab-notes').value) ? '已保存到当前浏览器' : '保存失败，仍可导出笔记。';
});
$('#export-lab').addEventListener('click', () => {
  if (!$('#lab-notes').value.trim()) { $('#lab-status').textContent = '先写一点实验记录再导出。'; return; }
  const blob = new Blob([`# 我的嵌入式实验记录\n\n${$('#lab-notes').value}\n`], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'NEON-LAB-实验记录.md'; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#lab-status').textContent = '已发起 Markdown 下载。';
});

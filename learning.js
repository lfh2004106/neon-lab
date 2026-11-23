'use strict';
const weekInputs = [...document.querySelectorAll('[data-week]')];
let completed = [];
try { const value=JSON.parse(storage.get('course-weeks') || '[]'); if(Array.isArray(value)) completed=value; } catch {}
weekInputs.forEach(input => { input.checked=completed.includes(input.dataset.week); });
function updateWeeks(save=false) {
  const selected=weekInputs.filter(input=>input.checked).map(input=>input.dataset.week);
  $('#course-progress').value=selected.length;
  const ok=!save || storage.set('course-weeks',JSON.stringify(selected));
  $('#course-status').textContent=`已通过 ${selected.length} / 8 周验收。${ok?'进度仅保存在当前浏览器。':'本地保存失败，请手动记录。'}`;
}
weekInputs.forEach(input=>input.addEventListener('change',()=>updateWeeks(true)));
updateWeeks();

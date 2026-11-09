import { advise, clarificationDays, openRecords } from './business.mjs';

const intake = document.querySelector('#intake');
const detail = document.querySelector('#record');
const list = document.querySelector('#record-list');
const status = document.querySelector('#status');
const create = document.querySelector('#new-record');
const ruleButton = document.querySelector('#rule-submit');
const deepseekButton = document.querySelector('#deepseek-submit');
const deepseekNote = document.querySelector('#deepseek-note');
const field = (form, name) => form.elements.namedItem(name);
const values = form => Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, value.trim()]));
let records;
let active = null;

function shelf() {
  list.replaceChildren();
  const all = records.list();
  if (!all.length) {
    const empty = document.createElement('p');
    empty.className = 'shelf-empty';
    empty.textContent = '还没有复盘记录。';
    list.append(empty);
  }
  for (const item of all) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shelf-item';
    button.setAttribute('aria-pressed', item.id === active?.id);
    const name = document.createElement('strong');
    name.textContent = item.role;
    const state = document.createElement('small');
    state.textContent = item.reply ? '已回填' : '待回填';
    button.append(name, state);
    button.addEventListener('click', () => open(item));
    list.append(button);
  }
}

function save(item, message, target) {
  try {
    records.save(item);
  } catch {
    target.textContent = '保存失败，请检查浏览器存储空间或设置后重试。';
    return false;
  }
  active = item;
  target.textContent = message;
  shelf();
  return true;
}

function open(item) {
  active = item;
  intake.hidden = true;
  detail.hidden = false;
  status.textContent = '';
  detail.innerHTML = `
    <p class="record-kicker" id="record-method"></p>
    <h2 id="record-role" tabindex="-1"></h2>
    <div class="advice">
      <p class="record-kicker">建议下一步</p>
      <h3 id="next"></h3>
      <p id="reason"></p>
      <blockquote id="evidence"></blockquote>
      <p id="related" class="local-note" hidden></p>
    </div>
    <form id="question-form" autocomplete="off">
      <label>给客户的追问<textarea name="question" rows="3" required maxlength="1200"></textarea></label>
      <div class="action-row"><button class="solid" type="button" id="copy-question">复制追问</button><button class="plain" type="submit">保存追问</button></div>
      <p class="feedback-status" role="status"></p>
    </form>
    <details class="source-details">
      <summary>查看原始记录</summary>
      <dl><dt>岗位必要条件</dt><dd id="source-requirements"></dd><dt>首批人选关键经历</dt><dd id="source-candidates"></dd><dt>客户反馈原话</dt><dd id="source-feedback"></dd><dt>退回日期</dt><dd id="source-returnedOn"></dd></dl>
    </details>
    <form id="reply-form" autocomplete="off">
      <h3>回填客户答复</h3>
      <label>客户后来怎么回<textarea name="reply" rows="3" required maxlength="2400"></textarea></label>
      <div class="form-pair">
        <label>最终处理<select name="decision">
          <option value="">待确认</option><option>补核人选证据</option><option>继续寻访</option><option>重新对齐岗位</option><option>等待更多反馈</option><option>结束该单</option>
        </select></label>
        <label>澄清日期 <small>选填</small><input name="clarifiedOn" type="date"></label>
      </div>
      <label>澄清前是否已经重搜<select name="reran"><option value="">未记录</option><option>是</option><option>否</option></select></label>
      <div class="action-row"><button class="solid" type="submit">保存答复</button><span id="duration" class="local-note"></span></div>
      <p class="feedback-status" role="status"></p>
    </form>
    <button type="button" class="plain remove-record" id="remove-record">删除记录</button>`;
  const el = selector => detail.querySelector(selector);
  const write = (selector, value) => { el(selector).textContent = value; };
  write('#record-method', item.method === 'deepseek' ? 'DeepSeek 建议 · 待确认' : '本地规则');
  write('#record-role', item.role);
  write('#next', item.advice.next);
  write('#reason', item.advice.reason);
  write('#evidence', item.advice.evidence);
  const related = [
    item.advice.requirement && `岗位原文：${item.advice.requirement}`,
    item.advice.candidate && `可补核的人选记录：${item.advice.candidate}`,
  ].filter(Boolean);
  if (related.length) {
    write('#related', related.join('\n'));
    el('#related').hidden = false;
  }
  for (const key of ['requirements', 'candidates', 'feedback']) write(`#source-${key}`, item[key]);
  write('#source-returnedOn', item.returnedOn || '未记录');
  const questionForm = el('#question-form');
  const replyForm = el('#reply-form');
  field(questionForm, 'question').value = item.question;
  for (const key of ['reply', 'decision', 'clarifiedOn', 'reran']) field(replyForm, key).value = item[key] ?? '';
  if (item.returnedOn) field(replyForm, 'clarifiedOn').min = item.returnedOn;
  function showDuration() {
    const days = clarificationDays(active.returnedOn, active.clarifiedOn ?? '');
    write('#duration', days === null ? '' : `退回到澄清：${days} 个自然日`);
  }
  showDuration();
  el('#copy-question').addEventListener('click', async () => {
    const question = field(questionForm, 'question');
    const message = questionForm.querySelector('[role=status]');
    if (!question.value.trim()) { message.textContent = '请先填写追问。'; return; }
    try {
      await navigator.clipboard.writeText(question.value.trim());
      message.textContent = '已复制。';
    } catch {
      question.focus();
      question.select();
      message.textContent = '已选中，请手动复制。';
    }
  });
  questionForm.addEventListener('submit', event => {
    event.preventDefault();
    const { question } = values(questionForm);
    const message = questionForm.querySelector('[role=status]');
    if (!question) { message.textContent = '请先填写追问。'; return; }
    save({ ...active, question }, '追问已保存。', message);
  });
  replyForm.addEventListener('submit', event => {
    event.preventDefault();
    const reply = values(replyForm);
    const message = replyForm.querySelector('[role=status]');
    if (!reply.reply) { message.textContent = '请先填写客户答复。'; return; }
    if (save({ ...active, ...reply }, '答复已保存。', message)) showDuration();
  });
  el('#remove-record').addEventListener('click', () => {
    if (!confirm('删除这条本机复盘记录？')) return;
    try { records.remove(active.id); } catch { status.textContent = '删除失败，请重试。'; return; }
    newRecord();
  });
  shelf();
  el('#record-role').focus();
}

function newRecord() {
  active = null;
  detail.hidden = true;
  detail.replaceChildren();
  intake.hidden = false;
  status.textContent = '';
  shelf();
  document.querySelector('#intake-title').focus();
}

intake.addEventListener('submit', async event => {
  event.preventDefault();
  const input = values(intake);
  if (['role', 'requirements', 'candidates', 'feedback'].some(key => !input[key])) {
    status.textContent = '请补齐岗位代号、必要条件、人选经历和反馈原话。';
    return;
  }
  let advice, message = '';
  if (event.submitter === deepseekButton) {
    const controls = [...intake.querySelectorAll('input, textarea, button'), ...document.querySelectorAll('.shelf-item'), create].filter(el => !el.disabled);
    controls.forEach(el => { el.disabled = true; });
    status.textContent = '正在分析客户反馈…';
    try {
      const { requirements, candidates, feedback } = input;
      const response = await fetch('./api/deepseek', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requirements, candidates, feedback }), signal: AbortSignal.timeout(25000),
      });
      const payload = await response.json();
      if (response.status === 422 && payload.error === 'contact') {
        status.textContent = '检测到手机号或邮箱，未发送。请删除后重试，也可以按规则生成。';
        return;
      }
      if (response.ok) advice = payload.advice;
    } catch { /* local rules remain available */ }
    finally { controls.forEach(el => { el.disabled = false; }); }
    if (!advice) message = 'DeepSeek 未返回可用建议，已改用本地规则。';
  }
  const method = advice ? 'deepseek' : 'rules';
  advice ??= advise(input);
  const item = { ...input, id: crypto.randomUUID(), advice, question: advice.question, method };
  if (!save(item, '', status)) return;
  intake.reset();
  open(item);
  status.textContent = message;
});

try {
  records = openRecords(window.localStorage);
  shelf();
  create.addEventListener('click', newRecord);
  ruleButton.disabled = false;
  fetch('./api/deepseek', { signal: AbortSignal.timeout(3500) })
    .then(response => response.ok ? response.json() : null)
    .then(result => {
      if (result?.available) deepseekButton.disabled = false;
      else deepseekNote.textContent = '当前站点未启用 DeepSeek，可按本地规则生成。';
    })
    .catch(() => { deepseekNote.textContent = '当前站点未启用 DeepSeek，可按本地规则生成。'; });
} catch {
  status.textContent = '无法读取本机复盘记录。请检查浏览器存储设置。';
  create.disabled = true;
}

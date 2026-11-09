import { cases } from './cases.mjs';
import { createReplay } from './replay.mjs';

const replay = createReplay();
const nav = document.querySelector('#case-switch');
const panel = document.querySelector('#case-content');
const heroQuote = document.querySelector('#hero-quote');
let index = 0;

nav.innerHTML = cases.map((item, i) => `<button type="button" data-case="${i}" aria-pressed="${i === 0}"><span>0${i + 1}</span>${item.name}</button>`).join('');

function render() {
  const item = cases[index];
  const state = replay.read(item.id);
  heroQuote.textContent = `「${item.name}」`;
  [...nav.children].forEach((button, i) => button.setAttribute('aria-pressed', i === index));
  panel.innerHTML = `
    <section class="sheet evidence" aria-labelledby="role">
      <div class="section-meta"><span>案件 0${index + 1}</span><span>${item.count}</span></div>
      <h2 id="role">${item.role}</h2>
      <p class="brief">${item.brief}</p>
      <ol class="timeline">${item.log.map(([day, label, quote], i) => `
        <li class="${i === item.log.length - 1 ? 'client' : ''}">
          <span class="day">${day}</span>
          <div><h3>${label}</h3><p>${quote}</p></div>
        </li>`).join('')}</ol>
    </section>
    <section class="sheet decisions" aria-labelledby="decision">
      <h2 id="decision">下一步怎么走？</h2>
      <dl class="diagnosis">
        <div><dt>已知</dt><dd>${item.known}</dd></div>
        <div><dt>待确认</dt><dd>${item.unknown}</dd></div>
      </dl>
      <fieldset ${state.revealed ? 'disabled' : ''}>
        <legend>选一个动作</legend>
        ${item.options.map(([label, note], i) => `
          <label class="option">
            <input type="radio" name="action" value="${i}" ${state.selection === i ? 'checked' : ''}>
            <span><strong>${label}</strong><small>${note}</small></span>
          </label>`).join('')}
      </fieldset>
      ${state.revealed ? `
        <section class="result" aria-labelledby="outcome">
          <h3 id="outcome" tabindex="-1">客户后来怎么说</h3>
          <blockquote>${item.later}</blockquote>
          <dl><div><dt>你选的动作</dt><dd>${item.options[state.selection][2]}</dd></div>
          <div><dt>可以这样问</dt><dd>${item.question}</dd></div>
          <div><dt>下一轮怎么做</dt><dd>${item.takeaway}</dd></div></dl>
          <button type="button" data-action="reset" class="reset">重做本案</button>
        </section>` : `<button type="button" data-action="reveal" class="reveal" ${state.selection === null ? 'disabled' : ''}>揭晓后续反馈</button>`}
    </section>`;
}

nav.addEventListener('click', event => {
  const button = event.target.closest('[data-case]');
  if (!button) return;
  index = Number(button.dataset.case);
  render();
});

panel.addEventListener('change', event => {
  if (event.target.name !== 'action') return;
  replay.select(cases[index].id, Number(event.target.value));
  panel.querySelector('.reveal').disabled = false;
});

panel.addEventListener('click', event => {
  const action = event.target.dataset.action;
  const id = cases[index].id;
  if (action === 'reveal' && replay.reveal(id)) {
    render();
    panel.querySelector('#outcome').focus();
  } else if (action === 'reset') {
    replay.reset(id);
    render();
    panel.querySelector('input').focus();
  }
});

render();

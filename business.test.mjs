import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advise, clarificationDays, openRecords } from './dist/business.mjs';

test('识别反馈中新提到的跨厂职责，保留岗位和候选证据，不判定为新硬条件', () => {
  const input = {
    requirements: '单厂质量团队管理\n负责体系和客诉',
    candidates: 'A：两座工厂的质量项目协作，权限待核\nB：单厂负责人',
    feedback: '级别还差一点。最好还能统筹别的厂。',
  };
  const result = advise(input);
  assert.equal(result.next, '先确认岗位范围');
  assert.equal(result.evidence, '最好还能统筹别的厂。');
  assert.equal(result.candidate, 'A：两座工厂的质量项目协作，权限待核');
  assert.match(result.question, /支援.*负责/);
  assert.match(result.reason, /是否必选待确认/);
});

test('笼统退回和多种线索不被硬推成单一原因', () => {
  const input = { requirements: '负责销售团队', candidates: 'A：行业待核实' };
  assert.equal(advise({ ...input, feedback: '整体不合适。' }).next, '先问一个具体卡点');
  assert.equal(advise({ ...input, feedback: '到岗太晚，而且缺少储能行业经验。' }).next, '先问优先卡点');
});

test('已明确的条件优先补核证据，不被建议改成新的岗位条件', () => {
  const result = advise({
    requirements: '有储能行业经验', candidates: 'A：储能行业经验待核', feedback: '行业经验不够。',
  });
  assert.equal(result.next, '先补核人选证据');
  assert.equal(result.requirement, '有储能行业经验');
  assert.match(result.question, /哪个环节/);
});

test('本机保存支持重新打开与回填，写入失败会向界面报告', () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  const before = { id: 'one', role: '岗位代号', question: '待确认什么？' };
  openRecords(storage).save(before);
  const reopened = openRecords(storage);
  assert.deepEqual(reopened.list(), [before]);
  reopened.save({ ...before, reply: '已确认跨厂是硬条件' });
  reopened.save({ id: 'two', role: '另一个岗位' });
  assert.deepEqual(reopened.list().map(x => x.id), ['two', 'one']);
  assert.equal(openRecords(storage).list()[1].reply, '已确认跨厂是硬条件');
  reopened.remove('two');
  assert.equal(reopened.list().length, 1);
  assert.throws(() => openRecords({ ...storage, setItem() { throw Error('quota'); } }).save(before), /quota/);
});

test('澄清用时仅根据用户填写的有效日期计算', () => {
  assert.equal(clarificationDays('2026-11-09', '2026-11-11'), 2);
  assert.equal(clarificationDays('2026-11-09', '2026-11-09'), 0);
  assert.equal(clarificationDays('2026-11-09', '2026-11-08'), null);
  assert.equal(clarificationDays('2026-11-09', ''), null);
  assert.equal(clarificationDays('2026-11-31', '2026-12-03'), null);
});

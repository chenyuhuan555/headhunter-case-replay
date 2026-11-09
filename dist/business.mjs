const signals = [
  {
    match: /跨厂|跨基地|多工厂|(?:两|[二三四2-4])座(?:工)?厂|统筹[^，。；]{0,12}(?:厂|基地)|管理范围|汇报线/,
    next: '先确认岗位范围',
    reason: '反馈出现了职责范围线索，是否必选待确认。',
    question: '您提到的范围，是需要协作支援，还是要对新增团队或工厂的结果负责？如果是后者，哪些范围必须覆盖？',
    check: '按之前确认的职责范围，您觉得这批人缺的是实际管理权限，还是对结果负责的经历？我去补核具体证据。',
  },
  {
    match: /太偏平台|偏平台|端到端|全链路|主导|独立负责|没有落地|未落地|落地经验|上线经验/,
    next: '先确认责任边界',
    reason: '反馈涉及人选做过什么和负责到哪一步，这两件事需要区分。',
    question: '这批人里，您更在意的是没做过对应业务，还是没有独立把项目从决策推进到落地？可以拿最接近的一位说说具体缺在哪一步吗？',
    check: '按之前确认的责任范围，您想先核实人选有没有做过决策、带过交付，还是实际拿到过项目结果？',
  },
  {
    match: /行业经验|行业背景|赛道|垂直领域|业务经验|业务背景|不懂业务|行业不符/,
    next: '先确认业务门槛',
    reason: '反馈指向业务经验，但具体要哪类经验还需要对齐。',
    question: '这次一定要做过同一行业，还是有相同客户类型、业务流程或项目经验也可以？您最看重哪个环节？',
    check: '按之前确认的行业要求，您想看到人选在哪个环节有直接经验？我可以针对最接近的人选补核项目细节。',
  },
  {
    match: /到岗|入职时间|通知期|最快(?:入职|上班)/,
    next: '先确认到岗窗口',
    reason: '反馈提到了到岗时间，先确认是否卡在时间窗。',
    question: '这个岗位最迟希望什么时候到岗？如果人选其他条件合适，到岗时间有没有可商量的范围？',
    check: '到岗仍按之前确认的时间窗口吗？我先核实最接近的人选能否在这个窗口内到岗。',
  },
  {
    match: /薪资|薪酬|预算|总包|超薪|太贵/,
    next: '先确认预算口径',
    reason: '反馈涉及预算或薪酬，先区分硬上限和可谈范围。',
    question: '这次是超过了硬预算，还是固定薪资和总包的口径没对齐？我下轮该按哪个上限筛？',
    check: '我会按之前确认的预算补核人选期望。您说的差距是固定薪资，还是总包？',
  },
];

const lines = text => text.split(/(?<=[。！？；])|\n/).map(x => x.trim()).filter(Boolean);

export function advise({ requirements, candidates, feedback }) {
  const hits = signals.filter(signal => signal.match.test(feedback));
  if (hits.length !== 1) return {
    next: hits.length ? '先问优先卡点' : '先问一个具体卡点',
    reason: hits.length ? '反馈包含不同线索，还不清楚哪个先影响约谈。' : '目前没找到足够明确的卡点，先从一位最接近的人选问起。',
    evidence: feedback, requirement: '', candidate: '',
    question: hits.length
      ? '这几项里，哪个是这批人没进入面试的首要原因？它是整个岗位都适用，还是只针对其中一位？'
      : '方便拿这批里最接近的一位举例吗？您暂时不约他的首要原因是什么，我好判断是补一条经历，还是调整下一轮寻访方向。',
  };
  const signal = hits[0];
  const requirement = lines(requirements).find(line => signal.match.test(line)) ?? '';
  const candidate = candidates.split('\n').map(line => line.trim()).find(line => signal.match.test(line)) ?? '';
  return {
    next: requirement ? '先补核人选证据' : signal.next,
    reason: requirement ? '岗位原文已有同类线索。先确认哪条证据不够，再决定是否调整条件。' : signal.reason,
    evidence: lines(feedback).find(line => signal.match.test(line)) ?? feedback,
    requirement, candidate, question: requirement ? signal.check : signal.question,
  };
}

export function openRecords(storage) {
  const key = 'headhunter-replay-records-v1';
  const list = () => JSON.parse(storage.getItem(key) ?? '[]');
  const write = records => storage.setItem(key, JSON.stringify(records));
  return {
    list,
    save(record) { write([record, ...list().filter(item => item.id !== record.id)]); },
    remove(id) { write(list().filter(item => item.id !== id)); },
  };
}

export function clarificationDays(returnedOn, clarifiedOn) {
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const day = Date.parse(value);
    return Number.isFinite(day) && new Date(day).toISOString().startsWith(value) ? day : NaN;
  }
  const days = (date(clarifiedOn) - date(returnedOn)) / 86400000;
  return days >= 0 ? days : null;
}

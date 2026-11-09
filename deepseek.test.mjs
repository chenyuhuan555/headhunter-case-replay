import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analysisRoute } from './server/deepseek.mjs';

const input = { requirements: '单厂质量团队管理', candidates: 'A：参与两厂协作', feedback: '能不能统筹别的厂？' };
const valid = { action: 'scope', reason: '跨厂是否必选待确认。', evidence: input.feedback, requirement: '', candidate: input.candidates, question: '需要直接负责两厂质量结果，还是参与协作即可？' };
const url = 'https://replay.example/api/deepseek';
const req = (body = input, headers = {}) => new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const fake = reply => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(reply) } }] });

test('只发送三个字段并接受可回到原文的引用', async () => {
  const result = await analysisRoute(req({ ...input, role: '内部代号', reply: '不发送后续答复' }), 'test', async (target, options) => {
    assert.equal(target, 'https://api.deepseek.com/chat/completions');
    const call = JSON.parse(options.body);
    assert.equal(call.model, 'deepseek-flash');
    assert.deepEqual(JSON.parse(call.messages[1].content), input);
    return fake(valid);
  });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).advice, { ...Object.fromEntries(Object.entries(valid).filter(([k]) => k !== 'action')), next: '先确认岗位范围' });
});

test('拒绝伪造的原文引用和未配置的请求', async () => {
  assert.equal((await analysisRoute(req(), 'test', async () => fake({ ...valid, evidence: '已确认跨厂是硬条件' }))).status, 502);
  assert.equal((await analysisRoute(req(), '', () => assert.fail('must not send'))).status, 503);
});

test('跨站请求或含邮箱、手机号的输入不发往模型', async () => {
  const never = () => assert.fail('must not send');
  assert.equal((await analysisRoute(req(input, { origin: 'https://other.example' }), 'test', never)).status, 403);
  assert.equal((await analysisRoute(req({ ...input, candidates: 'A：a@example.com' }), 'test', never)).status, 422);
  assert.equal((await analysisRoute(req({ ...input, candidates: 'A：138 0013 8000' }), 'test', never)).status, 422);
});

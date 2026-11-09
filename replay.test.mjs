import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReplay } from './dist/replay.mjs';

test('后续反馈必须在本案选定一个动作后才能揭晓', () => {
  const replay = createReplay();
  assert.equal(replay.reveal('platform'), false);
  replay.select('platform', 1);
  assert.equal(replay.read('platform').revealed, false);
  assert.equal(replay.reveal('platform'), true);
  assert.deepEqual(replay.read('platform'), { selection: 1, revealed: true });
  replay.select('platform', 0);
  assert.equal(replay.read('platform').selection, 1);
});

test('切换不泄露其他案的后续，重做只清除当前案', () => {
  const replay = createReplay();
  replay.select('platform', 1);
  replay.reveal('platform');
  assert.equal(replay.read('budget').revealed, false);
  replay.select('budget', 0);
  replay.reset('platform');
  assert.deepEqual(replay.read('platform'), { selection: null, revealed: false });
  assert.deepEqual(replay.read('budget'), { selection: 0, revealed: false });
});

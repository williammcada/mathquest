// MathQuest 0.14.1: teacher preview "Next variant" (Engine index per variant, same seed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { enginePreview, PREVIEW_VARIANT_MAX } from '../src/engine-questions.js';

const IDS = ['g3-reduce', 'bank:algebra-1-en:node:570', 'bank:course-87-en:item:SN870001'];

test('v0.14.1: variant 0 is the original sample; later variants differ and are repeatable', () => {
  assert.deepEqual(enginePreview(IDS), enginePreview(IDS, 0));
  for (const id of IDS) {
    const seen = new Set();
    for (let v = 0; v < 8; v++) {
      const [a] = enginePreview([id], v), [b] = enginePreview([id], v);
      assert.equal(a.variant, v);
      assert.deepEqual(a, b, `${id} variant ${v} is deterministic`);
      seen.add(a.prompt + '|' + a.answer);
    }
    assert.ok(seen.size >= 4, `${id}: expected several distinct variants, got ${seen.size}`);
  }
});

test('v0.14.1: bad or huge variants are clamped, never thrown', () => {
  assert.equal(enginePreview(['g3-reduce'], -3)[0].variant, 0);
  assert.equal(enginePreview(['g3-reduce'], 1.5)[0].variant, 0);
  assert.equal(enginePreview(['g3-reduce'], 1e9)[0].variant, PREVIEW_VARIANT_MAX);
});

test('v0.14.1: /api/engine-preview honours variant and stays teacher-only', async () => {
  const { default: worker } = await import('../src/worker.js');
  const env = { TEACHER_PASSCODE: 'correct-horse-9' };
  const call = (key, body) => worker.fetch(new Request('https://api.example/api/engine-preview', { method: 'POST', headers: { 'x-mathquest-teacher': key }, body: JSON.stringify(body) }), env);
  assert.equal((await call('nope', { ids: ['g3-reduce'], variant: 2 })).status, 403);
  const v0 = (await (await call('correct-horse-9', { ids: ['g3-reduce'] })).json()).items[0];
  const v2 = (await (await call('correct-horse-9', { ids: ['g3-reduce'], variant: 2 })).json()).items[0];
  assert.equal(v0.variant, 0); assert.equal(v2.variant, 2);
  assert.deepEqual(v2, enginePreview(['g3-reduce'], 2)[0]);
});

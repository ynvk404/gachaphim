import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = mkdtempSync(join(tmpdir(), 'tnag-case-'));
try {
  buildSync({
    entryPoints: ['src/lib/case-mechanics.ts'],
    outfile: join(out, 'case.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
  });
  const { createSpinProfile, chooseTiered } = createRequire(import.meta.url)(
    join(out, 'case.cjs'),
  );
  test('normal motion keeps the deliberate case-opening pace', () => {
    const profile = createSpinProfile(() => 0.5, false);
    assert.deepEqual(profile, { durationMs: 8500, tiles: 35, friction: 3 });
  });
  test('reduced motion remains readable instead of becoming an instant Windows spin', () => {
    const profile = createSpinProfile(() => 0.5, true);
    assert.deepEqual(profile, { durationMs: 4500, tiles: 12, friction: 3 });
  });
  test('case rates select a tier before uniformly selecting within it', () => {
    const items = [
      { tier: 0, id: 'a' },
      { tier: 0, id: 'b' },
      { tier: 4, id: 'rare' },
    ];
    let calls = 0;
    const result = chooseTiered(items, () => (++calls === 1 ? 0.99 : 0));
    assert.equal(result.id, 'rare');
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assignFoodAliases,
  createSeededRandom,
  foodAliasesByTier,
  isFoodAliasForTier,
} from '../src/lib/food-aliases';

test('aliases stay in the actress tier and are deterministic for a snapshot seed', () => {
  const items = [
    { id: 'common', tier: 0 as const },
    { id: 'rare-a', tier: 3 as const },
    { id: 'rare-b', tier: 3 as const },
    { id: 'special', tier: 4 as const },
  ];
  const first = assignFoodAliases(items, createSeededRandom('snapshot-a'));
  const second = assignFoodAliases(items, createSeededRandom('snapshot-a'));
  assert.deepEqual(first, second);
  first.forEach((item) =>
    assert.ok(isFoodAliasForTier(item.publicName, item.tier)),
  );
  assert.deepEqual(
    first.map(({ id }) => id),
    items.map(({ id }) => id),
  );
});

test('each tier consumes a shuffled alias cycle before repeating', () => {
  const size = foodAliasesByTier[0].length;
  const items = Array.from({ length: size + 3 }, (_, index) => ({
    id: `common-${index}`,
    tier: 0 as const,
  }));
  const assigned = assignFoodAliases(items, () => 0);
  assert.equal(
    new Set(assigned.slice(0, size).map((item) => item.publicName)).size,
    size,
  );
  assert.ok(
    assigned
      .slice(size)
      .every((item) => isFoodAliasForTier(item.publicName, 0)),
  );
});

test('invalid random sources fail closed', () => {
  assert.throws(
    () => assignFoodAliases([{ id: 'common', tier: 0 as const }], () => 1),
    /Random draw must be in \[0,1\)/,
  );
});

test('public UI paths use publicName while the winner dialog owns real names', () => {
  const page = readFileSync(
    new URL('../src/app/page.tsx', import.meta.url),
    'utf8',
  );
  const preferences = readFileSync(
    new URL('../src/components/preferences-panel.tsx', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(page, /actress\.name/);
  assert.doesNotMatch(preferences, /item\.name/);
  const dialog = page.indexOf('className="winner-dialog"');
  assert.ok(dialog >= 0);
  assert.ok(page.indexOf('result.name', dialog) > dialog);
  assert.ok((page.match(/result\.name/g) ?? []).length >= 2);
});

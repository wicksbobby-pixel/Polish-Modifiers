const test = require('node:test');
const assert = require('node:assert/strict');
const Dec = require('../src/declension.js');
const Eng = require('../src/engine.js');

// Deterministic PRNG (mulberry32) so failures are reproducible.
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('grid has 36 cells (24 sg + 12 pl)', () => {
  const cells = Dec.gridCells();
  assert.equal(cells.length, 36);
  assert.equal(cells.filter((c) => c.number === 'sg').length, 24);
});

test('coverage checklist: every one of the 36 cells is reachable', () => {
  const unreachable = Dec.gridCells().filter((c) => !Eng.placementsFor(c).length).map((c) => c.key);
  assert.deepEqual(unreachable, []);
});

test('coverage is not a single point of failure: ≥2 frames per cell', () => {
  for (const c of Dec.gridCells()) {
    const frames = new Set(Eng.placementsFor(c).map((p) => p.frameIndex));
    assert.ok(frames.size >= 2, c.key + ' has only ' + frames.size + ' frame(s)');
  }
});

test('buildRound realises the requested cell and produces valid options', () => {
  const r = rng(42);
  for (let i = 0; i < 3000; i++) {
    const cell = Dec.gridCells()[i % 36];
    const round = Eng.buildRound(cell, r);
    assert.equal(round.blanks[round.targetSlot].cell.key, Dec.cellKey(cell.number, cell.agr, cell.case));
    for (const b of round.blanks) {
      assert.equal(b.options.length, 3);
      assert.equal(new Set(b.options).size, 3, 'duplicate options: ' + b.options);
      assert.equal(b.options.filter((o) => o === b.answer).length, 1);
      assert.equal(b.answer, Dec.declineNoun(b.noun, b.cell));
      assert.equal(b.modifier, Dec.declinePair(b.det, b.adj, b.cell));
      assert.ok(b.adj.sem.some((s) => b.noun.sem.includes(s)), b.adj.lemma + ' + ' + b.noun.en);
      if (b.cell.number === 'pl') assert.ok(!b.noun.mass, 'mass noun in plural: ' + b.noun.en);
    }
    if (round.blanks.length === 2) assert.notEqual(round.blanks[0].noun, round.blanks[1].noun);
    assert.equal(round.parts.filter((p) => p.type === 'blank').length, round.blanks.length);
  }
});

test('deck visits all 36 cells in every cycle of 36', () => {
  const deck = Eng.createDeck(rng(7));
  for (let cycle = 0; cycle < 3; cycle++) {
    const seen = new Set();
    for (let i = 0; i < 36; i++) seen.add(deck.next().key);
    assert.equal(seen.size, 36);
  }
});

test('frame agreement tokens resolve by slot number', () => {
  const parts = Eng.renderParts('{0} [0:is|are] walking to {1}.', ['pl', 'sg']);
  assert.deepEqual(parts, [
    { type: 'blank', index: 0 },
    { type: 'text', value: ' are walking to ' },
    { type: 'blank', index: 1 },
    { type: 'text', value: '.' },
  ]);
});

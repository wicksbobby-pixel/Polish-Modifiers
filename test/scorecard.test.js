const test = require('node:test');
const assert = require('node:assert/strict');
const Dec = require('../src/declension.js');
const Data = require('../src/data.js');
const Card = require('../src/scorecard.js');

const noun = (en) => Data.NOUNS.find((n) => n.en === en);
const cell = (number, agr, c) => ({ number, agr, case: c, key: Dec.cellKey(number, agr, c) });

test('records per noun + cell, keeping syncretic cells apart', () => {
  const card = Card.empty();
  const horse = noun('horse');
  Card.record(card, { noun: horse, cell: cell('sg', 'm-anim', 'gen'), correct: true });
  Card.record(card, { noun: horse, cell: cell('sg', 'm-anim', 'acc'), correct: false }); // also "konia"
  Card.record(card, { noun: horse, cell: cell('sg', 'm-anim', 'acc'), correct: true });
  assert.equal(card.blanks, 3);
  assert.equal(card.correct, 2);

  const [h] = Card.byNoun(card);
  assert.equal(h.noun, horse);
  assert.deepEqual(h.forms.map((f) => [f.form, f.cell.case, f.seen, f.correct]),
    [['konia', 'gen', 1, 1], ['konia', 'acc', 2, 1]]);
  assert.deepEqual(Card.byCell(card)['sg.m-anim.acc'], { seen: 2, correct: 1 });
});

test('finishGame tracks games and best score', () => {
  const card = Card.empty();
  Card.finishGame(card, 900);
  Card.finishGame(card, 400);
  assert.equal(card.games, 2);
  assert.equal(card.best, 900);
});

test('revive rejects junk and survives a JSON round trip', () => {
  assert.deepEqual(Card.revive(null), Card.empty());
  assert.deepEqual(Card.revive({ version: 999 }), Card.empty());
  const card = Card.record(Card.empty(), { noun: noun('cat'), cell: cell('pl', 'nonvir', 'ins'), correct: true });
  const back = Card.revive(JSON.parse(JSON.stringify(card)));
  assert.equal(Card.byNoun(back)[0].forms[0].form, 'kotami');
});

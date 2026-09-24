const test = require('node:test');
const assert = require('node:assert/strict');
const Dec = require('../src/declension.js');
const Data = require('../src/data.js');

const cell = (number, agr, c) => ({ number, agr, case: c });
const adj = (lemma) => Data.ADJECTIVES.find((a) => a.lemma === lemma);

// Full paradigm in grid order: per case, [m-anim, m-inan, f, n, vir, nonvir]
function paradigm(fn) {
  const out = {};
  for (const c of Dec.CASES) {
    out[c] = ['m-anim', 'm-inan', 'f', 'n', 'vir', 'nonvir'].map((agr) =>
      fn(cell(['vir', 'nonvir'].includes(agr) ? 'pl' : 'sg', agr, c)));
  }
  return out;
}

test('hard stem: dobry', () => {
  assert.deepEqual(paradigm((c) => Dec.declineAdjective(adj('dobry'), c)), {
    nom: ['dobry', 'dobry', 'dobra', 'dobre', 'dobrzy', 'dobre'],
    gen: ['dobrego', 'dobrego', 'dobrej', 'dobrego', 'dobrych', 'dobrych'],
    dat: ['dobremu', 'dobremu', 'dobrej', 'dobremu', 'dobrym', 'dobrym'],
    acc: ['dobrego', 'dobry', 'dobrą', 'dobre', 'dobrych', 'dobre'],
    ins: ['dobrym', 'dobrym', 'dobrą', 'dobrym', 'dobrymi', 'dobrymi'],
    loc: ['dobrym', 'dobrym', 'dobrej', 'dobrym', 'dobrych', 'dobrych'],
  });
});

test('velar stem: wysoki — i appears before every e/y ending, not just nom.', () => {
  assert.deepEqual(paradigm((c) => Dec.declineAdjective(adj('wysoki'), c)), {
    nom: ['wysoki', 'wysoki', 'wysoka', 'wysokie', 'wysocy', 'wysokie'],
    gen: ['wysokiego', 'wysokiego', 'wysokiej', 'wysokiego', 'wysokich', 'wysokich'],
    dat: ['wysokiemu', 'wysokiemu', 'wysokiej', 'wysokiemu', 'wysokim', 'wysokim'],
    acc: ['wysokiego', 'wysoki', 'wysoką', 'wysokie', 'wysokich', 'wysokie'],
    ins: ['wysokim', 'wysokim', 'wysoką', 'wysokim', 'wysokimi', 'wysokimi'],
    loc: ['wysokim', 'wysokim', 'wysokiej', 'wysokim', 'wysokich', 'wysokich'],
  });
});

test('soft stem: tani', () => {
  assert.deepEqual(paradigm((c) => Dec.declineAdjective(adj('tani'), c)), {
    nom: ['tani', 'tani', 'tania', 'tanie', 'tani', 'tanie'],
    gen: ['taniego', 'taniego', 'taniej', 'taniego', 'tanich', 'tanich'],
    dat: ['taniemu', 'taniemu', 'taniej', 'taniemu', 'tanim', 'tanim'],
    acc: ['taniego', 'tani', 'tanią', 'tanie', 'tanich', 'tanie'],
    ins: ['tanim', 'tanim', 'tanią', 'tanim', 'tanimi', 'tanimi'],
    loc: ['tanim', 'tanim', 'taniej', 'tanim', 'tanich', 'tanich'],
  });
});

test('virile nom. pl. alternations', () => {
  const expected = {
    // attested in the Duolingo export
    dobry: 'dobrzy', zły: 'źli', mały: 'mali', duży: 'duzi', nowy: 'nowi', stary: 'starzy',
    // derived
    wysoki: 'wysocy', niski: 'niscy', wąski: 'wąscy', ciężki: 'ciężcy', lekki: 'lekcy',
    drogi: 'drodzy', długi: 'dłudzy', niebieski: 'niebiescy', szeroki: 'szerocy',
    czysty: 'czyści', jasny: 'jaśni', suchy: 'susi', młody: 'młodzi', bogaty: 'bogaci',
    żółty: 'żółci', mokry: 'mokrzy', wesoły: 'weseli', słaby: 'słabi', tani: 'tani',
    poprzedni: 'poprzedni', smaczny: 'smaczni', ważny: 'ważni', biały: 'biali',
  };
  for (const [lemma, vir] of Object.entries(expected)) {
    assert.equal(Dec.declineAdjective(adj(lemma), cell('pl', 'vir', 'nom')), vir, lemma);
  }
});

test('determiners match the reference table', () => {
  assert.deepEqual(paradigm((c) => Dec.declineDeterminer('ten', c)).acc, ['tego', 'ten', 'tę', 'to', 'tych', 'te']);
  assert.deepEqual(paradigm((c) => Dec.declineDeterminer('tamten', c)).acc, ['tamtego', 'tamten', 'tamtą', 'tamto', 'tamtych', 'tamte']);
  assert.deepEqual(paradigm((c) => Dec.declineDeterminer('ten', c)).ins, ['tym', 'tym', 'tą', 'tym', 'tymi', 'tymi']);
});

test('the example sentence from the brief', () => {
  const stary = adj('stary'), nowy = adj('nowy');
  assert.equal(Dec.declinePair('ten', stary, cell('sg', Dec.agreementClass('męskoosobowy', 'sg'), 'nom')), 'ten stary');
  assert.equal(Dec.declinePair('ten', nowy, cell('sg', Dec.agreementClass('żeński', 'sg'), 'gen')), 'tej nowej');
});

test('agreement classes: animals are non-virile in the plural', () => {
  assert.equal(Dec.agreementClass('męskozwierzęcy', 'sg'), 'm-anim');
  assert.equal(Dec.agreementClass('męskozwierzęcy', 'pl'), 'nonvir');
  assert.equal(Dec.agreementClass('męskoosobowy', 'pl'), 'vir');
  assert.equal(Dec.agreementClass('nijaki', 'pl'), 'nonvir');
});

test('data: stem flags agree with lemma shape; noun tags are valid', () => {
  for (const a of Data.ADJECTIVES) assert.equal(a.stem, Dec.inferStemType(a.lemma), a.lemma);
  for (const n of Data.NOUNS) {
    assert.ok(Dec.NOUN_CLASSES.includes(n.cls), n.en);
    assert.ok(n.mass ? !n.decl.pl && !n.pl : n.decl.pl && n.pl, n.en + ': mass XOR plural paradigm');
  }
  assert.equal(new Set(Data.ADJECTIVES.map((a) => a.lemma)).size, Data.ADJECTIVES.length, 'duplicate adjective');
});

test('noun paradigms are shaped consistently with their class', () => {
  const [NOM, GEN, , ACC] = [0, 1, 2, 3];
  for (const n of Data.NOUNS) {
    const { sg, pl } = n.decl;
    assert.equal(sg.length, 6, n.en);
    if (pl) assert.equal(pl.length, 6, n.en);
    // Enough distinct forms to fill three options.
    assert.ok(new Set(sg).size >= 3, n.en + ' sg has < 3 distinct forms');
    // Acc. sg.: animate masc. = gen.; inanimate masc. and neuter = nom. The animacy rule
    // is about the consonant-final masc. declension: mężczyzna declines like an -a noun
    // (acc. mężczyznę) while its modifiers still show masc. animate agreement (tego).
    const aStem = sg[NOM].endsWith('a');
    if (['męskoosobowy', 'męskozwierzęcy'].includes(n.cls) && !aStem) assert.equal(sg[ACC], sg[GEN], n.en);
    if (['męskorzeczowy', 'nijaki'].includes(n.cls)) assert.equal(sg[ACC], sg[NOM], n.en);
    if (!pl) continue;
    // Acc. pl.: virile = gen.; everything else = nom.
    assert.equal(pl[ACC], n.cls === 'męskoosobowy' ? pl[GEN] : pl[NOM], n.en);
    // Dat./ins./loc. pl. endings are uniform across classes.
    assert.match(pl[2], /om$/, n.en);
    assert.match(pl[4], /(ami|mi)$/, n.en);
    assert.match(pl[5], /ach$/, n.en);
  }
});

test('the example from the request', () => {
  const horse = Data.NOUNS.find((x) => x.en === 'horse');
  const c = cell('sg', 'm-anim', 'ins');
  assert.equal(Dec.declinePair('tamten', adj('poprzedni'), c) + ' ' + Dec.declineNoun(horse, c), 'tamtym poprzednim koniem');
});

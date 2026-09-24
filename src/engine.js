/*
 * Frame sentences + round generation.
 *
 * Each blank shows a Polish modifier (declined determiner + adjective) and an English noun;
 * the player picks the Polish noun's form. Modifier + governor + English number fix the cell.
 *
 * English has no case, so an English frame alone does not determine the Polish case
 * ("look at" = patrzeć na + acc. but przyglądać się + dat.). Each slot therefore carries
 * its Polish governor (`gov`) — a preposition, a verb, or "subject" — which the UI can show.
 * Recovering the case from the governor is part of what's being drilled.
 *
 * Frame syntax:
 *   {i}           blank for slot i
 *   [i:sg|pl]     English text agreeing in number with slot i (is|are, lives|live)
 */
(function (root) {
  'use strict';

  const req = typeof require === 'function';
  const Dec = req ? require('./declension.js') : root.MR.declension;
  const Data = req ? require('./data.js') : root.MR.data;
  const { P, A, T, F, D, L, ALL } = Data.SEM;

  const ANIM = [P, A];
  const s = (c, gov, sem) => ({ case: c, gov, sem });

  const FRAMES = [
    // --- nominative (subjects), single blank
    { text: '{0} [0:is|are] sleeping.', slots: [s('nom', 'subject', ANIM)] },
    { text: '{0} [0:is|are] on the floor.', slots: [s('nom', 'subject', [A, T, F])] },
    { text: '{0} [0:is|are] very expensive.', slots: [s('nom', 'subject', [A, T, F, D])] },
    { text: '{0} [0:is|are] right here.', slots: [s('nom', 'subject', ALL)] },

    // --- subject + object, two blanks
    { text: '{0} [0:is|are] walking to {1}.', slots: [s('nom', 'subject', ANIM), s('gen', 'do', [P, A, L])] },
    { text: '{0} [0:is|are] afraid of {1}.', slots: [s('nom', 'subject', ANIM), s('gen', 'bać się', ANIM)] },
    { text: '{0} [0:is|are] helping {1}.', slots: [s('nom', 'subject', [P]), s('dat', 'pomagać', ANIM)] },
    { text: '{0} [0:sees|see] {1}.', slots: [s('nom', 'subject', ANIM), s('acc', 'widzieć', ALL)] },
    { text: '{0} [0:is|are] eating {1}.', slots: [s('nom', 'subject', ANIM), s('acc', 'jeść', [F])] },
    { text: '{0} [0:lives|live] with {1}.', slots: [s('nom', 'subject', ANIM), s('ins', 'z', ANIM)] },
    { text: '{0} [0:is|are] talking about {1}.', slots: [s('nom', 'subject', [P]), s('loc', 'o', ALL)] },
    { text: '{0} [0:is|are] sleeping in {1}.', slots: [s('nom', 'subject', ANIM), s('loc', 'w', [L])] },

    // --- genitive
    { text: "I can't live without {0}.", slots: [s('gen', 'bez', ALL)] },
    { text: "I'm going to {0}.", slots: [s('gen', 'do', [P, A, L])] },
    { text: 'This gift is for {0}.', slots: [s('gen', 'dla', ANIM)] },
    { text: "I'm sitting next to {0}.", slots: [s('gen', 'obok', [P, A, T, L])] },
    { text: "I don't have {0}.", slots: [s('gen', 'nie mieć', [A, T, F, D])] },
    { text: "I'm looking for {0}.", slots: [s('gen', 'szukać', ALL)] },

    // --- dative
    { text: "I'm helping {0}.", slots: [s('dat', 'pomagać', ANIM)] },
    { text: "I'm giving water to {0}.", slots: [s('dat', 'dawać', ANIM)] },
    { text: "I'm taking a close look at {0}.", slots: [s('dat', 'przyglądać się', ALL)] },
    { text: "I'm against {0}.", slots: [s('dat', 'przeciwko', [P, A, T, L])] },
    { text: "Thanks to {0}, I'm happy.", slots: [s('dat', 'dzięki', [P, A, T, L])] },

    // --- accusative
    { text: 'I see {0}.', slots: [s('acc', 'widzieć', ALL)] },
    { text: "I'm buying {0}.", slots: [s('acc', 'kupować', [A, T, F, D])] },
    { text: 'I love {0}.', slots: [s('acc', 'kochać', [P, A, L])] },
    { text: "I'm waiting for {0}.", slots: [s('acc', 'czekać na', [P, A, T, F, D])] },
    { text: "I'm drinking {0}.", slots: [s('acc', 'pić', [D])] },
    { text: "I'm looking at {0}.", slots: [s('acc', 'patrzeć na', ALL)] },

    // --- instrumental
    { text: "I'm going with {0}.", slots: [s('ins', 'z', ANIM)] },
    { text: "I'm talking with {0}.", slots: [s('ins', 'rozmawiać z', [P])] },
    { text: 'The cat is sleeping under {0}.', slots: [s('ins', 'pod', [T])] },
    { text: "I'm standing in front of {0}.", slots: [s('ins', 'przed', [P, A, T, L])] },
    { text: "I'm interested in {0}.", slots: [s('ins', 'interesować się', ALL)] },

    // --- locative
    { text: "I'm thinking about {0}.", slots: [s('loc', 'myśleć o', ALL)] },
    { text: "I'm in {0}.", slots: [s('loc', 'w', [L])] },
    { text: 'The cat is lying on {0}.', slots: [s('loc', 'na', [T])] },
    { text: "I'm dreaming about {0}.", slots: [s('loc', 'marzyć o', ALL)] },
  ];

  const ALL_SETS = Object.keys(Dec.DETERMINER_SETS);

  // Second-person possessives fix the register of address. One sentence must not address
  // the listener both as ty/wy (twój, wasz) and as pan/pani/państwo, nor as two different
  // formal addressees.
  const INFORMAL_2P = ['twój', 'wasz'];
  const FORMAL_2P = ['pana', 'pani', 'państwa'];
  function registerClash(a, b) {
    const formal = (l) => FORMAL_2P.includes(l);
    const informal = (l) => INFORMAL_2P.includes(l);
    return (formal(a) && informal(b)) || (informal(a) && formal(b)) || (formal(a) && formal(b) && a !== b);
  }

  /**
   * Pick a set uniformly, then a lemma within it, so the 2 demonstratives aren't swamped by
   * 10 possessives. `used` are determiners already in the sentence.
   */
  function pickDeterminer(sets, rng, used = []) {
    const ok = (l) => !used.some((u) => registerClash(u, l));
    const bySet = sets
      .map((set) => Object.keys(Dec.DETERMINERS).filter((l) => Dec.DETERMINERS[l].set === set && ok(l)))
      .filter((ls) => ls.length);
    return pick(pick(bySet, rng), rng);
  }

  const overlaps = (a, b) => a.some((x) => b.includes(x));
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Nouns that can fill `slot` while realising agreement class `agr` in `number`. */
  function nounsFor(slot, number, agr) {
    return Data.NOUNS.filter((n) =>
      overlaps(n.sem, slot.sem) &&
      (number === 'sg' || !n.mass) &&
      (agr == null || Dec.agreementClass(n.cls, number) === agr));
  }

  function adjectivesFor(noun) {
    return Data.ADJECTIVES.filter((a) => overlaps(a.sem, noun.sem));
  }

  /** Every (frame, slot) that can realise `cell`. */
  function placementsFor(cell) {
    const out = [];
    FRAMES.forEach((frame, fi) => {
      frame.slots.forEach((slot, si) => {
        if (slot.case !== cell.case) return;
        const nouns = nounsFor(slot, cell.number, cell.agr).filter((n) => adjectivesFor(n).length);
        if (nouns.length) out.push({ frameIndex: fi, slotIndex: si, nouns });
      });
    });
    return out;
  }

  /**
   * Two wrong options: other forms of the same noun. Near misses first (same number,
   * different case); the other number only as a fallback, since the English noun gives the
   * number away. Syncretic forms collapse into one string (kota = gen. = acc.), so any
   * string different from `answer` is genuinely wrong for this cell.
   */
  function distractors(noun, cell, answer, rng) {
    const other = cell.number === 'sg' ? 'pl' : 'sg';
    const near = new Set(noun.decl[cell.number].filter((f) => f !== answer));
    const far = new Set((noun.decl[other] || []).filter((f) => f !== answer && !near.has(f)));
    return shuffle([...near], rng).concat(shuffle([...far], rng)).slice(0, 2);
  }

  function makeBlank(slot, noun, number, rng, sets, used) {
    const agr = Dec.agreementClass(noun.cls, number);
    const cell = { number, agr, case: slot.case, key: Dec.cellKey(number, agr, slot.case) };
    const det = pickDeterminer(sets, rng, used);
    used.push(det);
    const adj = pick(adjectivesFor(noun), rng);
    const answer = Dec.declineNoun(noun, cell);
    return {
      cell, noun, det, adj, gov: slot.gov, answer,
      modifier: Dec.declinePair(det, adj, cell),
      options: shuffle([answer, ...distractors(noun, cell, answer, rng)], rng),
      nounText: number === 'sg' ? noun.en : noun.pl,
    };
  }

  /** Build a round whose target blank realises `cell`. Other slots are filled freely. */
  /** sets: which DETERMINER_SETS to draw modifiers from (default: all). */
  function buildRound(cell, rng = Math.random, sets = ALL_SETS) {
    if (!sets.length) throw new Error('No determiner sets selected');
    const placements = placementsFor(cell);
    if (!placements.length) throw new Error('Unreachable cell: ' + cell.key);
    const pl = pick(placements, rng);
    const frame = FRAMES[pl.frameIndex];
    const targetNoun = pick(pl.nouns, rng);
    const blanks = frame.slots.map((slot, si) => {
      if (si === pl.slotIndex) return { noun: targetNoun, number: cell.number, slot };
      const free = (num) => nounsFor(slot, num, null).filter((n) => n !== targetNoun);
      let number = rng() < 0.6 ? 'sg' : 'pl';
      if (!free(number).length) number = 'sg';
      return { noun: pick(free(number), rng), number, slot };
    });
    const used = [];
    return {
      frame,
      blanks: blanks.map((b) => makeBlank(b.slot, b.noun, b.number, rng, sets, used)),
      parts: renderParts(frame.text, blanks.map((b) => b.number)),
      targetSlot: pl.slotIndex,
    };
  }

  /** Split a frame into text/blank parts, resolving [i:sg|pl] agreement. */
  function renderParts(text, numbers) {
    const resolved = text.replace(/\[(\d+):([^|\]]*)\|([^\]]*)\]/g,
      (_, i, sg, pl) => (numbers[+i] === 'pl' ? pl : sg));
    const parts = [];
    const re = /\{(\d+)\}/g;
    let last = 0, m;
    while ((m = re.exec(resolved))) {
      if (m.index > last) parts.push({ type: 'text', value: resolved.slice(last, m.index) });
      parts.push({ type: 'blank', index: +m[1] });
      last = re.lastIndex;
    }
    if (last < resolved.length) parts.push({ type: 'text', value: resolved.slice(last) });
    return parts;
  }

  /**
   * Cycles through all 36 cells in shuffled order, reshuffling when exhausted,
   * so full grid coverage is guaranteed every 36 rounds.
   */
  function createDeck(rng = Math.random) {
    let queue = [];
    return {
      next() {
        if (!queue.length) queue = shuffle(Dec.gridCells(), rng);
        return queue.pop();
      },
    };
  }

  const api = { registerClash, FRAMES, nounsFor, adjectivesFor, placementsFor, distractors, buildRound, renderParts, createDeck, shuffle };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MR = root.MR || {}).engine = api;
})(this);

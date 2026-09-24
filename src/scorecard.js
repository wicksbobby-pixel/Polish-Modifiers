/*
 * Cumulative scorecard: every noun form the player has been asked for, keyed by
 * noun + grid cell (not by form string, since syncretic forms like kota = gen. = acc.
 * are different things to get right). Pure data functions; storage lives in ui.js.
 */
(function (root) {
  'use strict';

  const req = typeof require === 'function';
  const Dec = req ? require('./declension.js') : root.MR.declension;
  const Data = req ? require('./data.js') : root.MR.data;

  const VERSION = 1;

  function empty() {
    return { version: VERSION, games: 0, best: 0, blanks: 0, correct: 0, forms: {} };
  }

  /** Accepts whatever came out of storage; anything unrecognised starts fresh. */
  function revive(raw) {
    if (!raw || raw.version !== VERSION || typeof raw.forms !== 'object') return empty();
    return raw;
  }

  function formKey(nounEn, cellKey) {
    return nounEn + '|' + cellKey;
  }

  /** result: { noun, cell, correct } as produced by one answered blank. */
  function record(card, result) {
    const key = formKey(result.noun.en, result.cell.key);
    const f = card.forms[key] || (card.forms[key] = { seen: 0, correct: 0 });
    f.seen++;
    card.blanks++;
    if (result.correct) { f.correct++; card.correct++; }
    return card;
  }

  function finishGame(card, score) {
    card.games++;
    card.best = Math.max(card.best, score);
    return card;
  }

  /** { cellKey: { seen, correct } } aggregated over all nouns. */
  function byCell(card) {
    const out = {};
    for (const [key, f] of Object.entries(card.forms)) {
      const cellKey = key.slice(key.indexOf('|') + 1);
      const c = out[cellKey] || (out[cellKey] = { seen: 0, correct: 0 });
      c.seen += f.seen;
      c.correct += f.correct;
    }
    return out;
  }

  /**
   * Encountered forms grouped by noun, in data order (which is grouped by class), each
   * noun's forms in grid order: [{ noun, seen, correct, forms: [{ cell, form, seen, correct }] }]
   */
  function byNoun(card) {
    const cells = Dec.gridCells();
    const out = [];
    for (const noun of Data.NOUNS) {
      const forms = [];
      for (const cell of cells) {
        const f = card.forms[formKey(noun.en, cell.key)];
        if (f) forms.push({ cell, form: Dec.declineNoun(noun, cell), seen: f.seen, correct: f.correct });
      }
      if (!forms.length) continue;
      out.push({
        noun, forms,
        seen: forms.reduce((n, f) => n + f.seen, 0),
        correct: forms.reduce((n, f) => n + f.correct, 0),
      });
    }
    return out;
  }

  const api = { empty, revive, record, finishGame, byCell, byNoun };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.MR = root.MR || {}).scorecard = api;
})(this);

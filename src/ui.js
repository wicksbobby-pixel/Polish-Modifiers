/* Drilling loop: timed 3-option choice of noun form per blank, timer shrinking as the sentences
 * of a game progress; cumulative scorecard on the home screen. */
(function () {
  'use strict';

  const { declension: Dec, engine: Eng, scorecard: Card } = window.MR;

  const ROUNDS_PER_GAME = 10;
  const STORAGE_KEY = 'modifier-rush.scorecard';

  const TIMER_START_MS = 10000;
  const TIMER_DECAY = 0.93;   // per round
  const TIMER_FLOOR_MS = 3500;
  const ADVANCE_MS = 650;     // pause after a correct answer

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  let S = null;               // game state
  let showGov = true;
  // One deck for the whole page, not per game: a 10-sentence game can't cover the
  // 36-cell grid, so coverage carries over from game to game instead.
  const deck = Eng.createDeck();

  // Scorecard persists in localStorage when available; the game works without it.
  let card = loadCard();
  function loadCard() {
    try { return Card.revive(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return Card.empty(); }
  }
  function saveCard() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(card)); } catch { /* private mode etc. */ }
  }

  function timerFor(round) {
    return Math.max(TIMER_FLOOR_MS, TIMER_START_MS * Math.pow(TIMER_DECAY, round - 1));
  }

  function show(screen) {
    for (const id of ['screen-start', 'screen-play', 'screen-end']) $(id).hidden = id !== screen;
    $('scorecard').hidden = screen !== 'screen-start';
    $('hud').hidden = screen !== 'screen-play';
  }

  function goHome() {
    if (S) {
      S.phase = 'idle';       // also cancels a pending auto-advance
      cancelAnimationFrame(S.raf);
    }
    renderScorecard();
    show('screen-start');
  }

  // Start-screen checkboxes, one per determiner set.
  for (const [set, label] of Object.entries(Dec.DETERMINER_SETS)) {
    const lab = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.value = set;
    box.checked = true;
    lab.append(box, ' ' + label);
    $('sets').append(lab);
  }
  const chosenSets = () => [...$('sets').querySelectorAll('input:checked')].map((b) => b.value);

  function startSession() {
    const sets = chosenSets();
    if (!sets.length) {
      $('sets').classList.add('invalid');
      return;
    }
    $('sets').classList.remove('invalid');
    S = {
      sets,
      total: ROUNDS_PER_GAME,
      round: 0, score: 0, streak: 0,
      results: [],           // { cell, correct, answer, chosen, noun }
      phase: 'idle',         // 'answering' | 'feedback' | 'wait'
    };
    $('hud-total').textContent = S.total;
    show('screen-play');
    nextRound();
  }

  function nextRound() {
    if (S.round >= S.total) return endSession();
    S.round++;
    S.current = Eng.buildRound(deck.next(), Math.random, S.sets);
    S.blank = 0;
    renderSentence();
    startBlank();
    updateHud();
  }

  function renderSentence() {
    const p = $('sentence');
    p.replaceChildren();
    const { parts, blanks } = S.current;
    parts.forEach((part, i) => {
      if (part.type === 'text') {
        p.append(part.value);
        return;
      }
      const b = blanks[part.index];
      const mod = el('span', 'modifier', b.modifier);
      if (i === 0) mod.classList.add('initial'); // sentence-initial: capitalised via CSS
      const wrap = el('span', 'slot');
      wrap.dataset.index = part.index;
      const gov = el('span', 'gov', b.gov);
      gov.hidden = !showGov;
      wrap.append(el('span', 'fill', '＿＿＿'), el('span', 'en', b.nounText), gov);
      p.append(mod, ' ', wrap);
    });
  }

  function slotEl(i) {
    return $('sentence').querySelector('.slot[data-index="' + i + '"]');
  }

  function startBlank() {
    const b = S.current.blanks[S.blank];
    document.querySelectorAll('.slot').forEach((s) => s.classList.remove('active'));
    slotEl(S.blank).classList.add('active');

    const opts = $('options');
    opts.replaceChildren();
    b.options.forEach((o, i) => {
      const btn = el('button', 'option');
      btn.append(el('kbd', null, String(i + 1)), ' ' + o);
      btn.addEventListener('click', () => answer(i));
      opts.append(btn);
    });
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';

    S.phase = 'answering';
    S.deadline = performance.now() + timerFor(S.round);
    S.duration = timerFor(S.round);
    cancelAnimationFrame(S.raf);
    tick();
  }

  function tick() {
    if (S.phase !== 'answering') return;
    const left = S.deadline - performance.now();
    const frac = Math.max(0, left / S.duration);
    const bar = $('timer-bar');
    bar.style.width = (frac * 100) + '%';
    bar.classList.toggle('low', frac < 0.3);
    if (left <= 0) return answer(null);
    S.raf = requestAnimationFrame(tick);
  }

  function answer(i) {
    if (S.phase !== 'answering') return;
    cancelAnimationFrame(S.raf);
    const b = S.current.blanks[S.blank];
    const chosen = i == null ? null : b.options[i];
    const correct = chosen === b.answer;
    const remaining = Math.max(0, S.deadline - performance.now());

    S.results.push({ cell: b.cell, correct, answer: b.answer, chosen, modifier: b.modifier, gov: b.gov });
    Card.record(card, { noun: b.noun, cell: b.cell, correct }); // recorded per answer, so a quit game still counts
    saveCard();
    if (correct) {
      S.streak++;
      S.score += 100 + Math.round(remaining / 50) + Math.min(S.streak, 10) * 10;
    } else {
      S.streak = 0;
    }
    updateHud();

    const slot = slotEl(S.blank);
    const fill = slot.querySelector('.fill');
    fill.textContent = b.answer;
    slot.classList.remove('active');
    slot.classList.add(correct ? 'right' : 'wrong');

    [...$('options').children].forEach((btn, j) => {
      btn.disabled = true;
      if (b.options[j] === b.answer) btn.classList.add('right');
      else if (j === i) btn.classList.add('wrong');
    });

    const label = Dec.cellLabel(b.cell);
    const fb = $('feedback');
    if (correct) {
      fb.textContent = '✓ ' + label;
      fb.classList.add('ok');
      S.phase = 'feedback';
      setTimeout(advance, ADVANCE_MS);
    } else {
      fb.replaceChildren(
        chosen == null ? '⏱ Time — ' : '✗ ',
        b.modifier + ' ', el('b', null, b.answer),
        ' · ' + label + ' · ' + b.gov + ' · ' + b.noun.pol + ' (' + b.noun.cls + ')'
          + ' · ' + b.det + ' = ' + Dec.DETERMINERS[b.det].gloss,
        el('span', 'hint', '  Space to continue'));
      fb.classList.add('bad');
      S.phase = 'wait';
    }
  }

  function advance() {
    if (!S || (S.phase !== 'feedback' && S.phase !== 'wait')) return;
    if (S.blank < S.current.blanks.length - 1) {
      S.blank++;
      startBlank();
    } else {
      nextRound();
    }
  }

  function updateHud() {
    $('hud-round').textContent = S.round;
    $('hud-score').textContent = S.score;
    $('hud-streak').textContent = S.streak;
  }

  function endSession() {
    S.phase = 'idle';
    Card.finishGame(card, S.score);
    saveCard();
    const n = S.results.length;
    const ok = S.results.filter((r) => r.correct).length;
    $('end-title').textContent = 'Score: ' + S.score;
    $('end-stats').textContent = ok + ' / ' + n + ' blanks correct (' + Math.round((100 * ok) / Math.max(n, 1)) + '%)';
    renderGrid($('end-grid'), statsFromResults(S.results));
    renderMisses();
    show('screen-end');
  }

  function statsFromResults(results) {
    const out = {};
    for (const r of results) {
      const c = out[r.cell.key] || (out[r.cell.key] = { seen: 0, correct: 0 });
      c.seen++;
      if (r.correct) c.correct++;
    }
    return out;
  }

  const tier = (correct, seen) => (correct === seen ? 'all' : correct === 0 ? 'none' : 'some');

  /** Case × agreement-class table; stats: { cellKey: { seen, correct } }. */
  function renderGrid(t, stats) {
    t.replaceChildren();
    const cols = [...Dec.SG_CLASSES.map((a) => ['sg', a]), ...Dec.PL_CLASSES.map((a) => ['pl', a])];
    const head = el('tr');
    head.append(el('th'));
    for (const [num, agr] of cols) head.append(el('th', null, (num === 'sg' ? 'sg ' : 'pl ') + agr));
    t.append(head);
    for (const c of Dec.CASES) {
      const tr = el('tr');
      tr.append(el('th', null, c));
      for (const [num, agr] of cols) {
        const st = stats[Dec.cellKey(num, agr, c)];
        const td = el('td', null, st ? st.correct + '/' + st.seen : '·');
        if (st) td.className = tier(st.correct, st.seen);
        td.title = Dec.cellLabel({ number: num, agr, case: c });
        tr.append(td);
      }
      t.append(tr);
    }
  }

  function renderScorecard() {
    const pct = card.blanks ? Math.round((100 * card.correct) / card.blanks) : 0;
    const cellsSeen = Object.keys(Card.byCell(card)).length;
    $('card-totals').textContent = card.blanks
      ? card.games + ' game' + (card.games === 1 ? '' : 's') + ' · ' + card.correct + '/' + card.blanks
        + ' forms right (' + pct + '%) · ' + cellsSeen + '/36 grid cells seen · best score ' + card.best
      : 'Nothing yet. Play a game and every form you’re asked for will show up here.';
    $('card-body').hidden = !card.blanks;
    $('reset').hidden = !card.blanks;
    if (!card.blanks) return;

    renderGrid($('card-grid'), Card.byCell(card));

    const box = $('card-forms');
    box.replaceChildren();
    for (const entry of Card.byNoun(card)) {
      const row = el('div', 'noun-row');
      const head = el('div', 'noun-head');
      head.append(el('b', null, entry.noun.pol), ' ' + entry.noun.en,
        el('span', 'cls', entry.noun.cls), el('span', 'tally', entry.correct + '/' + entry.seen));
      const chips = el('div', 'chips');
      for (const f of entry.forms) {
        const chip = el('span', 'chip ' + tier(f.correct, f.seen));
        chip.append(f.form, el('sub', null, f.cell.case + (f.cell.number === 'pl' ? ' pl' : '')));
        chip.title = Dec.cellLabel(f.cell) + ' — ' + f.correct + '/' + f.seen;
        chips.append(chip);
      }
      row.append(head, chips);
      box.append(row);
    }
  }

  function renderMisses() {
    const box = $('end-misses');
    box.replaceChildren();
    const misses = S.results.filter((r) => !r.correct);
    if (!misses.length) return;
    box.append(el('h3', null, 'Misses'));
    const ul = el('ul', 'misses');
    for (const m of misses) {
      const li = el('li');
      li.append(m.modifier + ' ', el('b', null, m.answer), ' — ' + Dec.cellLabel(m.cell) + ', ' + m.gov
        + (m.chosen ? ' (you: ' + m.chosen + ')' : ' (timed out)'));
      ul.append(li);
    }
    box.append(ul);
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || (e.target.tagName === 'INPUT' && e.key !== 'Enter')) return;
    const k = e.key;
    if (k === 'g' || k === 'G') {
      showGov = !showGov;
      document.querySelectorAll('.gov').forEach((g) => (g.hidden = !showGov));
      return;
    }
    if (k === 'Escape') {
      if ($('screen-start').hidden) goHome();
      return;
    }
    const playing = !$('screen-play').hidden;
    if (!playing) {
      if (k === 'Enter') { e.preventDefault(); startSession(); }
      return;
    }
    if (S.phase === 'answering' && ['1', '2', '3'].includes(k)) answer(+k - 1);
    else if (S.phase === 'wait' && (k === ' ' || k === 'Enter')) { e.preventDefault(); advance(); }
  });

  $('start').addEventListener('click', startSession);
  $('again').addEventListener('click', startSession);
  $('home').addEventListener('click', goHome);
  $('quit').addEventListener('click', goHome);
  $('reset').addEventListener('click', () => {
    if (!confirm('Reset the scorecard? This clears every recorded form.')) return;
    card = Card.empty();
    saveCard();
    renderScorecard();
  });
  renderScorecard();
  $('feedback').addEventListener('click', () => S && S.phase === 'wait' && advance());
})();

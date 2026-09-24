/* Drilling loop: timed 3-option choice per blank, timer shrinking as rounds progress. */
(function () {
  'use strict';

  const { declension: Dec, engine: Eng } = window.MR;

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

  let S = null;               // session state
  let showGov = true;

  function timerFor(round) {
    return Math.max(TIMER_FLOOR_MS, TIMER_START_MS * Math.pow(TIMER_DECAY, round - 1));
  }

  function show(screen) {
    for (const id of ['screen-start', 'screen-play', 'screen-end']) $(id).hidden = id !== screen;
    $('hud').hidden = screen !== 'screen-play';
  }

  function startSession() {
    S = {
      total: +$('rounds').value,
      round: 0, score: 0, streak: 0,
      deck: Eng.createDeck(),
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
    S.current = Eng.buildRound(S.deck.next());
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
      const wrap = el('span', 'slot');
      wrap.dataset.index = part.index;
      const fill = el('span', 'fill', '＿＿＿');
      const noun = el('span', 'noun', ' ' + b.nounText);
      const gov = el('span', 'gov', b.gov);
      gov.hidden = !showGov;
      wrap.append(fill, gov);
      p.append(wrap, noun);
      if (i === 0) wrap.classList.add('initial'); // sentence-initial: capitalised via CSS
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

    S.results.push({ cell: b.cell, correct, answer: b.answer, chosen, noun: b.nounText, gov: b.gov });
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
        el('b', null, b.answer),
        ' · ' + label + ' · ' + b.gov + ' ' + b.adj.lemma + ' (' + b.gloss + ')',
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
    const n = S.results.length;
    const ok = S.results.filter((r) => r.correct).length;
    $('end-title').textContent = 'Score: ' + S.score;
    $('end-stats').textContent = ok + ' / ' + n + ' blanks correct (' + Math.round((100 * ok) / Math.max(n, 1)) + '%)';
    renderGrid();
    renderMisses();
    show('screen-end');
  }

  function renderGrid() {
    const t = $('end-grid');
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
        const key = Dec.cellKey(num, agr, c);
        const rs = S.results.filter((r) => r.cell.key === key);
        const ok = rs.filter((r) => r.correct).length;
        const td = el('td', null, rs.length ? ok + '/' + rs.length : '·');
        if (rs.length) td.className = ok === rs.length ? 'all' : ok === 0 ? 'none' : 'some';
        td.title = Dec.cellLabel({ number: num, agr, case: c });
        tr.append(td);
      }
      t.append(tr);
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
      li.append(el('b', null, m.answer), ' ' + m.noun + ' — ' + Dec.cellLabel(m.cell) + ', ' + m.gov
        + (m.chosen ? ' (you: ' + m.chosen + ')' : ' (timed out)'));
      ul.append(li);
    }
    box.append(ul);
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT') return;
    const k = e.key;
    if (k === 'g' || k === 'G') {
      showGov = !showGov;
      document.querySelectorAll('.gov').forEach((g) => (g.hidden = !showGov));
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
  $('feedback').addEventListener('click', () => S && S.phase === 'wait' && advance());
})();

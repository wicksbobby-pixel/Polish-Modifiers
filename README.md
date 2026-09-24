# Modifier Rush

A timed drill for Polish noun declension. Each sentence is an English frame. At each blank
you see a declined Polish determiner or possessive + adjective, with the English noun and
its Polish governor underneath. You pick the Polish noun in the right form from three
options, all forms of the same noun:

> I'm interested in tamtym poprzednim **[horse]** → koń / konia / **koniem**

The modifier and the governor give you the case. The governor settles syncretic modifiers:
*tej nowej* is gen., dat. or loc. The English noun gives you the number.

## Run

Open `index.html` in a browser. It needs no build or server (it uses classic scripts, so it
works from `file://`). Tests: `npm test` (Node ≥ 18, no dependencies).

| Key | Action |
|---|---|
| `Enter` | Start a game / play again |
| `1` `2` `3` | Answer |
| `Space` | Continue after a miss |
| `G` | Show/hide governor hints |
| `Esc` | Back to the home screen (from a game or the end screen) |

### If Start does nothing

A red banner at the top of the page names what failed. Almost always the cause is a local
copy that is out of date or incomplete: a stale cached script, or a missing `src/` file.
Pull the latest code, check that all five files in `src/` are present, and hard-reload
(Ctrl/Cmd+Shift+R). Asset links carry a `?v=` version, so bump it in `index.html` whenever
the files change.

## How a game works

- **10 sentences per game,** with 1–2 blanks each. The timer starts at 10 s per blank and
  shrinks 7% per sentence (floor 3.5 s). Points: 100 per correct blank, plus a bonus for
  time left and for your streak.
- **Coverage:** a shuffled deck deals all 36 grid cells (4 sg. classes × 6 cases + 2 pl.
  classes × 6 cases) once before any cell repeats. The deck lasts for the whole page visit,
  so about three or four games cover the full grid.
- **Feedback on a miss** shows the full phrase, the cell (e.g. *ins. sg. masc. animate*),
  the governor, the noun's class tag and a gloss of the modifier.
- **End screen:** your score, the cells you saw this game, and a list of misses.

## Home screen

- **Modifier toggles.** Each blank picks one of the enabled sets at random, then a word from
  that set:

  | Set | Words | Agreement |
  |---|---|---|
  | this / that | *ten, tamten* | full paradigm |
  | my, our + your (informal) | *mój, twój, nasz, wasz* | full paradigm (virile *moi, twoi, nasi, wasi*) |
  | your (formal) | *pana, pani, państwa* | invariable: genitive of *pan/pani/państwo* |
  | his, her, their | *jego, jej, ich* | invariable: genitive of *on/ona/oni* |

  With invariable possessives only the adjective shows the case (*pana starym* [horse]).
  One sentence never mixes second-person registers (*pani* … *twoim*) or two different
  formal addressees (*pana* … *pani*). Reflexive *swój* is left out, because choosing it
  depends on whether the owner is the subject, which the frames don't record.

- **Scorecard (cumulative).** It shows:
  - totals: games played, forms right, grid cells seen, best score
  - a case × agreement-class grid
  - every noun form you've been asked for, grouped by noun and coloured by accuracy

  Forms are tracked per noun + cell, so *konia* as gen. and *konia* as acc. are counted
  separately. The scorecard is saved in `localStorage`, and answers count as soon as you
  give them, including in a game you quit. **Reset** clears it. Without storage (e.g. in a
  private window), it lasts until you reload the page.

## Content

- **39 nouns** across the five Polish classes (*męskoosobowy, męskozwierzęcy, męskorzeczowy,
  żeński, nijaki*): the original seed set plus nouns from the Duolingo export. Some are
  there because they're traps: *man* (*mężczyzna*, an *-a* noun that is masc. personal),
  *child* (*dziecko*: neuter sg., non-virile pl. *te małe dzieci*), *mouse* (*mysz*,
  feminine), *school* (*szkoła*, feminine). *tomato* is left out on purpose: *pomidor* often
  takes animate acc. in speech (*jem pomidora*), so it has no single right answer. Mass
  nouns (*coffee, water, food*…) appear only in the singular.
- **62 adjectives,** each tagged with the kinds of noun it can describe (person, animal,
  thing, food, drink, place) so only plausible pairs are generated: no *smaczny* horse.
- **38 frame sentences,** each slot tagged with its case, its Polish governor and the kinds
  of noun it allows.

## Layout

| File | Contents |
|---|---|
| `index.html`, `style.css` | Screens (home, play, end), load-error banner, light/dark theme |
| `src/declension.js` | Case × agreement-class grid; determiner and possessive tables; adjective endings, stem types and virile nom. pl. alternations; noun lookup |
| `src/data.js` | Nouns (English, class tag, semantic tags, hand-written sg./pl. paradigms); adjectives (lemma, stem type, semantic tags) |
| `src/engine.js` | Frames, round builder, noun-form distractors, register-clash rule, coverage deck |
| `src/scorecard.js` | Per-form tallies and their aggregation for the home screen |
| `src/ui.js` | Game loop, timer, home/end screens, storage |
| `test/*.test.js` | Paradigms, agreement, coverage, generated rounds, scorecard |

## Linguistic design notes

- **Modifiers are generated; nouns are looked up.** Determiners and adjectives are fully
  rule-governed. Noun endings are lexical: gen. sg. *-a/-u* (*komputera* but *stołu*), stem
  alternations (*stół → stole*, *pies → psa*), suppletion (*brat → bracia*). So each noun
  has a hand-written paradigm, tested against its class's syncretisms (acc. = gen. or nom.,
  virile acc. pl. = gen. pl., uniform *-om/-ami/-ach*). *mężczyzna* is exempt from the
  acc. = gen. check: it declines like a feminine (*mężczyznę*) but takes masc. animate
  agreement (*tego mężczyznę*).
- **Three adjective stem types.** Hard (*dobry*), velar (*wysoki*) and soft (*tani*). Velar
  stems insert *i* before every *e*/*y* ending (*wysokiego, wysokim, wysokie*), not only in
  the nom. Soft stems also do it before *a*/*ą* (*tania* vs. *wysoka*).
- **The virile nom. pl. comes from consonant alternations** (*dobrzy, duzi, czyści, susi,
  młodzi, drodzy, niscy*), applied as ordered rules. Exceptions are overridden per word
  (*wesoły → weseli*). There are deliberately no bare *z*/*zn* rules: they would match the
  *cz* digraph (*\*smacźni*).
- **Distractors are other forms of the same noun,** mostly same number, different case.
  Forms that are spelled the same collapse into one option, so a wrong option is never
  secretly right. *pokój* has two standard gen. pl. forms (*pokoi*, *pokojów*); only
  *pokoi* is used.
- **Governors are shown** because English has no case: "look at X" could be *patrzeć na* +
  acc. or *przyglądać się* + dat.
- **Accusative fem. of *ten* is the standard *tę*.** The colloquial *tą* is not used.

## Coverage guarantee

The tests check that every one of the 36 cells can be reached through at least two frames,
and with each modifier set alone. They also build 3,000 random rounds and check the options,
paradigm lookups, semantic compatibility and register consistency.

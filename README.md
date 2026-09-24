# Modifier Rush

A timed drill for Polish determiner + adjective agreement. Each sentence is an English frame
with bare English nouns. Each blank holds a determiner (*ten* or *tamten*) plus an adjective,
and you pick the form declined correctly for the noun's gender, number and animacy and for
the case its governor assigns:

> **Ten stary** man is walking to **tej nowej** school.

## Run

Open `index.html` in a browser. It needs no build or server (it uses classic scripts, so it
works from `file://`).

Keys: `1` `2` `3` answer · `Space` continue after a miss · `G` show/hide governor hints · `Enter` start.

Tests: `npm test` (Node ≥ 18, no dependencies).

## Layout

| File | Contents |
|---|---|
| `src/declension.js` | Case × agreement-class grid, determiner tables, adjective endings, stem-type rules, virile nom. pl. alternations |
| `src/data.js` | Nouns (English + Polish class tag + semantic tags) and adjectives (lemma + stem type) |
| `src/engine.js` | Frame sentences (each slot has its case, Polish governor and allowed semantic classes), round builder, distractors, coverage deck |
| `src/ui.js` | The timed drilling loop and the end-of-session grid |

## Design notes: where this departs from the original brief

- **Velar stems differ from hard stems in more than two cells.** *k*/*g* can't be followed by
  *y*/*e* in the spelling, so every ending that starts with *e* or *y* changes: *wysokiego,
  wysokiemu, wysokim, wysokich, wysokie*. They don't just differ in the nom. masc. sg. and
  the virile pl. If you take "gen./dat./ins./loc. unaffected" literally, you get *\*wysokego*.
- **There are three stem types, not two.** *tani* and *poprzedni* are soft stems: *tania,
  tanią, taniego*. They differ from velar stems in the fem. forms (*wysoka* but *tania*).
- **A stem-type flag can't produce the virile nom. pl.** It needs consonant alternations:
  *dobry → dobrzy, duży → duzi, czysty → czyści, suchy → susi, młody → młodzi, drogi →
  drodzy*. `declension.js` has these as ordered rules, plus a per-lemma override for
  lexical exceptions (*wesoły → weseli*, which also changes o to e).
- **Case needs a governor.** English has no case, so "look at X" could be *patrzeć na* + acc.
  or *przyglądać się* + dat. Each slot shows its Polish governor. Working out the case from
  the governor is part of the drill.
- **Adjectives have semantic restrictions.** Pairs like *tego plastikowego* man or *smaczny*
  horse are grammatical noise. Adjectives and nouns carry coarse semantic tags (person,
  animal, thing, food, drink, place) so that only plausible pairs are generated.
- **The noun list is larger than the seed set.** With the original 14 nouns, every masc.
  inanimate cell would have been *table*. I added nouns from the Duolingo export. Some of
  them are there because they're traps: *child* (*dziecko*, neuter sg., non-virile pl.
  *te małe dzieci*), *mouse* (*mysz*, feminine) and *man* (*mężczyzna*, an *-a* noun that is
  masc. personal). *tomato* is left out on purpose, because *pomidor* often takes animate
  acc. in speech (*jem pomidora*).
- **Accusative fem. of *ten* is *tę*.** The colloquial *tą* is not accepted. *tą* can appear
  as a distractor (it is the instrumental form).

## Coverage guarantee

`test/engine.test.js` checks that all 36 cells (4 sg. classes × 6 cases + 2 pl. classes × 6
cases) can be reached, each through at least two different frames. It also builds 3,000
random rounds and checks their options. In play, a shuffled deck deals every cell once
before any cell repeats, so a 36-round session covers the full grid.

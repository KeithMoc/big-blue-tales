# How the book talks to children

Every word a child reads or hears follows these rules. `node tools/tone.mjs` checks what a machine can check;
the word lists and reading grades are in `tools/tone.words.json`.

| Rule | Write | Not |
| --- | --- | --- |
| Friendly, never frightening | "It catches small fish." | "It kills its victims." |
| The animal is never the villain | "It eats to grow, like you do." | "A savage hunter." |
| Eating is plain and short | "Gulp! The little fish is gone." | blood, tearing, pain |
| Facts stay true | "Its sting hurts a lot, so do not touch." | leaving the danger out |
| Dying is said gently and only when it is the fact | "They died out long ago." | "They were wiped out." |
| Boys, girls and babies are plain facts | "Some fish start life as a girl and become a boy as they grow." | grown-up words, jokes, anything about people |
| No wrong or right way to be an animal | "The male is tiny. That is normal for anglerfish." | "weird", "ugly", "freak" |
| Short sentences | ages 5 to 7: grade 3 or below, 34 words. Ages 8 to 10: grade 6 or below, 75 words | long sentences with several facts |
| Numbers a child can picture | "as long as a bus" | "12.6 metres" alone |
| Say what is invented | "We drew the glow so you can see it." | showing a guess as fact |

Everything said comes from the pack's fact dossier. If a fact is not in the dossier, it is not in the book.

## The check

```
node tools/tone.mjs            # fails on a "never" word; lists "review" words and lines above the reading grade
node tools/tone.mjs --strict   # also fails on a line above the grade
```

- `never`: words with no place in the book (kill, savage, gory, ugly...). The check fails.
- `review`: words that are fine as a plain fact (venom, stuns, died) but deserve a second look. Listed, not failed.
- Reading grade is Flesch-Kincaid: a rough ruler, the same for every line. Long animal names push it up.

State on 2026-11-22: 748 lines in 26 packs, 0 with a never word, 25 to review, 32 above the grade.

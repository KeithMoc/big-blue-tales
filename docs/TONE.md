# How the stories talk to children

Every word a child reads or hears follows these rules. `node tools/story-check.mjs` checks what a machine can
check; the word lists and the reading grade are in `tools/tone.words.json`.

| Rule | Write | Not |
| --- | --- | --- |
| Friendly, never frightening | "It catches small fish." | "It kills its victims." |
| The animal is never the villain | "It eats to grow, like you do." | "A savage hunter." |
| Eating is plain and short | "Gulp! The little fish is gone." | blood, tearing, pain |
| Facts stay true | "Its sting hurts a lot, so do not touch." | leaving the danger out |
| Dying is said gently and only when it is the fact | "They died out long ago." | "They were wiped out." |
| Boys, girls and babies are plain facts | "Some fish start life as a girl and become a boy as they grow." | grown-up words, jokes, anything about people |
| No wrong or right way to be an animal | "The male is much smaller. That is normal for some fish." | "weird", "ugly", "freak" |
| Short sentences | ages 5 to 7: reading grade 3 or below | long sentences with several facts |
| Numbers a child can picture | "as long as a bus" | "12.6 metres" alone |
| Say what is invented | "This is just for fun. Nobody has seen anchovies do it." | showing a guess as fact |

Everything said comes from the story's sources (`sources` in its `scene.json`, each with a quote) or from a guest
animal's signed dossier (`animals/<id>/dossier.json`). If a fact is in neither, it is not in the story.

## The check

```
node tools/story-check.mjs            # fails on a "never" word; lists "review" words and lines above the reading grade
node tools/story-check.mjs --strict   # also fails on a line above the grade
```

It reads every line a child can read or hear: each part and its reason, each time of day, the Play notes, the
words about a guest animal (`links`), and the big ideas and places in `scenes/index.json`.

- `never`: words with no place in a story for children (kill, savage, gory, ugly...). The check fails.
- `review`: words that are fine as a plain fact (venom, stuns, died) but deserve a second look. Listed, not failed.
- Reading grade is Flesch-Kincaid: a rough ruler, the same for every line. Short lines with long animal names push
  it up.

State on 2026-11-26: 17 lines in 1 story, 0 with a never word, 0 to review, 1 above grade 3 ("Sea lions eat
anchovies.", grade 3.7, which the ruler scores high because of the long words in a four-word line).

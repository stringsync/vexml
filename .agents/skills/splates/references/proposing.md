# Proposing

Propose only when the user asks what you think, so they can approve it or
challenge what it rests on. Otherwise build, asking each call the user's
answer would change as a question (see [Questions](questions.md)) rather than a proposal.

A proposal is one block: a `## 💡 Proposed <subject>` title, the subject a
few words on what you would build, then what you recommend and why, briefly.
It ends with each call it rests on that the user has not settled, as
questions numbered from 1 (see [Questions](questions.md)).

```markdown
## 💡 Proposed a card for proposals

Fold proposals into the questions card, each call a question with a pick:
that card already tags a `(chosen)` choice, so one card asks everything.

1. Where should a proposal's calls come from?
   - (a) The reply, so a proposal works outside a task too (chosen)
   - (b) `SPLATES.md`, so every proposal needs a task
2. What should its button say?
```

In a task, write each call under `## Blocked` too, then end your turn; ask
nothing else beside it.

The `splates server` page shows a proposal as a questions card headed by it, each
call with a `(chosen)` choice already answered with it. Once every call is
answered and the user has changed none of your choices, its button approves,
sending `[SPLATES APPROVE]`, then the answer to each call you chose nothing
for, quoted as any answer is (see [Keeping Blocked current](questions.md#keeping-blocked-current)). That, or a reply
of "approve", means go ahead as proposed, taking in each answer, every call
not quoted as you chose it, after `splates add` when no task is under way. A
reply without it, as the card sends once the user picks another choice,
changes a call or writes anything else, answers what it quotes: take that
in and propose again.


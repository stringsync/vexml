---
name: review
description: "Review a change against the RULE.md rules in this project's .wiz/rules directory by handing blocks of rules to separate agents, without reading a rule yourself. Use only when the project has a .wiz/rules directory and the user asks to run, check, or apply the rules, the wiz rules, or the webappwiz rules to a change, or asks to write, add, or edit a rule there. Not for a general code review, a pull request review, a security review, or any review that does not name the rules."
version: 0.0.14
---

# Reviewing against the rules

The rules are markdown, one per directory under `.wiz/rules`, each a `RULE.md`
another agent reads. You never read one. Reading rules loads their prose into
your context and you start reasoning about style instead of running the
review, so the whole loop is built to keep them out of your sight: the CLI
divides the work into blocks that name the rules' files, and whoever gets the
block opens them.

Run the CLI with `bunx @webappwiz/cli rules <command>`. `rules --help` lists
the commands; this file covers only what the CLI cannot tell you.

## The loop

1. Make sure the work is finished and its tests pass. Review is the last step,
   not a way to find out what to build.
2. Run `rules review --since <ref>`, with the ref the change is measured from:
   `main` for a branch, `HEAD` for uncommitted work. It prints a summary line
   and then one block per unit of work, each starting with a `## ` heading.
   A block gathers the rules that match the same files, so its agent reads
   each file once and judges it against all of them rather than once a rule.
   Read the summary line before anything else: when it says more blocks than
   about twenty, stop and ask before starting any (see below).
3. Run every block through whatever this harness gives you for parallel work:
   subagents, background tasks, a workflow, whatever is at hand. One agent per
   block, started together, each in a worktree of its own, each given the whole
   block verbatim as its prompt and nothing else. The block already says which
   rules to read, which files to judge, how to see the change, and how to
   answer. Never put two blocks in front of the same agent, and never run one
   yourself: both end with rules in a context that is supposed to stay clear of
   them. If nothing here runs work in parallel, still send one block to one
   agent and do it in turn.
4. Collect the replies. Each is a JSON array of `{rule, file, line, message}`,
   empty when the block's rules found nothing.
5. Write the report, findings then fix plan, to a timestamped file under
   `.wiz/reviews`, and print the same thing in your reply. Then ask the user
   whether to run the fix plan as written, change it, or leave it, and stop
   there. Fixing is a separate decision, and the plan is there to be cut down
   or ignored, not to be started.

If a block's reply is not a JSON array, run that block again once, then
report it as unanswered rather than guessing what it found.

## The report

The report goes in a file of its own, named for the moment the review
finished: `.wiz/reviews/2026-09-04-143251.md`, `YYYY-MM-DD-HHMMSS` in local
time, so a listing sorts oldest first and two reviews of one change never
collide. Create `.wiz/reviews` if it is not there. Print the same report in
your reply and print the path with it, since the file is the copy that
outlives the session.

It opens with the summary line as `rules review` printed it, so the page says
what it covered. Then the findings, grouped by file and laid out the way a
linter lays them out, because that is the shape everyone already reads without
being taught: the file as a heading, then one line a finding, the line number
first, then the level the block listed beside that rule's path, then the
message, then the rule that raised it, padded into columns.

The level carries its emoji, 🛑 for an error and ⚠️ for a warning, because a
page of findings is skimmed for the serious ones before it is read. Every
finding line gets exactly one, so the columns stay even whatever width the
terminal gives it; pad them by eye rather than by counting characters.

````markdown
# Review 2026-09-04 14:32:51

9 files changed since main; 17 rules matched, 6 blocks to review.

## Findings

### packages/cli/rules/review.ts

```
  42  🛑 error    the export sits below two helpers     export-leads-the-file
  87  ⚠️ warning  the comment restates the next line    comments-say-why-not-what
```

### packages/cli/skills/add.ts

```
  13  🛑 error    the options object is not last        named-options-last
```

🛑 3 problems (2 errors, 1 warning)
````

A file no rule found anything in does not appear. A review that found nothing
says so where the findings would be, `✅ No findings.` in place of the tally,
and still gets its file: a record that the rules ran and were quiet is worth
as much as a list of what they caught.
A block that never answered goes under `## Unanswered` with its heading line
and the files it covered, so what the review missed is on the page rather than
absent from it, and so is any block the user chose not to run.

## The fix plan

The report ends with the plan, because a page of findings raises the question
of who fixes them, and how the fixing divides is already settled: one agent a
file, holding every finding that file has. So the plan is arithmetic on the
findings, and writing it out is what lets the user shrink it before anything
is spent.

````markdown
## Fix plan

| agent | file | findings | rules |
| ----- | ---- | -------- | ----- |
| 1 | `packages/cli/rules/review.ts` | 2 | export-leads-the-file, comments-say-why-not-what |
| 2 | `packages/cli/skills/add.ts` | 1 | named-options-last |

2 agents, run together, each in a worktree of its own. Nothing runs until you
say so.
````

Printing the plan is not offering it. End your reply with the question itself,
in as many words: ask the user whether to run the plan as written, to change it
before it runs, or to leave it. A plan that merely sits at the bottom of a
report gets read as work you are about to start, and the user finds out you
started it by seeing the files change.

Say what changing it means, since the user cannot shrink a plan they cannot see
the seams of: they can take part of it instead, by file or by level. Dropping
the warnings and fixing the errors is the usual answer. A plan of many agents
is worth saying out loud the way an expensive review is.

Then wait. Nothing runs until the user answers, and an answer to some other
question is not an answer to this one.

## One worktree an agent

Every agent you start works in a checkout of its own, however this harness
makes one. Agents sharing a working tree overwrite each other's work.

What goes wrong is not two agents editing one file. It is an agent tidying up.
One of them runs the project's own fix or test command to check itself, and
that command rewrites files across the repo, or fails in files the agent never
touched because another agent is halfway through writing them. It cannot tell
that work from its own mess, so it reaches for `git stash` or `git checkout --`
to find out, and takes every other agent's work with it. Then it reports
success, because the edit it made is still there in the file it was looking at.

Where the harness cannot give an agent its own tree, say so in the prompt: no
command that changes git state, `stash`, `checkout`, `restore`, `reset` and
`clean` alike, and nothing run repo-wide. It checks the files its block names
and nothing else.

Either way, look at the files yourself before you report what the agents found
or changed. An agent whose work was destroyed still says it succeeded.

## When the review is expensive

Printing blocks spawns nothing, so `rules review` itself costs nothing; the
agents are the cost, and the summary line counts them. Each one reads its
rules, its files and the diff, so a review of twenty blocks is twenty agents
started at once, each reading files, and the bill climbs with the change and
with how many rules the project has. Past about twenty blocks, or fewer when
the files themselves are large, do not start them. Tell the user the summary
line as printed, that this many agents are about to start together, and ask
how to proceed. Wait for the answer; a review nobody asked to pay for is worse
than one that waits. The ways to shrink it:

- Measure from a nearer ref, so `--since` covers less of the change.
- Run only the blocks whose files the user cares about, and say which were
  skipped when reporting.
- Raise `--budget` so fewer, larger blocks cover the same change.

`--budget <pairs>` is the most rule-file pairs one block holds, one number
applied to every complexity in place of the defaults (40 for `low`, 16 for
`medium`, 25 for `high`). Rules per block stay capped as they were, so a block
of `r` rules takes `budget / r` files: four `medium` rules under `--budget 32`
cover eight files a block instead of four. Fewer, larger blocks means fewer
agents, and each rule and file read fewer times over. Run `rules review`
again with the flag and the summary line shows the new count before anything
is spent; take a number the user agrees to, not one that merely gets under
the line.

What raising it costs, and say so when offering it:

- Each agent holds more in its context, so its judgment thins: it reads each
  file less carefully and misses more. `high` rules suffer most, since the
  default hands them one rule a block on purpose, and a bigger budget hands
  that rule more files.
- One number lands on every complexity. A raise that is mild for `low` is
  large for `medium`, whose default is the smallest.
- Each block runs longer, so fewer agents does not mean a faster review, and
  a block too big for its agent to read in full answers about the part it
  read.
- It cannot merge blocks the rule cap splits: with one changed file and
  sixteen `low` rules there are two blocks at any budget.

Lowering it is the reverse: more, smaller, sharper blocks, worth it when a
change is small and the findings matter more than the agents.

## Choosing a model

A block holds rules of one complexity, and its heading carries it:

```
## block 6 (5 rules, 8 files, complexity low)
```

Complexity is how hard a rule is to judge. `low` is a grep or a count:
give it the cheapest, fastest model available. `high` is design judgment
across a whole file: give it the strongest. `medium` is whatever the harness
uses by default. Ignore all of this when the system you run the blocks
through does not let you choose one.

## Fixing

When the user takes the fix plan, or the part of it they picked, run it: one
agent a file, in parallel the same way and in its own worktree the same way,
each given every finding that file has and a prompt like this, and nothing
else about the rules:

```
Read `.wiz/rules/<id>/RULE.md` for each rule named below. In `<file>`:
- line <line>: the code <message> (rule <id>)
- line <line>: the code <message> (rule <id>)
Change the code so it follows those rules, touching as little as you can.
```

It reads the rules and decides the fixes. You still have not read them.

A file at a time, not a finding at a time, because two findings in one file are
usually one piece of work. Hand them to separate agents and the second one
meets the first one's fix as ordinary existing code, with nothing on it to say
it was a decision, and rewrites back over it on its way to its own finding.
Running the two in order does not help, since the reverting happens in order
too, and both agents report success either way.

The agents are writing this time, and each holds a tree of its own, so the work
has to come back to you. Where this project has a way to land an agent's
branch, tell it to commit and use that: a branch is exact, where a diff an
agent retypes into its reply is not. Where there is none, have it reply with
the diff and apply that yourself.

## Writing a rule

When asked to write a rule, or to add one from the catalog:

- `rules list` lists every rule that ships and every rule the project has.
- `rules add <id>` copies a shipped rule into `.wiz/rules/<id>/RULE.md`,
  where it runs and can be edited. `rules add --recommended` copies every
  rule the catalog recommends at once, which is how a project starts.
- `rules new <name>` scaffolds `.wiz/rules/<name>/RULE.md` to fill in. The
  frontmatter has `description`, `files` (the glob a review matches changed
  files against), `level` (`error` or `warning`), `complexity` (`low`,
  `medium` or `high`). The body is yours, as a skill's is: the template
  suggests a title, the prose an agent judges by, and `## Good` and
  `## Bad` sections with examples, and nothing checks for them. Fill it in,
  delete the comment that explains it, and run `rules list`: it validates the
  frontmatter of every rule and names the line that is wrong.

Rules are English. A rule that only concerns some files says so in its glob;
a rule that only concerns files with some construct says so in its prose, and
whoever reads it greps or writes a script to find them. There is no code to
write for a rule, ever.

Writing a rule is the one time you read one, and only the one you are
writing. To remove a rule, delete its directory.

# Offering a system

A system name looks like any other name in code, so say it is one: ask
whether the code should be a splates system, and write every system name and
alias in the question as `#name`, the way the user and the `splates server` page
write them, so no one reads the choice as naming a class, a module or a
directory.

A system has at most two aliases, and splates refuses a file with more: to
offer a third, offer to swap it for one it has, or to call the system by its
name instead.

```markdown
- [ ] 3. Should the mixing code be a splates system?
  You have called `src/mixer/**` "the mixer" three times, and no system covers it.
  - (a) Name it `#mixer`, "Mixing tracks into one", for `src/mixer/**` (chosen)
  - (b) Add `src/mixer/**` to `#playback`, with `#mixer` as an alias
  - (c) Leave it unnamed
```

Here `(chosen)` is what you would pick, not what you did: write nothing until
the answer comes, then commit the change to `splates.systems.ts` with your
task, where names go without the `#`. `satisfies SystemsFile` types what you
write, the typecheck catches a mistake, and `splates systems` reads it back.

Give every system a description: a few words on what it is for, as the user
would say it, such as "Mixing tracks into one". Leave out how it works, its
files, its types and what it does today, since nothing checks a description
against the code and any such detail goes stale as the code changes; the
globs already say what it is made of. splates refuses one longer than a line
of 80 characters. When your task changes what a system is for, update its
description with it.

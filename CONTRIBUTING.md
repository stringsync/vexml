# Contributing to vexml

Thanks for helping. This repository is a mirror: it is rebuilt from StringSync's
monorepo on every release, so pull requests are never merged here on GitHub.

## Opening a pull request

1. Fork the repository and branch from `master`.
2. Make your change. See [Development](README.md#development) to run the playground,
   and add or update tests next to the code you change.
3. Open a pull request against `master` describing what it changes and why.

## What happens to it

A maintainer imports your pull request into the monorepo with its history, and you
stay the author of your commits. It lands there like any other change and reaches this
repository with the next release. The pull request is then closed with a comment
linking the commit that carries it, so it will show as closed rather than merged.

## Files that are generated

Some root files are generated from the monorepo: `package.json`, `biome.json`,
`tsconfig.base.json`, `bunfig.toml` and `bun.lock`, as is `packages/core`. Edits to them
in a pull request may be carried over by hand, or dropped when the monorepo already
decides them. If your change needs one, say so in the description.

# Release notes

## 2.4.0

Exports are faster. Large workspaces (over 10,000 files) now export in a
single pass instead of three, so a full export usually finishes in under a
minute.

- The `--dry-run` flag prints the plan without writing anything.
- Read-only folders are skipped with a warning, not an error.
- Fixed: a trailing slash in the output path no longer creates a nested
  folder.

## 2.3.1

A hotfix for Windows paths: drive letters are preserved when a project is
moved between machines.

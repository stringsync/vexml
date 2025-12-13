# Contributing to vexml

## Contribution Workflow

For development environment setup, please refer to the [Development section](README.md#development) in the README.md.

1. **Fork the repository** (forking is preferred over branching)
2. Make your changes, following the codebase's style
3. Commit using conventional commit style: `"fix issue with X"`
4. Push to your fork and open a Pull Request

We want minimal friction in the contribution process, so standalone improvements are absolutely welcome—no need to link to an issue first.

## Code Quality

Before submitting your contribution, ensure the following checks pass:

```sh
# Run ESLint
npm run lint

# Check code formatting
npm run formatcheck

# Run type checking
npm run typecheck

# Run tests (requires Docker)
npm run test
```

All of these checks are run automatically in CI via GitHub Actions and must pass before your PR can be merged.

## Testing

If you add a new feature, it's **preferred (but not required)** that you include a test that exercises that feature.

Integration tests live in [`tests/integration/`](tests/integration/) and are comprehensive of the MusicXML spec. Browse the existing test files to see if your use case is covered. If it's not, please add to the catch-all [`tests/integration/vexml.test.ts`](tests/integration/vexml.test.ts) test suite.

## Pull Request Requirements

Keep it simple:

- **Brief description** of what you changed and why
- **Screenshot** (or short video) of the achieved outcome

That's it! The review process and CI checks will handle the rest.

## Getting Help

- **GitHub Issues**: Best place for specific problems or questions
- **Pull Request Discussions**: Feel free to open a PR early and start a discussion there

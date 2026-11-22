/** The publish workflow's file name, as `npm trust github --file` takes it. */
export const WORKFLOW_FILE = "publish.yml";

/** Where the workflow sits in the mirror. */
export const WORKFLOW_PATH = `.github/workflows/${WORKFLOW_FILE}`;

/**
 * The GitHub Actions workflow that publishes the package in `dir` (relative
 * to the mirror's root) from a job npm trusts: it checks out the release
 * commit it is given, builds the package there as anyone cloning the mirror
 * would, and publishes the build. A `prepare` command runs before the build
 * with `SHIP_VERSION` read from the package's own version.
 */
export function workflow(dir: string, prepare?: string): string {
	const prepared = prepare
		? `      - run: |
          export SHIP_VERSION=$(node -p "require('./${dir}/package.json').version")
          ${prepare}
`
		: "";
	return `# Written by mono's ship; a release rewrites it when it differs.
# npm's trusted publisher entry names this file, so keep its path.
name: publish

on:
  workflow_dispatch:
    inputs:
      ref:
        description: The release commit to publish
        required: true

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: \${{ inputs.ref }}
      - uses: oven-sh/setup-bun@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
      - run: npm install -g npm@latest
      - run: bun install --frozen-lockfile
${prepared}      - run: bun packages/core/ship/npm/cli.ts build ${dir}
      - run: npm publish ./${dir}/dist --access public
`;
}

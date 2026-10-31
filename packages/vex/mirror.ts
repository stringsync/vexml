import type { MirrorConfig, MirrorOptions } from 'core/ship';

/**
 * How the mirror reads vexml's Dockerfile, its ignore file and its deploy workflow, so mono's stay the one source
 * of truth. The mirror root is copied to /app/vexml, core sits at packages/core and mdom comes
 * from npm; the mirror holds no bun.lock and no vet.
 */
export const vexmlMirrorRewrite: NonNullable<MirrorConfig['rewrite']> = {
	Dockerfile: [
		// Manifests and source of projects the mirror does not hold.
		[/^COPY (?:mdom|vet)\/.*\n/gm, ''],
		[/^COPY package\.json bun\.lock /m, 'COPY package.json '],
		// The mirror root stands where the vexml/ folder does, so the paths lose their prefix
		// and the work directory moves down to it.
		[/^WORKDIR \/app\n/m, 'WORKDIR /app/vexml\n'],
		[/^COPY vexml vexml\n/m, 'COPY . .\n'],
		[/\bvexml\/packages\//g, 'packages/'],
		[/\bcore\/packages\/core\b/g, 'packages/core'],
		// No lockfile to freeze, and one install for the mirror's packages.
		[/bun install --frozen-lockfile --filter '[^']*'/, 'bun install'],
	],
	'Dockerfile.dockerignore': [[/\bvexml\//g, '']],
	// The public repository deploys from master and holds no lockfile.
	'.github/workflows/deploy.yml': [
		[/- "main"/, '- "master"'],
		[/bun install --frozen-lockfile/, 'bun install'],
	],
};

/** Where and how vexml is mirrored to its public repository. */
export const MIRROR = {
	project: 'vexml',
	remote: 'https://github.com/stringsync/vexml.git',
	// The original repository's trunk, which its deploy workflow listens to.
	branch: 'master',
	// Releases are tagged on the public repository, where the notes go too.
	tag: true,
	// The standalone repository's last commit, which the first mirror takes over from.
	adopt: 'f54b75ef70b174b4bd8a94e84063186f12c45f5d',
	// vet and scry never leave mono, nor do the rules and skills for them
	config: {
		exclude: [
			'**/.vet/**',
			'**/vet.config.ts',
			'**/.scry/**',
			'**/scry.config.ts',
			'**/.claude/**',
			'**/.agents/**',
		],
		rewrite: vexmlMirrorRewrite,
	},
} satisfies MirrorOptions;

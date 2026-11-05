import { describe, expect, it } from 'bun:test';
import { NodeGlob } from 'core/system';
import { MIRROR, vexmlMirrorRewrite } from './mirror';

async function rewritten(file: keyof typeof vexmlMirrorRewrite) {
	let text = await Bun.file(`${import.meta.dir}/../../${file}`).text();
	for (const [pattern, to] of vexmlMirrorRewrite[file] ?? []) {
		text = text.replace(pattern, to);
	}
	return text;
}

describe('the vexml mirror', () => {
	const excluded = (path: string) =>
		MIRROR.config.exclude.some((glob) => new NodeGlob().matches(glob, path));

	it('leaves the soundslice skill out', () => {
		expect(excluded('vexml/skills/soundslice/SKILL.md')).toBe(true);
	});

	it('keeps the vexml skill and no other', () => {
		const kept = (path: string) =>
			MIRROR.config.keep.some((glob) => new NodeGlob().matches(glob, path));
		expect(kept('skills/vexml/SKILL.md')).toBe(true);
		expect(kept('skills/soundslice/SKILL.md')).toBe(false);
		expect(kept('skills/test-musicxml/SKILL.md')).toBe(false);
		expect(excluded('vexml/skills/vexml/SKILL.md')).toBe(false);
	});

	it('leaves a Dockerfile that builds from the mirror root', async () => {
		const text = await rewritten('Dockerfile');
		const copies = text.split('\n').filter((line) => line.startsWith('COPY'));
		expect(text).not.toMatch(
			/mdom|vet\/|bun\.lock|vexml\/packages|core\/packages/,
		);
		expect(text).toContain('COPY packages/core/package.json packages/core/');
		expect(text).toContain('COPY . .');
		expect(text).toContain('RUN bun install\n');
		expect(text).toMatch(
			/WORKDIR \/app\/vexml\n[\s\S]*COPY package\.json bunfig\.toml/,
		);
		expect(copies.some((line) => line.includes(' vexml'))).toBe(false);
	});

	it('leaves an ignore file naming mirror paths', async () => {
		const text = await rewritten('Dockerfile.dockerignore');
		expect(text).toContain('packages/integration/__artifacts__');
		expect(text).not.toContain('vexml/');
	});

	it('leaves a deploy workflow for the master branch without a lockfile', async () => {
		const text = await rewritten('.github/workflows/deploy.yml');
		expect(text).toContain('- "master"');
		expect(text).not.toContain('"main"');
		expect(text).not.toContain('--frozen-lockfile');
	});

	it('leaves a test workflow for the master branch without a lockfile', async () => {
		const text = await rewritten('.github/workflows/test.yml');
		expect(text).toContain('- "master"');
		expect(text).not.toContain('"main"');
		expect(text).not.toContain('--frozen-lockfile');
		expect(text).toContain('bin/vex fix --check');
		expect(text).toContain('bin/vex test');
	});
});

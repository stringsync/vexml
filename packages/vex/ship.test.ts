import { expect, test } from 'bun:test';
import { view } from 'core/ship';
import { MIRROR_OMIT, vexmlShip } from './ship';

test('vexml ships to npm through its mirror after mdom, at the bump asked for', () => {
	const plan = view(vexmlShip, {
		bump: 'minor',
		upstream: () => ({ version: '2.3.4' }),
	});
	expect(plan.name).toBe('@stringsync/vexml');
	expect(plan.bump).toBe('minor');
	expect(plan.dependencies).toEqual(['@stringsync/mdom']);
	expect(plan.steps.map((each) => each.id)).toEqual([
		'login',
		'test',
		'version',
		'workflow',
		'mirror',
		'first-publish',
		'trust',
		'publish',
		'tag',
	]);
});

test("vexml's plan reads the version mdom released", () => {
	expect(() => view(vexmlShip)).toThrow('nothing upstream was given');
});

test('vexml counts unshipped commits since its newest release tag', async () => {
	const commands: string[] = [];
	const count = await vexmlShip.unshipped?.({
		sh: async (command: string) => {
			commands.push(command);
			return '3\n';
		},
	});
	expect(count).toBe(3);
	expect(commands[0]).toContain('refs/tags/@stringsync/vexml@*');
	expect(commands[0]).toContain(
		"'vexml/packages/vexml' 'core/packages/core/disposable'",
	);
	expect(commands[0]).not.toContain('mdom');
});

test("vexml's mirror leaves out the private book reader, verdict ledger, and nothing it needs", () => {
	const omitted = (path: string) =>
		MIRROR_OMIT.some((glob) => new Bun.Glob(glob).match(path));
	expect(omitted('packages/book/package.json')).toBe(true);
	expect(omitted('packages/book/src/index.ts')).toBe(true);
	expect(omitted('bin/book')).toBe(true);
	expect(omitted('packages/integration/__reviews__/stem-length.json')).toBe(
		true,
	);
	expect(omitted('packages/integration/ENGRAVING.md')).toBe(false);
	expect(omitted('packages/integration/rules/stem-length.md')).toBe(false);
	expect(omitted('bin/vex')).toBe(false);
	expect(omitted('packages/vexml/package.json')).toBe(false);
});

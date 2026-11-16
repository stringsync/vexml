import { expect, test } from 'bun:test';
import { view } from 'core/ship';
import { vexmlShip } from './ship';

test('vexml ships to npm through its mirror after mdom, at the bump asked for', () => {
	const plan = view(vexmlShip, {
		bump: 'minor',
		upstream: () => ({ version: '2.3.4' }),
	});
	expect(plan.name).toBe('@stringsync/vexml');
	expect(plan.bump).toBe('minor');
	expect(plan.dependencies).toEqual(['@stringsync/mdom']);
	expect(plan.steps.map((each) => each.id)).toEqual([
		'test',
		'version',
		'workflow',
		'mirror',
		'login',
		'first-publish',
		'trust',
		'publish',
		'tag',
	]);
});

test("vexml's plan reads the version mdom released", () => {
	expect(() => view(vexmlShip)).toThrow('nothing upstream was given');
});

import { beforeEach, describe, expect, it } from 'bun:test';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';

describe('PaintList attribution', () => {
	let list: PaintList;
	let ctx: PaintContext;
	beforeEach(() => {
		list = new PaintList();
		ctx = new PaintContext(list, new FakePaintProbe(), null);
	});
	it('distinguishes a rest from a pitched notehead', () => {
		list.openGroup('notehead');
		ctx.fillText('\uE4E5', 0, 0);
		expect(list.ops[0]?.element?.kind).toBe('rest');
	});
	it('retains all containing identities across nested renderer groups', () => {
		list.openGroup('stavenote');
		ctx.fillRect(0, 0, 1, 1);
		list.openGroup('stem');
		list.openGroup('stem');
		ctx.fillRect(0, 0, 1, 1);
		expect(list.ops[1]?.element?.ancestors).toContain(list.ops[0]?.element?.id);
	});
	it('keeps nested identities and resumes the parent after a child closes', () => {
		list.openGroup('stavenote');
		ctx.fillRect(0, 0, 10, 10);
		list.openGroup('notehead');
		ctx.fillRect(1, 1, 5, 5);
		list.closeGroup();
		ctx.fillRect(2, 2, 2, 2);
		list.closeGroup();
		ctx.fillRect(20, 20, 5, 5);
		const [note, head, resumed, outside] = list.ops;
		expect(note?.element?.kind).toBe('stavenote');
		expect(head?.element?.kind).toBe('notehead');
		expect(head?.element?.parent).toBe(note?.element?.id);
		expect(resumed?.element).toBe(note?.element);
		expect(outside?.element?.kind).toBe('path');
	});

	it('gives separate instances distinct identities even when their kinds match', () => {
		list.openGroup('notehead');
		ctx.fillRect(0, 0, 5, 5);
		list.closeGroup();
		list.openGroup('notehead');
		ctx.fillRect(1, 0, 5, 5);
		list.closeGroup();
		expect(list.ops[0]?.element?.id).not.toBe(list.ops[1]?.element?.id);
	});

	it('reset drops open groups and leaves the paint geometry unchanged', () => {
		ctx.fillRect(1, 2, 3, 4);
		const original = list.ops[0];
		list.openGroup('notehead');
		ctx.fillRect(1, 2, 3, 4);
		expect(list.ops[1]).toMatchObject({
			call: original?.call,
			state: original?.state,
			path: original?.path,
			bounds: original?.bounds,
		});
		expect(list.ops[1]?.element).toBeDefined();
		list.reset();
		ctx.fillRect(1, 2, 3, 4);
		expect(list.ops).toHaveLength(1);
		expect(list.ops[0]).toEqual(original);
	});
});

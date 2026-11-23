import { describe, expect, it } from 'bun:test';
import {
	emptyReview,
	type Mark,
	type Review,
	type ReviewData,
	type Thread,
} from './review-data';
import { reviewMessage } from './review-message';
import { carryThreads, parseReplies } from './review-thread';

describe('review threads', () => {
	it("reads a reply per mark number under each snapshot's section", () => {
		const replies = parseReplies(
			'## a.png\n\n1. Fixed the slant.\n   It now follows the rest.\n2) Left as is.\n\n## `b`\n\n3. Moved.\n',
		);
		expect(replies.get('a.png')?.get(1)).toBe(
			'Fixed the slant.\nIt now follows the rest.',
		);
		expect(replies.get('a.png')?.get(2)).toBe('Left as is.');
		expect(replies.get('b')?.get(3)).toBe('Moved.');
	});

	it("carries an open thread and the last round's marks, each with the agent's reply", () => {
		const previous = data(1, { 'a.png': [thread('a.png#v0.1', 'Too high.')] });
		const review: Review = {
			...emptyReview(previous),
			marks: { 'a.png': [mark('The beam slants.')] },
			threads: { 'a.png#v0.1': { resolved: false, reply: 'Still high.' } },
		};
		const carried = carryThreads({
			previous,
			review,
			replies: parseReplies('## a\n\n1. Lowered it.\n2. Levelled it.\n'),
			version: 2,
			moved: new Set(['a.png']),
			html: (md) => `<p>${md}</p>`,
		});
		const [old, drawn] = carried.threads['a.png'] ?? [];
		expect(old?.messages.map((m) => [m.author, m.version, m.text])).toEqual([
			['reviewer', 0, 'Too high.'],
			['reviewer', 1, 'Still high.'],
			['agent', 2, 'Lowered it.'],
		]);
		expect(drawn?.id).toBe('a.png#v1.2');
		expect(drawn?.messages.map((m) => m.text)).toEqual([
			'The beam slants.',
			'Levelled it.',
		]);
		expect(drawn?.messages[1]?.html).toBe('<p>Levelled it.</p>');
		expect(carried.unanswered).toEqual([]);
	});

	it('ends a resolved thread, and warns of a reply to it', () => {
		const previous = data(1, { 'a.png': [thread('a.png#v0.1', 'Too high.')] });
		const carried = carryThreads({
			previous,
			review: {
				...emptyReview(previous),
				threads: { 'a.png#v0.1': { resolved: true, reply: '' } },
			},
			replies: parseReplies(
				'## a.png\n\n1. Lowered it.\n\n## z.png\n\n1. Hm.\n',
			),
			version: 2,
			moved: new Set(['a.png']),
			html: (md) => md,
		});
		expect(carried.threads).toEqual({});
		expect(carried.unanswered).toEqual(['a.png #1', 'z.png #1']);
	});

	it('settles the threads of a snapshot that no longer moved', () => {
		const previous = data(1, {});
		const carried = carryThreads({
			previous,
			review: { ...emptyReview(previous), marks: { 'a.png': [mark('Off.')] } },
			replies: new Map(),
			version: 2,
			moved: new Set(),
			html: (md) => md,
		});
		expect(carried.threads).toEqual({});
		expect(carried.settled.map((s) => s.name)).toEqual(['a.png']);
	});

	it('lists each thread with who said what and whether it was resolved', () => {
		const current = {
			...data(2, {
				'a.png': [
					thread('a.png#v1.1', 'Too high.', 'Lowered it.'),
					thread('a.png#v1.2', 'Hyphen jammed.', 'Spaced it.'),
				],
			}),
			settled: [{ name: 'b.png', threads: [thread('b.png#v1.1', 'Off.')] }],
		};
		const message = reviewMessage(current, {
			...emptyReview(current),
			threads: {
				'a.png#v1.1': { resolved: false, reply: 'Still high.' },
				'a.png#v1.2': { resolved: true, reply: '' },
			},
		});
		expect(message).toContain('Changes requested on 1 of 1 snapshots');
		expect(message).toContain(
			'## ✗ a.png (needs change)\n1. From v1: Box on After (0,0 0×0)\n   You (v1): Too high.\n   Agent (v2): Lowered it.\n   You: Still high.\n   → Still open\n2. From v1:',
		);
		expect(message).toContain('   Agent (v2): Spaced it.\n   → Resolved');
		expect(message).toContain(
			'## Settled by the change\n\nb.png no longer moves, so its thread is settled:\n1. From v1: Box on After (0,0 0×0)\n   You (v1): Off.',
		);
		const json = JSON.parse(
			message.slice(
				message.indexOf('```json\n') + 8,
				message.lastIndexOf('\n```'),
			),
		);
		expect(json.snapshots[0].threads[1]).toMatchObject({
			number: 2,
			drawn: 1,
			resolved: true,
		});
		expect(json.settled[0].snapshot).toBe('b.png');
	});

	it('counts a snapshot whose threads are all resolved as not reviewed', () => {
		const current = data(2, { 'a.png': [thread('a.png#v1.1', 'Too high.')] });
		const message = reviewMessage(current, {
			...emptyReview(current),
			threads: { 'a.png#v1.1': { resolved: true, reply: '' } },
		});
		expect(message).toContain('## · a.png (not reviewed)');
	});
});

function mark(note: string): Mark {
	return {
		kind: 'box',
		panel: 'after',
		from: { x: 0, y: 0 },
		to: { x: 0, y: 0 },
		note,
	};
}

function thread(id: string, note: string, reply?: string): Thread {
	const drawn = Number(/#v(\d+)/.exec(id)?.[1]);
	return {
		id,
		mark: mark(note),
		where: 'Box on After (0,0 0×0)',
		target: null,
		messages: [
			{ author: 'reviewer', version: drawn, text: note, html: null },
			...(reply
				? [
						{
							author: 'agent' as const,
							version: drawn + 1,
							text: reply,
							html: reply,
						},
					]
				: []),
		],
	};
}

function data(version: number, threads: Record<string, Thread[]>): ReviewData {
	return {
		id: 'beams',
		version,
		title: 'Level beams',
		tradeoffs: null,
		unchanged: null,
		mode: 'served',
		threads,
		settled: [],
		entries: [
			{
				name: 'a.png',
				test: null,
				line: null,
				fixture: null,
				changed: 1,
				share: 0.1,
				width: 10,
				height: 10,
				claim: null,
				layout: null,
				images: { before: '', diff: '', after: '' },
				scale: 1,
			},
		],
	};
}

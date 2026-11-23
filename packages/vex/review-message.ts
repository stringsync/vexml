import {
	describeMark,
	isOpen,
	type Review,
	type ReviewData,
	type ReviewEntry,
	resolve,
	snapshotStatus,
	type Thread,
	type ThreadMessage,
} from './review-data';

// The review as the agent reads it. Browser-safe: the page shows the same text.

/**
 * The review as one message for the agent: a `[VEX REVIEW <id> v<n>]` line, a summary,
 * each snapshot's state, its threads from the last version (each with its messages and
 * whether the reviewer resolved it) and its new marks, numbered as the agent answers
 * them with `--replies`, the snapshots the change settled, then the same as JSON.
 */
export function reviewMessage(data: ReviewData, review: Review): string {
	const status = (entry: ReviewEntry) =>
		snapshotStatus(data, review, entry.name);
	const approved = data.entries.filter((e) => status(e) === 'approved').length;
	const changes = data.entries.filter((e) => status(e) === 'changes').length;
	const open = data.entries.length - approved - changes;
	const lines = [
		`[VEX REVIEW ${data.id} v${data.version}]`,
		data.title,
		[
			`Changes requested on ${changes} of ${data.entries.length} snapshots`,
			`${approved} approved`,
			...(open > 0 ? [`${open} not reviewed`] : []),
		].join('; ') + (review.submitted ? '.' : '. (Draft: not submitted yet.)'),
	];
	const json: unknown[] = [];
	for (const entry of data.entries) {
		const threads = data.threads?.[entry.name] ?? [];
		const marks = review.marks[entry.name] ?? [];
		const state = status(entry);
		lines.push('', heading(entry.name, state));
		const source = [
			entry.test ? `${entry.test}${entry.line ? `:${entry.line}` : ''}` : null,
			entry.fixture,
		].filter(Boolean);
		if (source.length > 0 && state === 'changes') {
			lines.push(source.join(' · '));
		}
		threads.forEach((thread, i) => {
			lines.push(...threadLines(thread, i + 1, review));
		});
		marks.forEach((mark, i) => {
			lines.push(
				`${threads.length + i + 1}. ${describeMark(mark, entry.layout)}`,
			);
			lines.push(...indent(mark.note));
		});
		json.push({
			snapshot: entry.name,
			test: entry.test,
			line: entry.line,
			fixture: entry.fixture,
			status: state,
			threads: threads.map((thread, i) => threadJson(thread, i + 1, review)),
			marks: marks.map((mark, i) => ({
				number: threads.length + i + 1,
				...mark,
				target: entry.layout ? resolve(mark, entry.layout) : null,
			})),
		});
	}
	const settled = data.settled ?? [];
	if (settled.length > 0) {
		lines.push('', '## Settled by the change');
		for (const { name, threads } of settled) {
			lines.push(
				'',
				`${name} no longer moves, so ${threads.length === 1 ? 'its thread is' : `its ${threads.length} threads are`} settled:`,
			);
			threads.forEach((thread, i) => {
				lines.push(...threadLines(thread, i + 1, null));
			});
		}
	}
	lines.push(
		'',
		'```json',
		JSON.stringify({
			review: data.id,
			version: data.version,
			submitted: review.submitted,
			snapshots: json,
			settled: settled.map(({ name, threads }) => ({
				snapshot: name,
				threads: threads.map((thread, i) => threadJson(thread, i + 1, null)),
			})),
		}),
		'```',
	);
	return lines.join('\n');
}

/** A thread as the message lists it: where, who said what, and where it stands. A
 * settled thread (no review) has no state. */
function threadLines(
	thread: Thread,
	number: number,
	review: Review | null,
): string[] {
	const lines = [`${number}. From v${drawnIn(thread)}: ${thread.where}`];
	for (const message of thread.messages) {
		lines.push(...indent(message.text, `${speaker(message)}: `));
	}
	if (review) {
		const reply = review.threads?.[thread.id]?.reply.trim() ?? '';
		if (reply) {
			lines.push(...indent(reply, 'You: '));
		}
		lines.push(
			isOpen(thread, review)
				? `   → Still open${reply ? '' : ' (no reply)'}`
				: '   → Resolved',
		);
	}
	return lines;
}

function threadJson(thread: Thread, number: number, review: Review | null) {
	const state = review?.threads?.[thread.id];
	return {
		number,
		id: thread.id,
		drawn: drawnIn(thread),
		...thread.mark,
		target: thread.target,
		messages: thread.messages.map(({ author, version, text }) => ({
			author,
			version,
			text,
		})),
		...(review
			? { resolved: !isOpen(thread, review), reply: state?.reply ?? '' }
			: {}),
	};
}

function drawnIn(thread: Thread): number {
	return thread.messages[0]?.version ?? 0;
}

function speaker(message: ThreadMessage): string {
	return `${message.author === 'agent' ? 'Agent' : 'You'} (v${message.version})`;
}

/** Text under a numbered line, three spaces in, the first line led by `lead`. */
function indent(text: string, lead = ''): string[] {
	const trimmed = text.trim();
	if (!trimmed && !lead) {
		return [];
	}
	return (lead + (trimmed || '(no note)'))
		.split('\n')
		.map((line) => `   ${line}`);
}

function heading(
	name: string,
	status: 'approved' | 'changes' | 'open',
): string {
	if (status === 'approved') {
		return `## ✓ ${name}`;
	}
	if (status === 'changes') {
		return `## ✗ ${name} (needs change)`;
	}
	return `## · ${name} (not reviewed)`;
}

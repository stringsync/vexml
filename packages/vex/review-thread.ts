import { parseClaims } from './review';
import {
	describeMark,
	isOpen,
	type Review,
	type ReviewData,
	resolve,
	type Thread,
	type ThreadMessage,
} from './review-data';

/** The agent's answers to the last version, by snapshot, then by the number the mark
 * had in it. */
export type Replies = Map<string, Map<number, string>>;

/**
 * Reads a replies file: a `## <snapshot>` section per snapshot, as in the claims file,
 * each a numbered list answering that snapshot's marks by their numbers in the last
 * version's review. An item runs on to the next number.
 */
export function parseReplies(text: string): Replies {
	const replies: Replies = new Map();
	for (const [name, body] of parseClaims(text)) {
		const items = new Map<number, string>();
		let number: number | null = null;
		let lines: string[] = [];
		const flush = () => {
			const reply = lines.join('\n').trim();
			if (number !== null && reply) {
				items.set(number, reply);
			}
		};
		for (const line of body.split('\n')) {
			const item = /^(\d+)[.)]\s+(.*)$/.exec(line);
			if (item) {
				flush();
				number = Number(item[1]);
				lines = [item[2] ?? ''];
			} else if (number !== null) {
				lines.push(line.replace(/^ {1,4}/, ''));
			}
		}
		flush();
		if (items.size > 0) {
			replies.set(name, items);
		}
	}
	return replies;
}

export interface CarryOptions {
	/** The last version's data and the reviewer's review of it. */
	previous: ReviewData;
	review: Review;
	replies: Replies;
	/** The version being built, which the agent's replies are written with. */
	version: number;
	/** The snapshots that moved in the version being built. */
	moved: Set<string>;
	/** The agent's markdown as HTML. */
	html: (markdown: string) => string;
}

export interface Carried {
	threads: Record<string, Thread[]>;
	settled: { name: string; threads: Thread[] }[];
	/** Replies that answer no open mark, as `<snapshot> #<n>`, to warn about. */
	unanswered: string[];
}

/**
 * The threads the next version carries: each still open from the last version, with the
 * reviewer's reply, and each mark drawn on it, as a new thread; every one with the
 * agent's reply to its number. A resolved thread ends. A snapshot that no longer moved
 * has its threads settled by the change.
 */
export function carryThreads(opts: CarryOptions): Carried {
	const { previous, review } = opts;
	const layouts = new Map(previous.entries.map((e) => [e.name, e.layout]));
	const names = new Set([
		...Object.keys(previous.threads ?? {}),
		...Object.keys(review.marks).filter((n) => review.marks[n]?.length),
	]);
	const replies = new Map(opts.replies);
	const result: Carried = { threads: {}, settled: [], unanswered: [] };
	for (const name of names) {
		const answers = takeReplies(replies, name);
		const answer = (number: number): ThreadMessage[] => {
			const text = answers.get(number);
			answers.delete(number);
			return text
				? [
						{
							author: 'agent',
							version: opts.version,
							text,
							html: opts.html(text),
						},
					]
				: [];
		};
		const old = previous.threads?.[name] ?? [];
		const threads: Thread[] = [];
		old.forEach((thread, i) => {
			if (!isOpen(thread, review)) {
				return;
			}
			const reply = review.threads?.[thread.id]?.reply.trim() ?? '';
			threads.push({
				...thread,
				messages: [
					...thread.messages,
					...(reply ? [reviewer(reply, previous.version)] : []),
					...answer(i + 1),
				],
			});
		});
		const layout = layouts.get(name) ?? null;
		(review.marks[name] ?? []).forEach((mark, i) => {
			const number = old.length + i + 1;
			threads.push({
				id: `${name}#v${previous.version}.${number}`,
				mark,
				where: describeMark(mark, layout),
				target: layout ? resolve(mark, layout) : null,
				messages: [reviewer(mark.note, previous.version), ...answer(number)],
			});
		});
		for (const number of answers.keys()) {
			result.unanswered.push(`${name} #${number}`);
		}
		if (threads.length === 0) {
			continue;
		}
		if (opts.moved.has(name)) {
			result.threads[name] = threads;
		} else {
			result.settled.push({ name, threads });
		}
	}
	for (const [name, answers] of replies) {
		for (const number of answers.keys()) {
			result.unanswered.push(`${name} #${number}`);
		}
	}
	return result;
}

function reviewer(text: string, version: number): ThreadMessage {
	return { author: 'reviewer', version, text, html: null };
}

/** A snapshot's replies, named with or without its extension, taken out of `replies`. */
function takeReplies(replies: Replies, name: string): Map<number, string> {
	const short = name.replace(/\.png$/, '');
	const found = new Map([
		...(replies.get(short) ?? []),
		...(replies.get(name) ?? []),
	]);
	replies.delete(name);
	replies.delete(short);
	return found;
}

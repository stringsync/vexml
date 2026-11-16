import type { Ps } from "core/system";
import { Debouncer, type Duration, type Timer } from "core/time";
import type { Ctx } from "./ctx";
import type { Output } from "./process-ctx";

/** Who answers what a command asks: the step's own prompts. */
export type Asker = Pick<Ctx, "confirm" | "openLink" | "ask">;

/** What a command answered through prompts left behind. */
export interface Answered {
	exitCode: number;
	stdout: string;
	stderr: string;
}

/** How long a command stays quiet before what it last printed is read as a question. */
export interface Quiet {
	timer: Timer;
	after: Duration;
}

const YES_NO = /\s*[([]\s*y(?:es)?\s*\/\s*n(?:o)?\s*[)\]]\s*/i;
const URL = /https?:\/\/[^\s"'<>]+/g;
const CODE = /\b[A-Z0-9]{4}(?:-[A-Z0-9]{4})+\b/;
const SIGN_IN = /log ?in|sign ?in|authori[sz]|authenticat|device|browser/i;

/**
 * Runs `command` with its stdin open, and each time it goes quiet reads what
 * it last printed for what it waits on, as a person at a terminal would:
 *
 * - an unfinished line with a y/n marker (`[y/N]`, `(y/n)`) is a confirm,
 *   answered by typing `y` or `n`;
 * - another unfinished line ending in `:` or `?` asks for a value, typed in;
 * - a link printed with a device code, or beside words about signing in, is
 *   a link to open, withdrawn once the command prints more or ends, as it
 *   does when the sign-in goes through.
 *
 * A prompt that fails, as when nobody is there to answer, ends the command
 * and throws.
 */
export async function answeringSh(
	ps: Ps,
	command: string,
	out: Output,
	asker: Asker,
	quiet: Quiet,
): Promise<Answered> {
	const child = ps.start(["sh", "-c", command]);
	const stdin = child.stdin.getWriter();
	const debouncer = new Debouncer(quiet.timer, quiet.after);
	const output = { stdout: "", stderr: "" };
	let unread = "";
	let asking = false;
	let link: AbortController | undefined;
	let question: AbortController | undefined;
	let failure: unknown;

	const type = (text: string) =>
		stdin.write(new TextEncoder().encode(text)).catch(() => {});
	const fail = (error: unknown) => {
		failure ??= error;
		child.kill();
	};
	const put = async <T>(
		ask: (signal: AbortSignal) => Promise<T>,
		answer: (value: T) => string,
	) => {
		asking = true;
		question = new AbortController();
		const { signal } = question;
		try {
			await type(answer(await ask(signal)));
		} catch (error) {
			if (!signal.aborted) {
				fail(error);
			}
		} finally {
			asking = false;
			question = undefined;
		}
	};

	const read = () => {
		if (asking || failure) {
			return;
		}
		const text = unread;
		const partial = text.slice(text.lastIndexOf("\n") + 1).trim();
		if (YES_NO.test(partial)) {
			unread = "";
			const asked = partial
				.replace(YES_NO, " ")
				.trim()
				.replace(/\s+(?=[?:]$)/, "");
			void put(
				(signal) => asker.confirm(asked, { signal }),
				(yes) => (yes ? "y\n" : "n\n"),
			);
			return;
		}
		if (/[:?]$/.test(partial)) {
			unread = "";
			void put(
				(signal) => asker.ask(partial, { signal }),
				(value) => `${value}\n`,
			);
			return;
		}
		const url = [...text.matchAll(URL)].at(-1)?.[0];
		const code = text.match(CODE)?.[0];
		if (url && (code || SIGN_IN.test(text))) {
			unread = "";
			const opened = new AbortController();
			link = opened;
			asker
				.openLink({ url, ...(code && { code }) }, { signal: opened.signal })
				.catch((error) => {
					if (!opened.signal.aborted) {
						fail(error);
					}
				});
		}
	};

	const pump = async (
		stream: ReadableStream<Uint8Array>,
		key: keyof typeof output,
	) => {
		const decoder = new TextDecoder();
		for await (const bytes of stream) {
			const text = decoder.decode(bytes, { stream: true });
			if (!text) {
				continue;
			}
			output[key] += text;
			out.write(text);
			unread += text;
			if (link && text.trim()) {
				link.abort(new Error("The command moved on"));
				link = undefined;
			}
			debouncer.call(read);
		}
	};

	const [exitCode] = await Promise.all([
		child.exited,
		pump(child.stdout, "stdout"),
		pump(child.stderr, "stderr"),
	]);
	debouncer.dispose();
	link?.abort(new Error("The command ended"));
	question?.abort(new Error("The command ended"));
	await stdin.close().catch(() => {});
	if (failure) {
		throw failure;
	}
	return { exitCode, ...output };
}

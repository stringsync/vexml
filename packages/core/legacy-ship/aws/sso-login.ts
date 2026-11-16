import type { Child, Ps } from "core/system";
import type { SignIn, SignInAsk } from "../step-events";

const LINK = /https:\/\/\S+/;
const CODE = /\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/;

/** Signs the AWS CLI in through SSO's device-code flow when its login has expired. */
export class SsoLogin {
	constructor(private readonly ps: Ps) {}

	/**
	 * Returns once `profile`'s login works. When it has expired, starts
	 * `aws sso login --no-browser`, hands the page and code to `ask`, and
	 * continues by itself when the login completes, wherever it was approved.
	 */
	async ensure(
		profile: string | undefined,
		region: string | undefined,
		ask: SignInAsk | undefined,
	): Promise<void> {
		if (profile === undefined || (await this.valid(profile, region))) {
			return;
		}
		if (ask === undefined) {
			throw new Error(
				`the AWS login for profile "${profile}" expired: run \`aws sso login --profile ${profile}\``,
			);
		}
		const child = this.ps.start([
			"aws",
			"sso",
			"login",
			"--profile",
			profile,
			"--no-browser",
		]);
		try {
			const signIn = await this.waitForSignIn(child);
			const approved = new AbortController();
			const exited = child.exited.then((code) => {
				approved.abort();
				return code;
			});
			const answered = await ask(
				`Sign in to AWS (${profile}): open the page, enter the code, and approve.`,
				signIn,
				approved.signal,
			);
			const code = answered ? await exited : undefined;
			if (code !== 0) {
				throw new Error(
					answered
						? `aws sso login for profile "${profile}" failed with exit code ${code}`
						: `the AWS sign-in for profile "${profile}" was declined`,
				);
			}
		} finally {
			child.kill();
		}
		if (!(await this.valid(profile, region))) {
			throw new Error(`the AWS login for profile "${profile}" did not take`);
		}
	}

	private async valid(
		profile: string,
		region: string | undefined,
	): Promise<boolean> {
		const { exitCode } = await this.ps.spawnCapture([
			"aws",
			"sts",
			"get-caller-identity",
			"--profile",
			profile,
			...(region === undefined ? [] : ["--region", region]),
		]);
		return exitCode === 0;
	}

	/** Reads the login's output until it has printed both the page and the code. */
	private async waitForSignIn(child: Child): Promise<SignIn> {
		const decoder = new TextDecoder();
		let text = "";
		const reader = child.stdout.getReader();
		for (;;) {
			const link = LINK.exec(text)?.[0];
			const code = CODE.exec(text)?.[0];
			if (link !== undefined && code !== undefined) {
				// Keep draining so the child never blocks on a full pipe.
				void drain(reader);
				return { link, code };
			}
			const chunk = await reader.read();
			if (chunk.done) {
				throw new Error(
					`aws sso login printed no sign-in page and code: ${text.trim()}`,
				);
			}
			text += decoder.decode(chunk.value, { stream: true });
		}
	}
}

async function drain(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
	while (!(await reader.read()).done) {}
}

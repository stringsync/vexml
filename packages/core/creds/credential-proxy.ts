import { timingSafeEqual } from "node:crypto";
import type { AsyncResource } from "core/disposable";
import type { CredentialSource } from "./credential-source";

/** What `CredentialProxy.listen` forwards, and which key it puts in. */
export interface CredentialProxyOptions {
	/**
	 * Where every request goes: an `https://` origin, with a path each
	 * request's own is put under when it has one, such as
	 * `https://api.openai.com/v1`. Nothing else is ever reached.
	 */
	upstream: string;
	/** The credential's name in the source, such as `ANTHROPIC_API_KEY`. */
	credential: string;
	/**
	 * The header the key travels in, such as `x-api-key` for Anthropic or
	 * `authorization` for OpenAI. The client sends its placeholder there, and
	 * the proxy puts the real key there in its place.
	 */
	header: string;
	/** The word before the key in that header, such as `Bearer`; none by default. */
	scheme?: string;
}

/** Request headers that describe one connection, so never cross the proxy. */
const HOP_BY_HOP = [
	"connection",
	"content-length",
	"host",
	"keep-alive",
	"proxy-authorization",
	"proxy-connection",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
];

/**
 * A loopback HTTP proxy that keeps an API key from the program it serves,
 * such as an agent's CLI. The program gets `url` as its provider's base URL
 * and `placeholder` as its key; the proxy forwards each of its requests to
 * the one upstream with the placeholder swapped for the real key, which it
 * reads from its source on every request, so a rotated key needs no
 * restart. The program never holds the key, so it cannot print, log or send
 * it anywhere.
 *
 * It listens on 127.0.0.1 alone, on a free port, and refuses with a 401,
 * reaching no upstream, any request without its own placeholder, which is
 * random for each proxy, so another local process, or another task's agent,
 * cannot spend the key through it. It never follows a redirect, so the key
 * goes to the upstream origin and nowhere else, and it passes responses
 * through as they stream, server-sent events and compressed bodies alike.
 * No response, error or log of its own ever holds the key.
 *
 * The placeholder is only as private as the program's environment: on a
 * machine where the program runs as the proxy's own user, make the process
 * holding the key undumpable (`makeUndumpable()` from `webappwiz/system`),
 * or run the program in a container.
 */
export class CredentialProxy implements AsyncResource {
	private constructor(
		private readonly server: Bun.Server<undefined>,
		/** The base URL to hand the program, as `http://127.0.0.1:<port>`. */
		readonly url: string,
		/** The key to hand the program in place of the real one. */
		readonly placeholder: string,
	) {}

	/** Starts a proxy for one credential, reading it from `source`. */
	static listen(
		source: CredentialSource,
		opts: CredentialProxyOptions,
	): CredentialProxy {
		const upstream = new URL(opts.upstream);
		if (upstream.protocol !== "https:" && !isLoopback(upstream.hostname)) {
			throw new Error(
				`the upstream ${upstream.origin} is not https: a key would cross the network in the clear`,
			);
		}
		const prefix = upstream.pathname.replace(/\/+$/, "");
		const header = opts.header.toLowerCase();
		const placeholder = `wiz-proxy-${randomHex(32)}`;
		const expected = Buffer.from(
			opts.scheme === undefined ? placeholder : `${opts.scheme} ${placeholder}`,
		);
		const server = Bun.serve({
			hostname: "127.0.0.1",
			port: 0,
			// a model can think for minutes before its first byte
			idleTimeout: 0,
			development: false,
			fetch: async (request) => {
				const presented = Buffer.from(request.headers.get(header) ?? "");
				if (
					presented.length !== expected.length ||
					!timingSafeEqual(presented, expected)
				) {
					return refuse(401, "this proxy wants its placeholder key");
				}
				const key = await source.get(opts.credential).catch(() => undefined);
				if (key === undefined || key === "") {
					return refuse(
						503,
						`${opts.credential} is not available to this proxy`,
					);
				}
				const headers = new Headers(request.headers);
				for (const name of HOP_BY_HOP) {
					headers.delete(name);
				}
				try {
					headers.set(
						header,
						opts.scheme === undefined ? key : `${opts.scheme} ${key}`,
					);
				} catch {
					// the message could quote the value it refused
					return refuse(503, `${opts.credential} is not a valid header value`);
				}
				const { pathname, search } = new URL(request.url);
				// joined as text, so a path such as `//elsewhere` stays a path
				// on the upstream rather than naming another host
				const target = new URL(
					`${upstream.origin}${prefix}${pathname}${search}`,
				);
				if (target.origin !== upstream.origin) {
					return refuse(400, "that path leaves the upstream");
				}
				const body =
					request.method === "GET" || request.method === "HEAD"
						? undefined
						: await request.arrayBuffer();
				let response: Response;
				try {
					response = await fetch(target, {
						method: request.method,
						headers,
						body,
						redirect: "manual",
						signal: request.signal,
						// the client decodes the body itself, as the encoding header says
						decompress: false,
					} as RequestInit);
				} catch {
					return refuse(502, `could not reach ${upstream.origin}`);
				}
				const passed = new Headers(response.headers);
				for (const name of ["connection", "keep-alive", "transfer-encoding"]) {
					passed.delete(name);
				}
				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers: passed,
				});
			},
			error: () => refuse(500, "the proxy failed"),
		});
		return new CredentialProxy(
			server,
			`http://127.0.0.1:${server.port}`,
			placeholder,
		);
	}

	/** Stops listening and cuts every request still streaming. */
	async disposeAsync(): Promise<void> {
		await this.server.stop(true);
	}
}

function refuse(status: number, message: string): Response {
	return new Response(`${message}\n`, {
		status,
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}

function isLoopback(hostname: string): boolean {
	return (
		hostname === "localhost" ||
		hostname === "[::1]" ||
		/^127\.\d+\.\d+\.\d+$/.test(hostname)
	);
}

function randomHex(bytes: number): string {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(bytes))).toString(
		"hex",
	);
}

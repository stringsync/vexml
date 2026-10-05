import { createServer } from "node:http";

/**
 * Runs `body` against a server on any free port that answers every request
 * with `reply`, and closes the server when `body` settles, so a test never
 * leaks one.
 */
export async function withServer(
	reply: string,
	body: (url: string) => Promise<void>,
): Promise<void> {
	const server = createServer((_request, response) => response.end(reply));
	await new Promise<void>((resolve) => server.listen(0, resolve));
	const address = server.address();
	const port = typeof address === "object" && address !== null ? address.port : 0;
	try {
		await body(`http://localhost:${port}`);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}

import * as path from 'node:path';
import index from './index.html';

const DATA_DIR = path.resolve(import.meta.dir, '../integration/__data__');

/* How many ports past `from` to try before giving up. Enough for a handful of concurrent
 * runs (a test suite, a `vex render`, a stale server) without scanning forever. */
const PORT_ATTEMPTS = 20;

/* Serves the test page and the fixture corpus. `from` is a starting point, not a demand:
 * a second copy, or anything else already on the port, moves this one along. Read the port
 * it actually got off the returned server rather than assuming `from`. */
export function serve(from = 3100) {
	for (let port = from; port < from + PORT_ATTEMPTS; port++) {
		try {
			return Bun.serve({
				port,
				routes: {
					'/': index,
					'/data/:file': (req) =>
						new Response(Bun.file(path.join(DATA_DIR, req.params.file))),
				},
			});
		} catch (error) {
			// Bun reports the taken port on `code`, not in the message ("Failed to start
			// server. Is port 3100 in use?"), so matching the text would never fire.
			if ((error as { code?: string })?.code !== 'EADDRINUSE') {
				throw error;
			}
		}
	}
	throw new Error(
		`serve: no free port between ${from} and ${from + PORT_ATTEMPTS}`,
	);
}

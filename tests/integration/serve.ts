import * as path from 'node:path';
import index from './index.html';

const DATA_DIR = path.resolve(import.meta.dir, '__data__');

// Serves the harness page (with window.render bundled in) and the test corpus at /data/<file>.
// The browser fetches inputs itself: .musicxml -> text, .mxl -> blob.
export function startServer(port = 3100) {
	return Bun.serve({
		port,
		routes: {
			'/': index,
			'/data/:file': (req) =>
				new Response(Bun.file(path.join(DATA_DIR, req.params.file))),
		},
	});
}

if (import.meta.main) {
	const server = startServer(Number(process.env.PORT) || 3100);
	console.log(`visual harness on ${server.url}`);
}

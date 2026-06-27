import * as path from 'node:path';
import index from './index.html';

const DATA_DIR = path.resolve(import.meta.dir, '../integration/__data__');

export function serve(port = 3100) {
	return Bun.serve({
		port,
		routes: {
			'/': index,
			'/data/:file': (req) =>
				new Response(Bun.file(path.join(DATA_DIR, req.params.file))),
		},
	});
}

import type { ListeningEntry } from "./ps";

/** A listening socket, before its process's working directory is read. */
export type Listener = Omit<ListeningEntry, "cwd">;

/**
 * The listening sockets in what `lsof -nP -iTCP -sTCP:LISTEN -Fpn` printed:
 * a `p<pid>` line for each process, then an `n<host>:<port>` line for each
 * of its sockets, among `f<fd>` lines. A socket on both IPv4 and IPv6 is
 * listed once for each.
 */
export function parseLsof(stdout: string): Listener[] {
	const found: Listener[] = [];
	let pid: number | null = null;
	for (const line of stdout.split("\n")) {
		if (line.startsWith("p")) {
			pid = Number(line.slice(1));
			continue;
		}
		if (!line.startsWith("n") || pid === null) {
			continue;
		}
		const address = hostPort(line.slice(1));
		if (address !== null) {
			found.push({ pid, ...address });
		}
	}
	return unique(found);
}

/**
 * The listening sockets in what `ss -Hltnp` printed, a line each, the local
 * address fourth and the process last, as `users:(("node",pid=12,fd=20))`.
 */
export function parseSs(stdout: string): Listener[] {
	const found: Listener[] = [];
	for (const line of stdout.split("\n")) {
		const columns = line.trim().split(/\s+/);
		const address = hostPort(columns[3] ?? "");
		if (address === null) {
			continue;
		}
		for (const match of line.matchAll(/pid=(\d+)/g)) {
			found.push({ pid: Number(match[1]), ...address });
		}
	}
	return unique(found);
}

/**
 * Each process's working directory in what `lsof -a -d cwd -p <pids> -Fpn`
 * printed: a `p<pid>` line, then its `n<path>` line.
 */
export function parseLsofCwds(stdout: string): Map<number, string> {
	const cwds = new Map<number, string>();
	let pid: number | null = null;
	for (const line of stdout.split("\n")) {
		if (line.startsWith("p")) {
			pid = Number(line.slice(1));
		} else if (line.startsWith("n") && pid !== null) {
			cwds.set(pid, line.slice(1));
		}
	}
	return cwds;
}

/** `host:port` as both list it, the wildcard host as `*`. */
function hostPort(text: string): { host: string; port: number } | null {
	const at = text.lastIndexOf(":");
	const port = Number(text.slice(at + 1));
	if (at <= 0 || !Number.isInteger(port) || port <= 0) {
		return null;
	}
	// `ss` names the wildcard `0.0.0.0` or `[::]`, and a socket bound to one
	// interface `%`-suffixed.
	const host = text.slice(0, at).replace(/%.*?(\]?)$/, "$1");
	return { host: ["0.0.0.0", "[::]", "*"].includes(host) ? "*" : host, port };
}

function unique(found: Listener[]): Listener[] {
	const seen = new Set<string>();
	return found.filter((each) => {
		const key = `${each.pid} ${each.host} ${each.port}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

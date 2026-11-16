import { afterEach, beforeEach } from "bun:test";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { MemoryLogger } from "core/log";
import { NodeFs, NodePs } from "core/system";
import { Cut } from "../cut";
import { type MirrorOptions, MirrorStep } from "./mirror-step";

/**
 * Registers the hooks that seed a throwaway mono repo and an empty bare remote
 * for each test, and returns the helpers the mirror step's tests share. Its
 * tests span several files so they run in parallel.
 */
export const mirrorFixture = () => {
	const fs = new NodeFs();
	const ps = new NodePs();
	const ctx = { dir: "", log: new MemoryLogger() };

	const put = async (path: string, text: string) => {
		await fs.mkdir(path.slice(0, path.lastIndexOf("/")));
		await fs.write(path, text);
	};
	const json = (path: string, value: object) =>
		put(path, JSON.stringify(value));
	const git = async (cwd: string, ...args: string[]) =>
		(await ps.spawnCapture(["git", ...args], { cwd })).stdout.trim();
	const cut = () =>
		new Cut("1.2.3", [], { root: `${ctx.dir}/mono`, log: ctx.log });
	const step = (opts: Partial<MirrorOptions> = {}) =>
		new MirrorStep({
			project: "app",
			remote: `${ctx.dir}/remote.git`,
			config: { exclude: ["**/.vet/**"] },
			scratch: `${ctx.dir}/scratch`,
			fs,
			ps,
			...opts,
		});

	beforeEach(async () => {
		ctx.dir = realpathSync(mkdtempSync(`${tmpdir()}/mirror-`));
		ctx.log = new MemoryLogger();
		await ps.spawnCapture(["git", "init", "--bare", `${ctx.dir}/remote.git`]);
		const mono = `${ctx.dir}/mono`;
		await json(`${mono}/package.json`, {
			workspaces: {
				packages: [
					"core/packages/core",
					"app/packages/lib",
					"other/packages/pub",
					"other/packages/hidden",
					"vet/packages/vet",
				],
				catalog: {
					zod: "^4.0.0",
					react: "^19.0.0",
					"@types/react": "^19.0.0",
				},
			},
			devDependencies: { typescript: "^7", vet: "workspace:*" },
		});
		await put(`${mono}/tsconfig.base.json`, "{}");
		await json(`${mono}/app/packages/lib/package.json`, {
			name: "lib",
			dependencies: { core: "workspace:*", zod: "catalog:" },
		});
		await put(
			`${mono}/app/packages/lib/tsconfig.json`,
			'{"extends": "../../../tsconfig.base.json"}',
		);
		await put(
			`${mono}/app/packages/lib/index.ts`,
			'import { a } from "core/a";\nexport { a };\n',
		);
		await put(`${mono}/app/.vet/rule.ts`, "export {};\n");
		await json(`${mono}/core/packages/core/package.json`, {
			name: "core",
			private: true,
			exports: { "./a": "./a/index.ts", "./b": "./b/index.ts" },
			dependencies: { zod: "catalog:", unused: "^1" },
			peerDependencies: { react: "catalog:" },
			devDependencies: { "@types/react": "catalog:", "@types/bun": "^1" },
		});
		await put(
			`${mono}/core/packages/core/a/index.ts`,
			'import { z } from "zod";\nimport "react";\nexport const a = z;\n',
		);
		await put(`${mono}/core/packages/core/b/index.ts`, "export {};\n");
		await json(`${mono}/vet/packages/vet/package.json`, { name: "vet" });
		await json(`${mono}/other/packages/pub/package.json`, {
			name: "pub",
			version: "0.4.0",
		});
		await json(`${mono}/other/packages/hidden/package.json`, {
			name: "hidden",
			private: true,
		});
		await git(mono, "init", "-q");
		await git(mono, "add", "--all");
		await git(
			mono,
			"-c",
			"user.name=Dev",
			"-c",
			"user.email=dev@example.com",
			"commit",
			"-q",
			"-m",
			"Seed",
		);
	});

	afterEach(() => fs.rm(ctx.dir, { recursive: true, force: true }));

	return { ctx, fs, ps, put, json, git, cut, step };
};

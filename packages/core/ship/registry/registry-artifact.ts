import { color, type Logger } from "core/log";
import { Duration } from "core/time";
import type { Artifact, Stage } from "../artifact/artifact";
import type { Cut } from "../cut";
import type { CheckReport, Step, StepReport } from "../step";
import type { Registry } from "./registry";

/** How often a run a publish handed off is looked in on: a run takes a minute or two. */
const RUN_CHECK_EVERY = Duration.secs(5);

/** How long a version may wait to go live before its `Live` step reports it `held`. */
// npm's scan takes about five minutes, fifteen at its busiest, and holds some
// versions for a person at npm to review, so this is well past the busiest.
const HELD_AFTER = Duration.mins(20);

/** One package, published through the registry that carries it. */
export class RegistryArtifact implements Artifact {
	readonly packages: readonly string[];
	readonly stage: Stage = "publish";
	/** Set only when the registry has a CI job to trust. */
	readonly trust?: (log: Logger) => Promise<void>;
	/** Set only when the registry checks a package before it goes out. */
	readonly verify?: (cut: Cut) => Promise<void>;
	private saidHeld = false;
	/** What the handed-off run was doing when last looked in on, to log each change once. */
	private runStatus?: string;

	constructor(
		readonly name: string,
		private readonly registry: Registry,
	) {
		this.packages = [name];
		const { trust } = registry;
		if (trust !== undefined) {
			this.trust = (log) => trust.call(registry, name, log);
		}
		const { verify } = registry;
		if (verify !== undefined) {
			this.verify = async (cut) => {
				const pkg = cut.packages.find((one) => one.name === name);
				if (pkg !== undefined) {
					await verify.call(registry, pkg);
				}
			};
		}
	}

	trusted(): Artifact {
		const registry = this.registry.trusted?.();
		return registry === undefined
			? this
			: new RegistryArtifact(this.name, registry);
	}

	deployed(): Promise<string | undefined> {
		return this.registry.deployed(this.name);
	}

	steps(cut: Cut): readonly Step[] {
		const publish: Step = {
			name: `${this.registry.staged ? "Stage" : "Publish"} ${this.name}@${cut.version}`,
			deadline: this.registry.publishDeadline ?? Duration.mins(5),
			stage: "publish",
			run: (at, report) => this.publish(at, report),
			dryRun: (at) => this.pack(at),
			...this.watching(),
		};
		if (this.registry.staged !== true && this.registry.scans !== true) {
			return [publish];
		}
		// Every package goes out before any waits, so a person approves them in
		// one sitting and the scans run side by side, and the tag follows only
		// once each is live. The wait never gives up: a version npm holds for
		// review goes live once it passes, and a rerun would only wait again.
		return [
			publish,
			{
				name: `Live ${this.name}@${cut.version}`,
				deadline: Duration.hrs(1),
				stage: "approve",
				run: async () => {},
				dryRun: async () => {},
				check: (at, waited) => this.live(at, waited),
			},
		];
	}

	/** Packs what `publish` would send into the dry run's packs, or says it would send it. */
	private async pack(cut: Cut): Promise<void> {
		const { version, log, dryRun } = cut;
		const dir = cut.dir(this.name);
		if (dir === undefined) {
			throw new Error(`"${this.name}" has no workspace package`);
		}
		if (this.registry.pack === undefined || dryRun === undefined) {
			log.info(`${this.name}@${version} ${color.yellow("would publish")}`);
			return;
		}
		await this.registry.pack(dir, `${dryRun.dir}/packs`);
		log.info(`${this.name}@${version} ${color.green("packed")}`);
	}

	/** The check that follows a publish handed off to a run elsewhere, when this registry has one. */
	private watching(): Pick<Step, "check" | "checkEvery"> {
		const { watch } = this.registry;
		if (watch === undefined) {
			return {};
		}
		return {
			checkEvery: RUN_CHECK_EVERY,
			check: async ({ version, log }, waited) => {
				const found = await watch.call(this.registry, this.name, version);
				if (found.passed) {
					const after = waited.isEqual(Duration.zero())
						? ""
						: ` after ${waited.human()}`;
					log.info(
						`${this.name}@${version} ${color.green("publish run finished")}${after}`,
					);
					return found;
				}
				if (found.status !== this.runStatus) {
					this.runStatus = found.status;
					const doing = (found.status ?? "waiting").replaceAll("_", " ");
					log.info(
						`${this.name}@${version} publish run ${color.yellow(doing)}${found.url === undefined ? "" : `: ${found.url}`}`,
					);
				}
				return found;
			},
		};
	}

	/** Whether the version is installable yet, and if not, what it may be waiting on. */
	async live(cut: Cut, waited: Duration): Promise<CheckReport> {
		const { version, log } = cut;
		if (await this.registry.published(this.name, version)) {
			return { passed: true };
		}
		const url = this.registry.page?.(this.name, version);
		const status = waited.isLessThan(HELD_AFTER) ? "pending" : "held";
		if (waited.isEqual(Duration.zero())) {
			this.saidHeld = false;
			log.info(
				`${this.name}@${version} ${color.yellow("not live yet")}: waiting for ${this.registry.staged === true ? "approval and " : ""}the registry's checks`,
			);
		} else if (status === "held" && !this.saidHeld) {
			this.saidHeld = true;
			log.info(
				`${this.name}@${version} ${color.yellow("still not live")} after ${waited.human()}: the registry may be holding it for review${url === undefined ? "" : `, see ${url}`}`,
			);
		}
		return { passed: false, status, ...(url === undefined ? {} : { url }) };
	}

	async publish(cut: Cut, report?: StepReport): Promise<void> {
		const { version, log } = cut;
		if (await this.registry.published(this.name, version)) {
			log.info(`${this.name}@${version} ${color.green("already published")}`);
			return;
		}
		const dir = cut.dir(this.name);
		if (dir === undefined) {
			// Unreachable while the roster check a release makes holds its gate.
			throw new Error(`"${this.name}" has no workspace package`);
		}
		const { already, staged } = await this.registry.publish(dir);
		if (already === true) {
			log.info(
				`${this.name}@${version} ${color.green("already accepted")}: the registry took it on an earlier run`,
			);
			return;
		}
		if (staged === undefined) {
			log.info(
				this.registry.watch === undefined
					? `${this.name}@${version} ${color.green("published")}`
					: `${this.name}@${version} ${color.green("publish run started")}`,
			);
			return;
		}
		log.info(
			`${this.name}@${version} ${color.green("staged")}: approve ${staged.stageId} at ${staged.url}`,
		);
		await report?.staged({ package: this.name, version, ...staged });
	}
}

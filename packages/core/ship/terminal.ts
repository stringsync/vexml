import type { StepCtxs, Terminal } from "./process-ctx";
import { runSteps } from "./runner";
import { type Bump, steps, type Target, type Upstream, view } from "./target";

/** One ship of a target run in a terminal. */
export interface TerminalShip {
	target: Target;
	bump?: Bump;
	version?: string;
	upstream: (name: string) => Upstream;
}

/**
 * Ships a whole target for the person at `terminal`: shows the plan, asks
 * before starting, then runs every step in order, skipping those already
 * done and running together those with no order between them. Returns
 * whether it shipped; a failed step throws, naming it.
 */
export async function shipInTerminal(
	ship: TerminalShip,
	terminal: Terminal,
	ctxs: StepCtxs,
): Promise<boolean> {
	const reviewed = view(ship.target, {
		bump: ship.bump,
		version: ship.version,
		upstream: ship.upstream,
	});
	if (ship.target.version && reviewed.version === undefined) {
		throw new Error(
			`The target "${ship.target.name}" needs --version or --bump`,
		);
	}
	const planned = steps(ship.target, {
		version: reviewed.version,
		bump: reviewed.bump,
		upstream: ship.upstream,
	});
	const at = reviewed.bump;
	terminal.print(
		`${ship.target.name}${reviewed.version ? ` at ${reviewed.version}` : at ? ` at the next ${at}` : ""}:`,
	);
	for (const each of planned) {
		terminal.print(`  ${each.id}: ${each.does}`);
	}
	const answer = await terminal.ask("Ship it? [y/N] ");
	if (!/^y(es)?$/i.test(answer.trim())) {
		terminal.print("Not shipped.");
		return false;
	}
	await runSteps(planned, async (each) => {
		const ctx = ctxs.terminal(terminal, each.id);
		if (each.done && (await each.done(ctx))) {
			terminal.print(`[${each.id}] already done, skipped`);
			return;
		}
		terminal.print(`[${each.id}] ${each.does}`);
		await each.run(ctx);
		terminal.print(`[${each.id}] done`);
	});
	terminal.print(`Shipped ${ship.target.name}.`);
	return true;
}

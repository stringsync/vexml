import type { Engine } from '../../vex/perf-events';

/** The color that stands for each engine in every dot, legend and chart on the page. */
export const ENGINE_COLORS: Record<Engine, string> = {
	// Checked as a set with the dataviz palette validator, all pairs on white: CVD and
	// normal-vision separation pass, and all three clear 3:1. vexml takes the brand pink a
	// step darker, so it holds 3:1 on a card.
	vexml: '#e0267f',
	osmd: '#2a78d6',
	alphatab: '#008300',
};

export const ENGINE_LABELS: Record<Engine, string> = {
	vexml: 'vexml',
	osmd: 'OSMD',
	alphatab: 'alphaTab',
};

export function EngineDot({ engine }: { engine: Engine }) {
	return (
		<span
			className="inline-block size-2 shrink-0 rounded-full"
			style={{ background: ENGINE_COLORS[engine] }}
		/>
	);
}

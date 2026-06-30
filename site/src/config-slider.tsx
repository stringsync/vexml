import type { ReactNode } from 'react';
import { ResetIcon } from './icons';

// One labelled range slider in the Config panel: label + current value + a reset button, the
// range input, and a description. The caller owns the value and the reset behavior (the four
// scalar config keys reset alike; reference width strips the layout object), so onChange/onReset/
// canReset are passed in.
export function ConfigSlider({
	id,
	label,
	display,
	value,
	min,
	max,
	step,
	onChange,
	onReset,
	canReset,
	description,
}: {
	id: string;
	label: string;
	display: ReactNode;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onReset: () => void;
	canReset: boolean;
	description: string;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label
				htmlFor={id}
				className="flex items-center justify-between text-xs font-medium text-zinc-500"
			>
				{label}
				<span className="flex items-center gap-1.5">
					<span className="font-mono text-zinc-400">{display}</span>
					<button
						type="button"
						onClick={onReset}
						disabled={!canReset}
						aria-label={`Reset ${label.toLowerCase()}`}
						className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
					>
						<ResetIcon />
					</button>
				</span>
			</label>
			<input
				id={id}
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={onChange}
			/>
			<p className="text-xs text-zinc-400">{description}</p>
		</div>
	);
}

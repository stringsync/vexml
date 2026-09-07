import type { ReactNode } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';

// One labelled slider in the Layout panel: the label and its current value on one row, the
// slider under it. Resetting is the card's job, not each row's, so there is no button here.
export interface ConfigSliderProps {
	id: string;
	label: string;
	/* The value as shown beside the label, which may be formatted (e.g. two decimals). */
	display: ReactNode;
	value: number;
	min: number;
	max: number;
	step: number;
	onChange: (value: number) => void;
	/* What the knob does, kept as the row's hover text now that the panel shows no prose. */
	description: string;
}

export function ConfigSlider({
	id,
	label,
	display,
	value,
	min,
	max,
	step,
	onChange,
	description,
}: ConfigSliderProps) {
	return (
		<Field title={description}>
			<FieldLabel htmlFor={id} className="w-full justify-between font-normal">
				<span className="text-muted-foreground">{label}</span>
				<span className="font-semibold tabular-nums">{display}</span>
			</FieldLabel>
			<Slider
				id={id}
				min={min}
				max={max}
				step={step}
				value={[value]}
				onValueChange={(next) => onChange(next[0] ?? value)}
			/>
		</Field>
	);
}

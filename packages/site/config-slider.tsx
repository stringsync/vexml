import { RotateCcwIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';

// One labelled slider in the Config panel: label + current value + a reset button, the
// slider, and a description. The caller owns the value and the reset behavior (the four
// scalar config keys reset alike; reference width strips the layout object), so onChange/onReset/
// canReset are passed in.
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
	onReset: () => void;
	/* Whether this knob differs from vexml's default, which is what enables the reset button. */
	canReset: boolean;
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
	onReset,
	canReset,
	description,
}: ConfigSliderProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id} className="w-full justify-between">
				{label}
				<span className="flex items-center gap-1.5">
					<span className="font-mono text-muted-foreground">{display}</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onReset}
						disabled={!canReset}
						aria-label={`Reset ${label.toLowerCase()}`}
					>
						<RotateCcwIcon />
					</Button>
				</span>
			</FieldLabel>
			<Slider
				id={id}
				min={min}
				max={max}
				step={step}
				value={[value]}
				onValueChange={(next) => onChange(next[0] ?? value)}
			/>
			<FieldDescription>{description}</FieldDescription>
		</Field>
	);
}

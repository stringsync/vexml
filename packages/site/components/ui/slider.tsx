'use client';

import { cn } from 'cn';
import { Slider as SliderPrimitive } from 'radix-ui';
import * as React from 'react';

// Two looks over the same control. `default` is the layout panel's knob: a hairline track with
// an open pink-ringed thumb. `seek` is the player's progress strip, which is read at a glance
// from across the room, so the thumb is a filled dot ringed in the bar's own white.
function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	variant = 'default',
	...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
	variant?: 'default' | 'seek';
}) {
	const _values = React.useMemo(
		() =>
			Array.isArray(value)
				? value
				: Array.isArray(defaultValue)
					? defaultValue
					: [min, max],
		[value, defaultValue, min, max],
	);

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			data-variant={variant}
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			className={cn(
				'group/slider relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col',
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Track
				data-slot="slider-track"
				className="relative grow overflow-hidden rounded-xs bg-track data-horizontal:h-[3px] data-horizontal:w-full data-vertical:h-full data-vertical:w-[3px]"
			>
				<SliderPrimitive.Range
					data-slot="slider-range"
					className="absolute bg-brand select-none data-horizontal:h-full data-vertical:w-full"
				/>
			</SliderPrimitive.Track>
			{Array.from({ length: _values.length }, (_, index) => (
				<SliderPrimitive.Thumb
					data-slot="slider-thumb"
					key={index}
					className="relative block shrink-0 rounded-full ring-ring/40 transition-[box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/slider:size-3.5 group-data-[variant=default]/slider:border-2 group-data-[variant=default]/slider:border-brand group-data-[variant=default]/slider:bg-white group-data-[variant=seek]/slider:size-[11px] group-data-[variant=seek]/slider:bg-brand group-data-[variant=seek]/slider:shadow-[0_0_0_2px_var(--card)]"
				/>
			))}
		</SliderPrimitive.Root>
	);
}

export { Slider };

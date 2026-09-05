import { cn } from 'cn';
import { Switch as SwitchPrimitive } from 'radix-ui';
import type * as React from 'react';

// On is the brand pink rather than the near-black primary: a switch here reports a layout
// choice the user made, which is the same thing every filled slider range says.
function Switch({
	className,
	size = 'default',
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
	size?: 'sm' | 'default' | 'lg';
}) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=lg]:h-6 data-[size=lg]:w-10 data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-brand data-unchecked:bg-track data-disabled:cursor-not-allowed data-disabled:opacity-50',
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="pointer-events-none block rounded-full bg-white ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=lg]/switch:size-5 group-data-[size=sm]/switch:size-3 data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };

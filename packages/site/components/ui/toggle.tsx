import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Toggle as TogglePrimitive } from 'radix-ui';
import type * as React from 'react';

const toggleVariants = cva(
	"group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-[state=on]:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				outline: 'border border-input bg-transparent hover:bg-muted',
				// One cell of a segmented control: the chosen one is a filled dark chip, the rest
				// are bare labels on whatever the container is sitting on. Selection is read off
				// aria-checked as well as data-state, because a cell wrapped in a TooltipTrigger
				// hands its data-state over to the tooltip and only the ARIA state survives.
				segment:
					'rounded-sm bg-transparent text-secondary-foreground hover:bg-foreground/5 hover:text-foreground aria-checked:bg-primary aria-checked:text-primary-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
			},
			size: {
				default:
					'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
				xs: "h-6.5 min-w-6.5 rounded-sm px-2 text-2xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: 'h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

function Toggle({
	className,
	variant = 'default',
	size = 'default',
	...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
	VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive.Root
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };

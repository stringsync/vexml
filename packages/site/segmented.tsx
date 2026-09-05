import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

/* One cell: the value it selects, the word on it, and optionally an icon and a hover hint. */
export interface SegmentedOption<T extends string> {
	value: T;
	label: string;
	icon?: LucideIcon;
	hint?: string;
}

export interface SegmentedProps<T extends string> {
	value: T;
	onChange: (value: T) => void;
	options: ReadonlyArray<SegmentedOption<T>>;
	/* What the whole control is choosing, for screen readers. */
	label: string;
	/* 26px cells rather than 28px, for the denser rows inside the control panel. */
	size?: 'sm' | 'default';
	/* Values that read as code (the overflow modes), set in the mono face. */
	mono?: boolean;
	/* Stretch the cells into equal columns across the full width. */
	stretch?: boolean;
	className?: string;
}

/*
 * A row of mutually exclusive cells in an inset tray: a small option set worth showing all of at
 * once, where a Select would hide two thirds of it behind a click.
 *
 * The tray's fill is the caller's, because it has to sit against whatever surface it lands on —
 * muted inside a white card, white against the page.
 */
export function Segmented<T extends string>({
	value,
	onChange,
	options,
	label,
	size = 'default',
	mono = false,
	stretch = false,
	className,
}: SegmentedProps<T>) {
	return (
		<ToggleGroup
			type="single"
			variant="segment"
			size={size === 'sm' ? 'xs' : 'sm'}
			// 0 would fuse the cells into one continuous bar; the design keeps them as separate
			// chips floating in the tray.
			spacing={1}
			value={value}
			// Radix reports '' when the pressed cell is toggled off; one cell is always chosen,
			// so that deselection is not a state this can be in.
			onValueChange={(next) => next && onChange(next as T)}
			aria-label={label}
			className={cn(
				'gap-[3px] rounded-[var(--radius-segment)] border border-border p-[3px] data-[size=sm]:rounded-[var(--radius-segment)]',
				stretch && 'grid w-full auto-cols-fr grid-flow-col',
				className,
			)}
		>
			{options.map(({ value: option, label: text, icon: Icon, hint }) => {
				const item = (
					<ToggleGroupItem
						key={option}
						value={option}
						className={cn(
							'gap-1.5 rounded-sm px-2.5 font-medium aria-checked:font-semibold data-[state=on]:font-semibold',
							mono && 'font-mono',
							size === 'sm' ? 'text-2xs' : 'text-xs',
						)}
					>
						{Icon && <Icon />}
						{text}
					</ToggleGroupItem>
				);
				return hint ? (
					<Tooltip key={option}>
						<TooltipTrigger asChild>{item}</TooltipTrigger>
						<TooltipContent>{hint}</TooltipContent>
					</Tooltip>
				) : (
					item
				);
			})}
		</ToggleGroup>
	);
}

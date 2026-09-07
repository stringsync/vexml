import { cn } from 'cn';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';

// The action a Section's header carries: bare text rather than a button, pink while it has
// something to undo and grey once it hasn't, so the card says at a glance whether it is
// showing defaults.
export function SectionReset({
	onClick,
	disabled,
	title,
}: {
	onClick: () => void;
	disabled: boolean;
	title?: string;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className="h-auto px-0 text-xs font-normal text-brand hover:bg-transparent hover:text-brand/80 disabled:text-faint disabled:opacity-100"
		>
			Reset
		</Button>
	);
}

// One titled block of the control panel: an icon and a title, an optional control (e.g. "Reset")
// parked at the right of that row, and a body of Fields that space themselves. The card is an
// outline rather than a fill, because the panel it sits in is already the white surface.
export function Section({
	icon: Icon,
	title,
	action,
	gap = 'md',
	children,
}: {
	icon: LucideIcon;
	title: string;
	action?: ReactNode;
	/* The Layout card's rows carry sliders and need more air between them than the others. */
	gap?: 'md' | 'lg';
	children: ReactNode;
}) {
	return (
		// shrink-0: the panel that holds these is a scrolling flex column, and Card clips
		// its own overflow, so a shrinkable card would hide its last fields rather than scroll.
		<Card size="sm" className="shrink-0 gap-3 bg-transparent ring-border">
			<CardHeader className="px-3.5">
				<div className="flex items-center gap-2.5">
					<Icon className="size-[17px] shrink-0 text-muted-foreground" />
					<CardTitle className="flex-1 text-base group-data-[size=sm]/card:text-base">
						{title}
					</CardTitle>
					{action}
				</div>
			</CardHeader>
			<CardContent className="px-3.5">
				<FieldGroup className={cn(gap === 'lg' ? 'gap-[18px]' : 'gap-3')}>
					{children}
				</FieldGroup>
			</CardContent>
		</Card>
	);
}

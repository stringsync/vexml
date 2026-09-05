import type { ReactNode } from 'react';
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';

// One titled block of the control panel, with an optional control (e.g. "Reset all")
// parked in the header. The body is a FieldGroup, so the Fields inside space themselves.
export function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		// shrink-0: the panel that holds these is a scrolling flex column, and Card clips
		// its own overflow, so a shrinkable card would hide its last fields rather than scroll.
		<Card size="sm" className="shrink-0 bg-muted/40">
			{/* The header's own items-start would pin the title to the top of a row that the
			    taller action button sizes, leaving the two off by a few px; these Sections carry
			    no CardDescription, so centring the row is safe. row-span-1 keeps the action out
			    of the implicit second row it would otherwise straddle. */}
			<CardHeader className="items-center">
				<CardTitle>{title}</CardTitle>
				{action && <CardAction className="row-span-1">{action}</CardAction>}
			</CardHeader>
			<CardContent>
				<FieldGroup>{children}</FieldGroup>
			</CardContent>
		</Card>
	);
}

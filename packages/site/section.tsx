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
		<Card size="sm" className="bg-muted/40">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				{action && <CardAction>{action}</CardAction>}
			</CardHeader>
			<CardContent>
				<FieldGroup>{children}</FieldGroup>
			</CardContent>
		</Card>
	);
}

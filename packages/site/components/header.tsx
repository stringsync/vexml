import { cn } from 'cn';
import {
	CheckIcon,
	CopyIcon,
	ExternalLinkIcon,
	SlidersHorizontalIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const INSTALL = 'npm i @stringsync/vexml';
const REPO = 'https://github.com/stringsync/vexml';

// How long the copy button holds its check before falling back to the copy icon.
const COPIED_MS = 1500;

export function Header({
	controlsOpen,
	onOpenControls,
}: {
	controlsOpen: boolean;
	onOpenControls: () => void;
}) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) {
			return;
		}
		const id = window.setTimeout(() => setCopied(false), COPIED_MS);
		return () => window.clearTimeout(id);
	}, [copied]);

	return (
		<header className="flex shrink-0 items-center gap-2.5 border-b bg-card px-4 py-3 md:h-14 md:gap-5 md:px-5 md:py-0">
			{/* The x is the one letter that carries the brand, so it is the one letter in pink. */}
			<div className="font-display text-[20px] leading-none font-black tracking-[-0.5px] italic font-stretch-125% md:text-[22px]">
				ve<span className="text-brand">x</span>ml
			</div>
			<span className="hidden text-sm text-muted-foreground md:inline">
				MusicXML renderer for the web
			</span>

			<div className="ml-auto flex items-center gap-3.5 md:gap-[18px]">
				{/* The install line is the whole reason a visitor might want the package rather
				    than the playground, so it is copyable rather than merely readable. */}
				<div className="hidden h-9 items-center gap-2.5 rounded-lg border border-border bg-muted pr-1.5 pl-3.5 font-mono text-sm text-secondary-foreground md:inline-flex">
					<span>
						<span className="text-brand">$</span> {INSTALL}
					</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="size-6.5 text-faint"
						onClick={() => {
							navigator.clipboard.writeText(INSTALL).then(
								() => setCopied(true),
								// A refused clipboard is the browser's call, not a fault here:
								// leave the icon alone so the button doesn't claim a copy that
								// never happened.
								() => {},
							);
						}}
						aria-label="Copy the install command"
					>
						{copied ? <CheckIcon /> : <CopyIcon />}
					</Button>
				</div>

				{/* A bare link, not a Button: it leaves the site, and button chrome would put it
				    on a level with the controls that act on the score. */}
				<a
					href={REPO}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary-foreground hover:text-foreground"
				>
					GitHub
					<ExternalLinkIcon className="size-[13px]" />
				</a>

				{/* Below md the control panel is a Sheet, and this is the only way to reach it. */}
				<Button
					type="button"
					variant="outline"
					size="icon-lg"
					onClick={onOpenControls}
					aria-label="Show controls"
					className={cn(
						'bg-muted text-secondary-foreground md:hidden',
						controlsOpen &&
							'border-transparent bg-brand-wash text-brand-ink hover:bg-brand-wash hover:text-brand-ink',
					)}
				>
					<SlidersHorizontalIcon />
				</Button>
			</div>
		</header>
	);
}

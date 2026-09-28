import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Breadcrumb } from '@/lib/crash-log';

/* Tells the reader the last visit died (on iOS, almost always out of memory), with the page's
 * last breadcrumb spelled out so it can be pasted straight into a bug report. */
export function CrashNotice({
	crumb,
	onDismiss,
}: {
	crumb: Breadcrumb;
	onDismiss: () => void;
}) {
	return (
		<Alert variant="destructive" className="mb-2">
			<AlertTitle>The last visit ended unexpectedly</AlertTitle>
			<AlertDescription>
				<p>Most likely the browser ran out of memory. At the time:</p>
				<pre className="mt-1 font-mono text-2xs whitespace-pre-wrap select-all">
					{[
						`score: ${crumb.fixture || '(not a fixture)'}`,
						`canvas: ${crumb.canvasMb} MB in ${crumb.canvases} canvases`,
						`renders: ${crumb.renders}`,
						`last input: ${crumb.lastInput}, ${crumb.inputsPerSecond}/s`,
						`at: ${crumb.at}`,
						`ua: ${crumb.userAgent}`,
					].join('\n')}
				</pre>
			</AlertDescription>
			<AlertAction>
				<Button size="sm" variant="ghost" onClick={onDismiss}>
					Dismiss
				</Button>
			</AlertAction>
		</Alert>
	);
}

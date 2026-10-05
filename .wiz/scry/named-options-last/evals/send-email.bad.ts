import type { Transport } from "./transport";
import { SmtpTransport } from "./transport";

export interface EmailOptions {
	cc?: string[];
	replyTo?: string;
}

export async function sendEmail(
	to: string,
	body: string,
	opts: EmailOptions,
	transport?: Transport,
): Promise<void> {
	const sender = transport ?? new SmtpTransport();
	await sender.deliver({ to, body, cc: opts.cc ?? [], replyTo: opts.replyTo });
}

await sendEmail("ops@example.com", "Disk usage at 91%", {}, new SmtpTransport());

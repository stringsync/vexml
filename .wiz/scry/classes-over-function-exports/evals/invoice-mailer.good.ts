export interface Mailer {
	send(to: string, subject: string, html: string): Promise<void>;
}

export class InvoiceMailer {
	constructor(
		private mailer: Mailer,
		private templates: TemplateRenderer,
	) {}

	async sendInvoice(invoice: Invoice): Promise<void> {
		const html = this.templates.render("invoice", invoice);
		await this.mailer.send(invoice.email, invoiceSubject(invoice), html);
	}

	async sendReminder(invoice: Invoice, daysLate: number): Promise<void> {
		const html = this.templates.render("reminder", { ...invoice, daysLate });
		await this.mailer.send(invoice.email, `Reminder: ${invoiceSubject(invoice)}`, html);
	}
}

export const invoiceSubject = (invoice: Invoice): string =>
	`Invoice ${invoice.number} for ${formatCents(invoice.totalCents)}`;

export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

import { expect, it } from "bun:test";
import { InvoiceMailer, type Outbox } from "./invoice-mailer.ts";

class FakeOutbox implements Outbox {
	readonly sent: { to: string; subject: string }[] = [];

	async send(to: string, subject: string): Promise<void> {
		this.sent.push({ to, subject });
	}
}

it("emails the customer when an invoice is issued", async () => {
	const outbox = new FakeOutbox();
	await new InvoiceMailer(outbox).issued({ id: "inv_42", email: "ana@example.com" });
	expect(outbox.sent).toEqual([{ to: "ana@example.com", subject: "Invoice inv_42" }]);
});

it("sends nothing for an invoice without an email", async () => {
	const outbox = new FakeOutbox();
	await new InvoiceMailer(outbox).issued({ id: "inv_43", email: "" });
	expect(outbox.sent).toEqual([]);
});

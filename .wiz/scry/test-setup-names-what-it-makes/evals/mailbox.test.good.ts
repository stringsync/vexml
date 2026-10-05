import { describe, expect, it } from "bun:test";
import { Mailbox } from "./mailbox";

describe("Mailbox", () => {
	it("lists unread messages first", () => {
		const mailbox = inboxOf(["read", "unread", "read"]);
		expect(mailbox.list().map((message) => message.read)).toEqual([false, true, true]);
	});

	it("marks every message read when cleared", () => {
		const mailbox = inboxOf(["unread", "unread"]);
		mailbox.markAllRead();
		expect(mailbox.unreadCount()).toBe(0);
	});
});

/** A mailbox holding one message per state given, oldest first. */
function inboxOf(states: Array<"read" | "unread">): Mailbox {
	const mailbox = new Mailbox();
	for (const [index, state] of states.entries()) {
		mailbox.receive({ id: `m${index}`, subject: `Subject ${index}`, read: state === "read" });
	}
	return mailbox;
}

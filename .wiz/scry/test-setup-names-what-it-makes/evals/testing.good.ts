import { FakeClock } from "webappwiz/time";
import { FakeMailer } from "./fake-mailer";
import { InMemoryUsers } from "./in-memory-users";
import { Notifier } from "./notifier";

/** The dependencies a notifier runs against, wired together. */
export class Testing {
	readonly clock = new FakeClock();
	readonly mailer = new FakeMailer();
	readonly users = new InMemoryUsers();

	notifier(): Notifier {
		return new Notifier(this.clock, this.mailer, this.users);
	}
}

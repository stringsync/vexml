/** The dependencies a checkout runs against, wired together. */
export class Testing {
	readonly gateway = new FakeGateway();
	readonly catalog = new Catalog([apple, pear]);

	session(): Session {
		return Session.begin(this.gateway, this.catalog);
	}
}

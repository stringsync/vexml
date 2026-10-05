export class Server implements AsyncResource {
	private disposer = new AsyncDisposer();

	constructor(private server: Bun.Server, db: Database) {
		this.disposer.use(db);
		this.disposer.defer(() => this.server.stop());
	}

	disposeAsync = this.disposer.disposeAsync;
}

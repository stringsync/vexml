export class Fetcher {
	constructor(
		private readonly http: Http,
		private readonly opts: RetryOptions = {},
	) {}
}

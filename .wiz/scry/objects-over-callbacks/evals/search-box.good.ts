export interface SearchHit {
	id: string;
	title: string;
}

export class SearchBox {
	private controller?: AbortController;

	constructor(
		private readonly input: HTMLInputElement,
		private readonly list: HTMLUListElement,
	) {
		input.addEventListener("input", () => this.search(input.value));
	}

	private search(query: string): void {
		this.controller?.abort();
		this.controller = new AbortController();
		fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: this.controller.signal })
			.then((response) => response.json() as Promise<SearchHit[]>)
			.then((hits) => this.render(hits.filter((hit) => hit.title.length > 0)))
			.catch(() => {});
	}

	private render(hits: SearchHit[]): void {
		this.list.replaceChildren(
			...hits.map((hit) => Object.assign(document.createElement("li"), { textContent: hit.title })),
		);
	}
}

export interface Page<T> {
	items: T[];
	page: number;
	totalPages: number;
}

export function paginate<T>(
	items: T[],
	opts: { pageSize?: number; page?: number },
): Page<T> {
	const pageSize = opts.pageSize ?? 20;
	const page = opts.page ?? 1;
	const start = (page - 1) * pageSize;
	return {
		items: items.slice(start, start + pageSize),
		page,
		totalPages: Math.ceil(items.length / pageSize),
	};
}

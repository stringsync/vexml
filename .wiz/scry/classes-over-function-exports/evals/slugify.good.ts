export function slugify(title: string): string {
	return title
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function uniqueSlug(title: string, taken: Set<string>): string {
	const base = slugify(title);
	let slug = base;
	for (let n = 2; taken.has(slug); n++) {
		slug = `${base}-${n}`;
	}
	return slug;
}

export function isSlug(value: string): boolean {
	return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

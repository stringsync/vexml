const separators = /[\s_]+/g;
const invalid = /[^a-z0-9-]/g;

/**
 * Strips accents with NFKD before the regex pass. The old version used a
 * lookup table; drop this note once the table is deleted from git history.
 * TODO: handle CJK input.
 */
function normalize(text: string): string {
	return text.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Turns a title into a lowercase, URL-safe slug such as `hello-world`. */
export function slugify(title: string): string {
	return normalize(title)
		.toLowerCase()
		.trim()
		.replace(separators, "-")
		.replace(invalid, "")
		.replace(/-+/g, "-");
}

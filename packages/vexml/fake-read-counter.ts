/* Fake view of a real object that counts how often each of its properties is read, so a test
 * can check that code caches what it reads without redefining getters on the object itself.
 * Every read passes through to the real object, except a property `replacements` names, which
 * reads from there (a getter there reads lazily, so two views can name each other). Methods
 * run against the real object, so its private state keeps working. Test-only. */
export class FakeReadCounter<T extends object> {
	readonly view: T;
	private readonly counts = new Map<PropertyKey, number>();

	constructor(target: T, replacements: Partial<T> = {}) {
		this.view = new Proxy(target, {
			get: (real, key) => {
				this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
				const value = Object.hasOwn(replacements, key)
					? Reflect.get(replacements, key)
					: Reflect.get(real, key);
				return typeof value === 'function' ? value.bind(real) : value;
			},
		});
	}

	readsOf(key: keyof T): number {
		return this.counts.get(key) ?? 0;
	}
}

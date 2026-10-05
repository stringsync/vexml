type Constructor<T = object> = new (...args: any[]) => T;

export function Timestamped<TBase extends Constructor>(Base: TBase) {
	return class extends Base {
		createdAt = new Date();
		updatedAt = new Date();

		touch(): void {
			this.updatedAt = new Date();
		}
	};
}

export class Entity {
	constructor(readonly id: string) {}
}

export const TimestampedEntity = Timestamped(Entity);

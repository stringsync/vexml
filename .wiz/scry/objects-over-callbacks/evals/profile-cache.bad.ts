export interface Profile {
	id: string;
	displayName: string;
}

export class ProfileCache {
	private readonly entries = new Map<string, Profile>();

	constructor(private readonly loadProfile: (id: string) => Promise<Profile>) {}

	async get(id: string): Promise<Profile> {
		const cached = this.entries.get(id);
		if (cached) return cached;
		const profile = await this.loadProfile(id);
		this.entries.set(id, profile);
		return profile;
	}

	forget(id: string): void {
		this.entries.delete(id);
	}
}

import type { Clock } from "./clock.ts";
import type { FlagStore } from "./flag-store.ts";

export async function isEnabled(name: string, store: FlagStore, clock: Clock): Promise<boolean> {
	const flag = await store.get(name);
	if (!flag) return false;
	if (flag.expiresAt && flag.expiresAt < clock.now()) return false;
	return flag.enabled;
}

export async function enabledFlags(store: FlagStore, clock: Clock): Promise<string[]> {
	const names = await store.names();
	const enabled: string[] = [];
	for (const name of names) {
		if (await isEnabled(name, store, clock)) enabled.push(name);
	}
	return enabled;
}

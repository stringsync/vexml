import type { Ps } from "../ps/ps";

export interface IpProvider {
	get(): Promise<string>;
}

/** What an ip provider asks about the machine; the real process by default. */
export interface IpProviderOptions {
	ps?: Ps;
}

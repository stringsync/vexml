import type { HostMapper } from "./host-mapper";

export class NoopHostMapper implements HostMapper {
	map(): Promise<void> {
		return Promise.resolve();
	}
}

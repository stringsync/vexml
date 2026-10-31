/**
 * HostMapper is the hostname-to-IP seam. Typically, this is assigned the
 * variable name `hostMapper`.
 *
 * Mapping is idempotent: an implementation adds the entry, rewrites it when
 * the IP has changed, and does nothing when it already matches. Writing the
 * real hosts file needs elevated privileges, so `map` may prompt.
 */
export interface HostMapper {
	map(hostname: string, ip: string): Promise<void>;
}

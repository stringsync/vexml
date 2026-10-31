/**
 * PortProvider is the seam that answers which port to listen on. Typically,
 * this is assigned the variable name `ports`.
 *
 * Which ports it will consider is the provider's own business, settled when it
 * is made, so a caller asks the same way whether it wants one exact port or
 * whatever is open near a preferred one. The port is worth asking for even
 * when this process is not the one binding it, which is the case for a
 * database or any other server started as a subprocess.
 */
export interface PortProvider {
	/** An open port, or a throw when there is none to give. */
	get(): Promise<number>;
}

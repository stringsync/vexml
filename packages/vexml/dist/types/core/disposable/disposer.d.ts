import type { Resource } from "./resource.js";
/** A stack of resources, released in reverse order of registration. */
export declare class Disposer implements Resource {
    private resources;
    private _disposed;
    get disposed(): boolean;
    use<T extends Resource>(resource: T): T;
    adopt<T>(value: T, dispose: (value: T) => void): T;
    defer(onDispose: () => void): void;
    /** Releases in reverse order, so a resource outlives whatever it depends on. */
    dispose(): void;
    private assertOpen;
}

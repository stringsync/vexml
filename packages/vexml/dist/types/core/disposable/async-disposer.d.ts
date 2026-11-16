import type { AsyncResource } from "./async-resource.js";
/** A stack of async resources, released in reverse order of registration. */
export declare class AsyncDisposer implements AsyncResource {
    private resources;
    private _disposed;
    private disposing;
    get disposed(): boolean;
    use<T extends AsyncResource>(resource: T): T;
    adopt<T>(value: T, disposeAsync: (value: T) => Promise<void>): T;
    defer(onDispose: () => Promise<void>): void;
    /** Safe to call twice: a second call waits for the first to finish. */
    disposeAsync: () => Promise<void>;
    private release;
    private assertOpen;
}

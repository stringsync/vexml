import type { Resource } from "./resource.js";
/** Ways of getting a `Resource` when you do not have an object to hand. */
export declare class disposables {
    private constructor();
    static noop(): Resource;
    static callback(dispose: () => void): Resource;
    static nullable(resource: Resource | null): Resource;
}

// The type only: a cli is built by `cli()` or `group()`, and anything that
// passes one around, a `mount()` signature say, needs to be able to say so.
export type { Cli } from "./cli";
export { cli } from "./cli";
// The schema an option or a positional takes, so a caller bringing their own
// validation library can say what this accepts.
export type { Arg, Meta, RestMeta } from "./command";
export type { Deps } from "./deps";
export type { Middleware, Next } from "./middleware";
export { timed } from "./timed";

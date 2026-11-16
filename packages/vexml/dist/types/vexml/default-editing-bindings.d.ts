import type { EditingBindings, EditingCommand, EditingKey } from './editing-bindings.js';
/** Arrows follow notes/chord members and voices. */
export declare class DefaultEditingBindings implements EditingBindings {
    resolve(key: EditingKey): EditingCommand | null;
}

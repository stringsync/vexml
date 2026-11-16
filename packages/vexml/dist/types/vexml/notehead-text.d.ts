import { Modifier } from 'vexflow/core';
export declare class NoteheadText extends Modifier {
    private readonly label;
    static get CATEGORY(): string;
    constructor(label: string);
    getCategory(): string;
    draw(): void;
}

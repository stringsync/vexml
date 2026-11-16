import type { CursorChangeEvent } from './events.js';
export interface CursorView {
    render(e: CursorChangeEvent): void;
    dispose(): void;
}

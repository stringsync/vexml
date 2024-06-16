export type AnyEventMap = { [eventName: string]: any };

export type EventListener<E> = E extends undefined ? () => void : (event: E) => void;

export type EventMap = Record<string, any>;

export type EventCallback<P> = P extends undefined ? () => void : (payload: P) => void;

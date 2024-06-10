export type Events = Record<string, any>;

export type Listener<P> = P extends undefined ? () => void : (payload: P) => void;

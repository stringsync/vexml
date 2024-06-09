export type Events = Record<string, any>;

export type Callback<P> = P extends undefined ? () => void : (payload: P) => void;

export declare class TileBudget<K> {
    readonly limit: number;
    private readonly areas;
    private total;
    constructor(limit: number);
    get used(): number;
    use(key: K, area: number): void;
    drop(key: K): void;
    trim(keep: ReadonlySet<K>): K[];
}

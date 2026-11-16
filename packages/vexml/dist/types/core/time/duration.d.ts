/**
 * A length of time, held as milliseconds. Durations are values: every operation
 * returns a new one, so passing one around cannot change it under the caller.
 * Taking a `Duration` rather than a bare number also stops the unit question
 * (seconds? millis?) from being asked at every call site.
 */
export declare class Duration {
    private readonly _ms;
    private constructor();
    static zero(): Duration;
    static ms(ms: number): Duration;
    static secs(secs: number): Duration;
    static mins(mins: number): Duration;
    static hrs(hrs: number): Duration;
    static days(days: number): Duration;
    static min(...durations: Duration[]): Duration;
    static max(...durations: Duration[]): Duration;
    get ms(): number;
    get secs(): number;
    get mins(): number;
    get hrs(): number;
    isEqual(other: Duration): boolean;
    isLessThan(other: Duration): boolean;
    isGreaterThan(other: Duration): boolean;
    isLessThanOrEqual(other: Duration): boolean;
    isGreaterThanOrEqual(other: Duration): boolean;
    add(other: Duration): Duration;
    subtract(other: Duration): Duration;
    multiply(factor: number): Duration;
    clamp(min: Duration, max: Duration): Duration;
    negate(): Duration;
    toString(): string;
    /**
     * Precision drops as the number grows, because nobody reading minutes cares
     * about the milliseconds.
     */
    human(): string;
}

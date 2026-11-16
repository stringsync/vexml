export interface ScrollHost {
    frame(): {
        sx: number;
        sy: number;
    };
    baseOffset(): {
        left: number;
        top: number;
    };
    readonly scroll: {
        left: number;
        top: number;
    };
    clientSize(): {
        width: number;
        height: number;
    };
    leftInset(): number;
    scrollTo(options: ScrollToOptions): void;
}

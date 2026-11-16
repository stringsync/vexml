export declare class DocumentLayout {
    private readonly defaults;
    private readonly prints;
    constructor(defaults: LayoutBlock, prints: ReadonlyMap<number, readonly (LayoutBlock | null)[]>);
    page(): DocumentPage | null;
    pageSize(m: number): PageSize | null;
    systemMargins(m: number): {
        left: number;
        right: number;
    };
    systemDistance(m: number): number | null;
    topSystemDistance(m: number): number | null;
    staffDistance(m: number, partIndex: number, staffNumber: string): number | null;
    startsPage(m: number): boolean;
    blankPages(m: number): number;
    private systemValue;
}
export declare const ANY_STAFF = "";
export type LayoutBlock = {
    pageWidth: number | null;
    pageHeight: number | null;
    pageMargins: PageMargins | null;
    evenPageMargins: PageMargins | null;
    systemLeft: number | null;
    systemRight: number | null;
    systemDistance: number | null;
    topSystemDistance: number | null;
    staffDistances: ReadonlyMap<string, number>;
    newPage: boolean;
    blankPages: number;
};
export type PageMargins = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};
export type PageSize = {
    height: number | null;
    marginTop: number | null;
    marginBottom: number | null;
};
export type DocumentPage = {
    width: number;
    height: number | null;
    margins: PageMargins;
    evenShift: number;
    evenNarrowing: number;
};

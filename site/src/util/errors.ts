export const wrap = (e: any): Error => (e instanceof Error ? e : new Error(String(e)));

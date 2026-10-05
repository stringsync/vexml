import { expect, it, mock } from "bun:test";

const writeFile = mock(async () => {});
const mkdir = mock(async () => undefined);

mock.module("node:fs/promises", () => ({ writeFile, mkdir }));

const { ReportExporter } = await import("./report-exporter.ts");

it("writes the CSV into the reports directory", async () => {
	await new ReportExporter("/tmp/reports").export("sales", [["q1", 120]]);

	expect(mkdir).toHaveBeenCalledWith("/tmp/reports", { recursive: true });
	expect(writeFile).toHaveBeenCalledWith("/tmp/reports/sales.csv", "q1,120\n");
});

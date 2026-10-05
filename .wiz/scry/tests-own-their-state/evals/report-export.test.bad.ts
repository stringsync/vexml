import { beforeEach, describe, expect, it } from "bun:test";
import { ReportExporter } from "./report-export";

describe("ReportExporter", () => {
	let exporter: ReportExporter;
	let storage: FakeStorage;
	let mailer: FakeMailer;
	let report: Report;

	beforeEach(() => {
		storage = new FakeStorage({ bucket: "reports", region: "eu-west-1" });
		mailer = new FakeMailer({ from: "reports@example.com" });
		report = new Report("Q3 revenue", [
			{ region: "EMEA", cents: 1_250_000 },
			{ region: "APAC", cents: 980_000 },
			{ region: "AMER", cents: 2_100_000 },
		]);
		exporter = new ReportExporter(storage, mailer, { format: "csv", compress: true });
	});

	it("writes a csv header", () => {
		expect(new ReportExporter(new FakeStorage(), new FakeMailer()).header()).toBe("region,cents");
	});

	it("emails the finance team a link", async () => {
		await exporter.export(report, { notify: "finance@example.com" });
		expect(mailer.sent[0].to).toBe("finance@example.com");
	});
});

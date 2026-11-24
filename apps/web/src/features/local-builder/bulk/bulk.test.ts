import type { RowResult } from "./validate";
import { describe, expect, it } from "vitest";
import { MAX_ROWS_PER_IMPORT, sampleCsvRows } from "./columns";
import { parseCsv, toCsv } from "./csv";
import { rowToResume, textToHtml } from "./to-resume";
import { matchTemplate, validateTable } from "./validate";

describe("parseCsv", () => {
	it("handles BOM, quotes, escaped quotes, newlines in cells and CRLF", () => {
		const text = '﻿full_name,summary\r\n"Doe, Jane","Line 1\nSaid ""hi"""\r\nBob,x';
		expect(parseCsv(text)).toEqual([
			["full_name", "summary"],
			["Doe, Jane", 'Line 1\nSaid "hi"'],
			["Bob", "x"],
		]);
	});

	it("detects semicolon delimiters", () => {
		expect(parseCsv("full_name;email\nJane;j@x.com")).toEqual([
			["full_name", "email"],
			["Jane", "j@x.com"],
		]);
	});

	it("round-trips the sample CSV", () => {
		const rows = sampleCsvRows();
		expect(parseCsv(toCsv(rows))).toEqual(rows);
	});
});

describe("matchTemplate", () => {
	it("matches id or display name, case-insensitively", () => {
		expect(matchTemplate("PIKACHU").template).toBe("pikachu");
		expect(matchTemplate(" bronzor ").template).toBe("bronzor");
	});

	it("suggests a close template name", () => {
		expect(matchTemplate("Pikachoo")).toEqual({ template: null, suggestion: "Pikachu" });
		expect(matchTemplate("zzzzzzzzzz").suggestion).toBeUndefined();
	});
});

describe("validateTable", () => {
	it("accepts the sample CSV without errors", () => {
		const result = validateTable(sampleCsvRows());
		expect(result.fileErrors).toEqual([]);
		expect(result.rows.map((row) => row.errors)).toEqual([[], []]);
	});

	it("reports row errors with spreadsheet row numbers and skips blank rows", () => {
		const result = validateTable(
			parseCsv(
				[
					"Full Name,email,template,website,exp1_position,phone",
					"Jane,not-an-email,Pikachoo,bad link,Dev,abc",
					",,,,,",
					",x@y.com,,,,",
				].join("\n"),
			),
		);
		expect(result.rows.map((row) => row.row)).toEqual([2, 4]);
		const [first, second] = result.rows as [RowResult, RowResult];
		expect(first.errors.map((issue) => issue.column)).toEqual(["email", "website", "template", "exp1_company"]);
		expect(first.errors.find((issue) => issue.column === "template")?.message).toContain('Did you mean "Pikachu"?');
		expect(first.warnings.map((issue) => issue.column)).toEqual(["phone"]);
		expect(second.errors.map((issue) => issue.column)).toEqual(["full_name"]);
	});

	it("flags file-level problems", () => {
		expect(validateTable(parseCsv("email\nx@y.com")).fileErrors).toContain('Required column "full_name" is missing.');
		expect(validateTable(parseCsv("full_name,full_name\nA,B")).fileErrors[0]).toContain("more than once");
		expect(validateTable(parseCsv("full_name")).fileErrors).toContain("The file has no resume rows.");
		const tooMany = [["full_name"], ...Array.from({ length: MAX_ROWS_PER_IMPORT + 1 }, (_, index) => [`P${index}`])];
		expect(validateTable(tooMany).fileErrors[0]).toContain(`limit is ${MAX_ROWS_PER_IMPORT}`);
	});

	it("warns about unknown columns and duplicates", () => {
		const result = validateTable(parseCsv("full_name,email,fulname\nJane,j@x.com,\nJane,J@X.com,"));
		expect(result.fileWarnings[0]).toContain("fulname");
		expect(result.rows[1]?.warnings[0]?.message).toContain("duplicate of row 2");
	});
});

describe("rowToResume", () => {
	it("maps the sample row into resume data", () => {
		const [row] = validateTable(sampleCsvRows()).rows as [RowResult];
		const { name, data } = rowToResume(row.values, row.template);
		expect(name).toBe("Aarav - Frontend");
		expect(data.metadata.template).toBe("pikachu");
		expect(data.basics.name).toBe("Aarav Sharma");
		expect(data.sections.experience.items.map((item) => item.company)).toEqual(["Acme Tech", "Pixel Labs"]);
		expect(data.sections.experience.items[0]?.period).toContain("2023");
		expect(data.sections.education.items[0]?.school).toBe("Delhi University");
		expect(data.sections.skills.items.map((item) => item.name)).toEqual([
			"React",
			"TypeScript",
			"Tailwind CSS",
			"Testing",
		]);
		expect(data.sections.profiles.items.map((item) => item.network)).toEqual(["LinkedIn", "GitHub"]);
	});

	it("defaults template and name when blank", () => {
		const { name, data } = rowToResume({ full_name: "Priya", headline: "Analyst" }, null);
		expect(name).toBe("Priya - Analyst");
		expect(data.metadata.template).toBe("onyx");
	});

	it("turns dash lines into bullets and escapes HTML", () => {
		expect(textToHtml("Intro <b>\n- One\n- Two")).toBe(
			"<p>Intro &lt;b&gt;</p><ul><li><p>One</p></li><li><p>Two</p></li></ul>",
		);
	});
});

import type { Template } from "@reactive-resume/schema/templates";
import { templateSchema } from "@reactive-resume/schema/templates";
import {
	columns,
	columnsByKey,
	educationFields,
	experienceFields,
	ISSUES_COLUMN,
	MAX_EDUCATION,
	MAX_EXPERIENCE,
	MAX_PROJECTS,
	MAX_ROWS_PER_IMPORT,
	normalizeHeader,
	projectFields,
} from "./columns";
import { templates } from "@/dialogs/resume/template/data";

export type Issue = { column?: string; message: string };

export type RowResult = {
	/** Spreadsheet row number (header is row 1). */
	row: number;
	values: Record<string, string>;
	template: Template | null;
	errors: Issue[];
	warnings: Issue[];
};

export type ValidationResult = {
	fileErrors: string[];
	fileWarnings: string[];
	headers: string[];
	rows: RowResult[];
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]+$/;

function distance(a: string, b: string) {
	const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = previous[0] ?? 0;
		previous[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const above = previous[j] ?? 0;
			previous[j] = Math.min(above + 1, (previous[j - 1] ?? 0) + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
			diagonal = above;
		}
	}
	return previous[b.length] ?? 0;
}

/** Case-insensitive template lookup by id or display name, with a "did you mean" for near misses. */
export function matchTemplate(value: string): { template: Template | null; suggestion?: string | undefined } {
	const needle = value.trim().toLowerCase();
	const exact = templateSchema.options.find((id) => id === needle || templates[id].name.toLowerCase() === needle);
	if (exact) return { template: exact };
	let best: Template | undefined;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const id of templateSchema.options) {
		const score = distance(needle, id);
		if (score < bestDistance) [best, bestDistance] = [id, score];
	}
	return { template: null, suggestion: best && bestDistance <= 3 ? templates[best].name : undefined };
}

export function normalizeUrl(value: string) {
	const trimmed = value.trim();
	if (!trimmed) return "";
	const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	try {
		const url = new URL(withProtocol);
		return url.hostname.includes(".") && !/\s/.test(trimmed) ? url.href : null;
	} catch {
		return null;
	}
}

function validateCell(key: string, value: string, issues: RowResult) {
	const column = columnsByKey.get(key);
	if (!column || !value) return;
	if (value.length > column.max)
		issues.errors.push({ column: key, message: `Too long (${value.length} characters, max ${column.max}).` });
	if (column.kind === "email" && !EMAIL.test(value))
		issues.errors.push({ column: key, message: `"${value}" is not a valid email address.` });
	if (column.kind === "url" && normalizeUrl(value) === null)
		issues.errors.push({ column: key, message: `"${value}" is not a valid link.` });
	if (column.kind === "phone" && (!PHONE.test(value) || value.replace(/\D/g, "").length < 7))
		issues.warnings.push({ column: key, message: `"${value}" does not look like a phone number.` });
}

/** An entry group (exp1_*, edu2_*, …) with any filled field must have its title field filled. */
function validateGroups(prefix: string, count: number, fields: readonly string[], title: string, result: RowResult) {
	for (let index = 1; index <= count; index++) {
		const keys = fields.map((field) => `${prefix}${index}_${field}`);
		const titleKey = `${prefix}${index}_${title}`;
		if (keys.some((key) => result.values[key]) && !result.values[titleKey])
			result.errors.push({ column: titleKey, message: `Required when other ${prefix}${index}_* fields are filled.` });
	}
}

export function validateTable(table: string[][]): ValidationResult {
	const result: ValidationResult = { fileErrors: [], fileWarnings: [], headers: [], rows: [] };
	const [rawHeaders = [], ...body] = table;
	const headers = rawHeaders.map(normalizeHeader);
	result.headers = headers;

	if (headers.every((header) => !header)) {
		result.fileErrors.push("The file is empty or has no header row.");
		return result;
	}
	const seen = new Set<string>();
	for (const header of headers) {
		if (header && seen.has(header)) result.fileErrors.push(`Column "${header}" appears more than once.`);
		seen.add(header);
	}
	for (const column of columns)
		if (column.required && !seen.has(column.key)) result.fileErrors.push(`Required column "${column.key}" is missing.`);
	const unknown = headers.filter((header) => header && header !== ISSUES_COLUMN && !columnsByKey.has(header));
	if (unknown.length)
		result.fileWarnings.push(
			`Unknown columns will be ignored: ${unknown.join(", ")}. Check the spelling against the sample CSV.`,
		);

	const dataRows = body
		.map((cells, index) => ({ cells, row: index + 2 }))
		.filter(({ cells }) => cells.some((cell) => cell.trim()));
	if (dataRows.length === 0) result.fileErrors.push("The file has no resume rows.");
	if (dataRows.length > MAX_ROWS_PER_IMPORT)
		result.fileErrors.push(
			`The file has ${dataRows.length} resumes; the limit is ${MAX_ROWS_PER_IMPORT} per import. Split it into smaller files.`,
		);
	if (result.fileErrors.length) return result;

	const identities = new Map<string, number>();
	for (const { cells, row } of dataRows) {
		const values: Record<string, string> = {};
		headers.forEach((header, index) => {
			if (columnsByKey.has(header)) values[header] = (cells[index] ?? "").trim();
		});
		const rowResult: RowResult = { row, values, template: null, errors: [], warnings: [] };

		if (cells.length > headers.length && cells.slice(headers.length).some((cell) => cell.trim()))
			rowResult.warnings.push({ message: "Row has more cells than the header; extra cells are ignored." });
		if (!values.full_name)
			rowResult.errors.push({ column: "full_name", message: "Required. Every resume needs a name." });
		for (const [key, value] of Object.entries(values)) validateCell(key, value, rowResult);

		if (values.template) {
			const { template, suggestion } = matchTemplate(values.template);
			rowResult.template = template;
			if (!template)
				rowResult.errors.push({
					column: "template",
					message: `Unknown template "${values.template}".${suggestion ? ` Did you mean "${suggestion}"?` : ""}`,
				});
		}

		validateGroups("exp", MAX_EXPERIENCE, experienceFields, "company", rowResult);
		validateGroups("edu", MAX_EDUCATION, educationFields, "school", rowResult);
		validateGroups("proj", MAX_PROJECTS, projectFields, "name", rowResult);

		if (values.full_name) {
			const identity = `${values.full_name.toLowerCase()}|${(values.email ?? "").toLowerCase()}`;
			const firstRow = identities.get(identity);
			if (firstRow) rowResult.warnings.push({ message: `Looks like a duplicate of row ${firstRow}.` });
			else identities.set(identity, row);
		}
		result.rows.push(rowResult);
	}
	return result;
}

export const formatIssue = (issue: Issue) => (issue.column ? `${issue.column}: ${issue.message}` : issue.message);

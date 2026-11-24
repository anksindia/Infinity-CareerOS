const DELIMITERS = [",", ";", "\t"] as const;

/** Picks the delimiter that splits the header line (outside quotes) into the most cells. */
function detectDelimiter(text: string) {
	const counts = new Map<string, number>(DELIMITERS.map((delimiter) => [delimiter, 0]));
	let quoted = false;
	for (const char of text) {
		if (char === '"') quoted = !quoted;
		else if (!quoted && (char === "\n" || char === "\r")) break;
		else if (!quoted && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
	}
	let best = ",";
	for (const [delimiter, count] of counts) if (count > (counts.get(best) ?? 0)) best = delimiter;
	return best;
}

/** RFC 4180 parser: quoted cells, escaped quotes, newlines inside quotes, CRLF, UTF-8 BOM. */
export function parseCsv(input: string): string[][] {
	const text = input.replace(/^﻿/, "");
	const delimiter = detectDelimiter(text);
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let quoted = false;

	for (let index = 0; index < text.length; index++) {
		const char = text[index];
		if (quoted) {
			if (char === '"' && text[index + 1] === '"') {
				cell += '"';
				index++;
			} else if (char === '"') quoted = false;
			else cell += char;
		} else if (char === '"' && cell === "") quoted = true;
		else if (char === delimiter) {
			row.push(cell);
			cell = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[index + 1] === "\n") index++;
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
		} else cell += char;
	}
	if (cell !== "" || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}
	return rows;
}

const escapeCell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

export const toCsv = (rows: string[][]) => `﻿${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}`;

export function downloadCsv(filename: string, rows: string[][]) {
	const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

import type { ValidationResult } from "./validate";
import { CheckCircleIcon, DownloadSimpleIcon, UploadSimpleIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { createLocalResumesBulk, localStorageRemaining } from "../storage";
import {
	columnsByKey,
	ISSUES_COLUMN,
	MAX_EDUCATION,
	MAX_EXPERIENCE,
	MAX_FILE_BYTES,
	MAX_ROWS_PER_IMPORT,
	sampleCsvRows,
	templateNames,
} from "./columns";
import { downloadCsv, parseCsv } from "./csv";
import { rowToResume } from "./to-resume";
import { formatIssue, validateTable } from "./validate";

type Props = { onClose: () => void; onImported: (count: number) => void };

export const BulkImportDialog = ({ onClose, onImported }: Props) => {
	const [fileName, setFileName] = useState("");
	const [result, setResult] = useState<ValidationResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);

	const validRows = useMemo(() => result?.rows.filter((row) => row.errors.length === 0) ?? [], [result]);
	const resumes = useMemo(() => validRows.map((row) => rowToResume(row.values, row.template)), [validRows]);
	const neededChars = useMemo(
		() => resumes.reduce((total, resume) => total + JSON.stringify(resume).length + 200, 0),
		[resumes],
	);
	const remainingChars = localStorageRemaining();
	const outOfSpace = resumes.length > 0 && neededChars > remainingChars;
	const errorCount = (result?.rows.length ?? 0) - validRows.length;
	const issueRows = result?.rows.filter((row) => row.errors.length || row.warnings.length) ?? [];

	const readFile = async (file: File | undefined) => {
		if (!file) return;
		setError(null);
		setResult(null);
		setFileName(file.name);
		if (!/\.(csv|txt)$/i.test(file.name))
			return setError("Please upload a .csv file. In Excel use File → Save As → CSV UTF-8.");
		if (file.size > MAX_FILE_BYTES) return setError("File is larger than 2 MB. Split it into smaller files.");
		const text = await file.text();
		if (text.includes("�"))
			return setError("File is not UTF-8. In Excel use File → Save As → CSV UTF-8 (Comma delimited).");
		setResult(validateTable(parseCsv(text)));
	};

	const downloadReport = () => {
		if (!result) return;
		const keys = result.headers.filter((header) => columnsByKey.has(header));
		downloadCsv("resume-import-errors.csv", [
			[...keys, ISSUES_COLUMN],
			...issueRows.map((row) => [
				...keys.map((key) => row.values[key] ?? ""),
				[
					...row.errors.map((issue) => `ERROR ${formatIssue(issue)}`),
					...row.warnings.map((issue) => `WARNING ${formatIssue(issue)}`),
				].join(" | "),
			]),
		]);
	};

	const importValid = () => {
		try {
			createLocalResumesBulk(resumes);
			onImported(resumes.length);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not save resumes.");
		}
	};

	return (
		<div className="fixed inset-0 z-50 grid place-items-center p-4">
			<button
				type="button"
				aria-label="Close bulk import"
				className="absolute inset-0 cursor-default bg-black/50"
				onClick={onClose}
			/>
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="bulk-import-title"
				className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-xl"
			>
				<header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
					<div>
						<h2 id="bulk-import-title" className="text-xl font-semibold">
							Bulk create from CSV
						</h2>
						<p className="mt-1 text-sm text-ink-3">
							One row = one resume. Up to {MAX_ROWS_PER_IMPORT} resumes per file.
						</p>
					</div>
					<button
						type="button"
						aria-label="Close bulk import"
						className="rounded-md px-3 py-2 text-ink-3 hover:bg-hover"
						onClick={onClose}
					>
						✕
					</button>
				</header>

				<div className="space-y-5 overflow-y-auto p-5 sm:p-7">
					{!result && (
						<>
							<ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
								<li>Download the sample CSV and fill one row per person (Excel or Google Sheets).</li>
								<li>
									Only <code>full_name</code> is required. Use <code>exp1_…exp{MAX_EXPERIENCE}_</code> for jobs,{" "}
									<code>edu1_…edu{MAX_EDUCATION}_</code> for education, and separate skills/languages with{" "}
									<code>;</code>
								</li>
								<li>
									In description cells, start lines with <code>-</code> to make bullet points.
								</li>
								<li>Save as CSV UTF-8 and upload it here. Errors are shown before anything is saved.</li>
							</ol>
							<Button variant="secondary" onClick={() => downloadCsv("resume-bulk-sample.csv", sampleCsvRows())}>
								<DownloadSimpleIcon /> Download sample CSV
							</Button>
							<div>
								<p className="mb-2 text-sm font-medium">
									Valid values for the <code>template</code> column (blank = Onyx):
								</p>
								<div className="flex flex-wrap gap-1.5">
									{templateNames.map((name) => (
										<span key={name} className="rounded-md border border-line bg-raised px-2 py-0.5 text-xs">
											{name}
										</span>
									))}
								</div>
							</div>
							<label
								onDragOver={(event) => {
									event.preventDefault();
									setDragging(true);
								}}
								onDragLeave={() => setDragging(false)}
								onDrop={(event) => {
									event.preventDefault();
									setDragging(false);
									void readFile(event.dataTransfer.files[0]);
								}}
								className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center ${dragging ? "border-accent bg-accent-soft" : "border-line hover:border-ink-3"}`}
							>
								<UploadSimpleIcon className="size-8 text-ink-3" />
								<span className="font-medium">Drop your CSV here or click to choose</span>
								<span className="text-xs text-ink-3">.csv · max 2 MB · max {MAX_ROWS_PER_IMPORT} rows</span>
								<input
									className="sr-only"
									type="file"
									accept=".csv,text/csv"
									onChange={(event) => {
										const input = event.currentTarget;
										void readFile(input.files?.[0]).finally(() => (input.value = ""));
									}}
								/>
							</label>
						</>
					)}

					{error && (
						<p
							role="alert"
							className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger-text"
						>
							{error}
						</p>
					)}

					{result && (
						<>
							<div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
								<span className="font-medium">{fileName}</span>
								{result.rows.length > 0 && (
									<>
										<span className="inline-flex items-center gap-1 text-accent-text">
											<CheckCircleIcon /> {validRows.length} ready
										</span>
										{errorCount > 0 && (
											<span className="inline-flex items-center gap-1 text-danger">
												<XCircleIcon /> {errorCount} with errors (will be skipped)
											</span>
										)}
									</>
								)}
							</div>
							{result.fileErrors.map((message) => (
								<p
									key={message}
									role="alert"
									className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger-text"
								>
									{message}
								</p>
							))}
							{result.fileWarnings.map((message) => (
								<p
									key={message}
									className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-text"
								>
									{message}
								</p>
							))}
							{outOfSpace && (
								<p
									role="alert"
									className="rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger-text"
								>
									Not enough browser storage for {resumes.length} resumes (room for about{" "}
									{Math.floor(remainingChars / Math.max(1, neededChars / resumes.length))}). Delete some resumes or
									import fewer rows.
								</p>
							)}
							{result.rows.length > 0 && (
								<div className="overflow-x-auto rounded-xl border border-line">
									<table className="w-full text-left text-sm">
										<thead className="bg-raised text-xs text-ink-3">
											<tr>
												<th className="px-3 py-2">Row</th>
												<th className="px-3 py-2">Name</th>
												<th className="px-3 py-2">Template</th>
												<th className="px-3 py-2">Status</th>
											</tr>
										</thead>
										<tbody>
											{result.rows.map((row) => (
												<tr key={row.row} className="border-t border-line align-top">
													<td className="px-3 py-2 text-ink-3">{row.row}</td>
													<td className="px-3 py-2 font-medium">
														{row.values.full_name || <span className="text-ink-3">—</span>}
													</td>
													<td className="px-3 py-2">{row.values.template || "Onyx"}</td>
													<td className="px-3 py-2">
														{row.errors.length === 0 && row.warnings.length === 0 && (
															<span className="inline-flex items-center gap-1 text-accent-text">
																<CheckCircleIcon /> OK
															</span>
														)}
														<ul className="space-y-0.5">
															{row.errors.map((issue) => (
																<li key={formatIssue(issue)} className="flex gap-1 text-danger">
																	<XCircleIcon className="mt-0.5 shrink-0" /> {formatIssue(issue)}
																</li>
															))}
															{row.warnings.map((issue) => (
																<li key={formatIssue(issue)} className="flex gap-1 text-ink-2">
																	<WarningIcon className="mt-0.5 shrink-0 text-warn" /> {formatIssue(issue)}
																</li>
															))}
														</ul>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</>
					)}
				</div>

				{(result || error) && (
					<footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-7">
						{issueRows.length > 0 && (
							<Button variant="secondary" onClick={downloadReport}>
								<DownloadSimpleIcon /> Download error report
							</Button>
						)}
						<Button
							variant="secondary"
							onClick={() => {
								setResult(null);
								setError(null);
							}}
						>
							Choose another file
						</Button>
						<Button disabled={validRows.length === 0 || outOfSpace} onClick={importValid}>
							Import {validRows.length} {validRows.length === 1 ? "resume" : "resumes"}
						</Button>
					</footer>
				)}
			</section>
		</div>
	);
};

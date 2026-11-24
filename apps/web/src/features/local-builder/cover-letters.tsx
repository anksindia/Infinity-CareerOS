import type { LocalCoverLetter, LocalResume } from "./storage";
import { t } from "@lingui/core/macro";
import { ArrowLeftIcon, DownloadSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
	composeCoverLetter,
	copyCoverLetterStyle,
	coverLetterTextToHtml,
	createCoverLetterResumeData,
} from "@reactive-resume/resume/cover-letter";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { downloadWithAnchor } from "@reactive-resume/utils/file";
import { templates } from "@/dialogs/resume/template/data";
import { letterWordsQueryOptions } from "@/features/letters/compose";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { useConfirm } from "@/hooks/use-confirm";

type LocalCoverLettersProps = {
	resume: LocalResume;
	letterId: string;
	onChange: (update: (letters: LocalCoverLetter[]) => LocalCoverLetter[]) => void;
};

export const localLetterName = (letter: LocalCoverLetter) => letter.name.trim() || t`Untitled cover letter`;

export function LocalCoverLetters({ resume, letterId, onChange }: LocalCoverLettersProps) {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const letters = resume.coverLetters ?? [];
	const selected = letters.find((letter) => letter.id === letterId);
	const params = { resumeId: resume.id };
	const open = (letter: string) => navigate({ to: "/builder/$resumeId", params, search: { letter } });

	const add = () => {
		const id = crypto.randomUUID();
		onChange((current) => [
			...current,
			{ id, name: "", recipientName: "", recipientCompany: "", letterDate: "", body: "" },
		]);
		void open(id);
	};

	const remove = async (letter: LocalCoverLetter) => {
		if (!(await confirm(t`Delete this cover letter?`, { confirmText: t`Delete` }))) return;
		onChange((current) => current.filter(({ id }) => id !== letter.id));
		await open("all");
	};

	return (
		<div className="min-h-svh bg-bg text-ink">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-8">
				<Link
					to="/builder/$resumeId"
					params={params}
					className="inline-flex items-center gap-2 text-sm font-medium text-ink-2"
				>
					<ArrowLeftIcon /> {t`Back to resume`}
				</Link>
				<Button onClick={add}>
					<PlusIcon /> {t`New cover letter`}
				</Button>
			</header>
			<main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
				<div>
					<h1 className="text-2xl font-semibold">{t`Cover letters`}</h1>
					<p className="mt-1 text-sm text-ink-3">
						{resume.name} · {templates[resume.data.metadata.template].name}
					</p>
				</div>
				{letters.length > 0 && (
					<nav aria-label={t`Cover letters`} className="flex flex-wrap gap-2">
						{letters.map((letter) => (
							<Button
								key={letter.id}
								variant={letter.id === letterId ? "primary" : "secondary"}
								render={
									<Link
										to="/builder/$resumeId"
										params={params}
										search={{ letter: letter.id }}
										activeOptions={{ includeSearch: true, exact: true }}
									/>
								}
								nativeButton={false}
							>
								{localLetterName(letter)}
							</Button>
						))}
					</nav>
				)}
				{selected ? (
					<CoverLetterEditor
						key={selected.id}
						letter={selected}
						resume={resume}
						onChange={(patch) =>
							onChange((current) =>
								current.map((letter) => (letter.id === selected.id ? { ...letter, ...patch } : letter)),
							)
						}
						onDelete={() => void remove(selected)}
					/>
				) : (
					<p className="rounded-2xl border border-line bg-raised p-5 text-sm text-ink-3">
						{letters.length
							? t`Select a cover letter to edit it.`
							: t`Create a cover letter using this resume’s template and contact details.`}
					</p>
				)}
			</main>
		</div>
	);
}

type EditableFields = Omit<LocalCoverLetter, "id">;
type CoverLetterEditorProps = {
	letter: LocalCoverLetter;
	resume: LocalResume;
	onChange: (patch: Partial<EditableFields>) => void;
	onDelete: () => void;
};

const renderOptions = { includeCoverLetterHeader: true };

function CoverLetterEditor({ letter, resume, onChange, onDelete }: CoverLetterEditorProps) {
	const words = useQuery(letterWordsQueryOptions(resume.data.metadata.page.locale));
	const [preview, setPreview] = useState<{ url: string } | { error: true }>();
	const [downloadStatus, setDownloadStatus] = useState<"pending" | "error">();
	const letterWords = words.data;
	const source = resume.data;
	const data = useMemo(() => {
		if (!letterWords) return;
		const content = {
			...letter,
			style: copyCoverLetterStyle(source),
			layout: "structured" as const,
			letterDate: letter.letterDate || null,
			recipient: "",
			content: coverLetterTextToHtml(letter.body),
		};
		return createCoverLetterResumeData({
			...content,
			...composeCoverLetter(content, letterWords),
			name: letter.name.trim(),
		});
	}, [letter, letterWords, source]);

	useEffect(() => {
		if (!data) return;
		let cancelled = false;
		const timeout = window.setTimeout(() => {
			void createResumePdfBlob(data, renderOptions).then(
				(blob) => {
					if (!cancelled) setPreview({ url: URL.createObjectURL(blob) });
				},
				() => {
					if (!cancelled) setPreview({ error: true });
				},
			);
		}, 350);
		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
		};
	}, [data]);

	useEffect(() => {
		if (!preview || !("url" in preview)) return;
		const { url } = preview;
		return () => URL.revokeObjectURL(url);
	}, [preview]);

	const download = async () => {
		if (!data) return;
		setDownloadStatus("pending");
		try {
			const blob = await createResumePdfBlob(data, renderOptions);
			const filename = localLetterName(letter).replace(/[\\/:*?"<>|]/g, "-");
			downloadWithAnchor(blob, `${filename}.pdf`);
			setDownloadStatus(undefined);
		} catch {
			setDownloadStatus("error");
		}
	};

	return (
		<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
			<section className="space-y-4 rounded-2xl border border-line bg-raised p-5">
				<h2 className="text-lg font-semibold">{t`Write cover letter`}</h2>
				<label className="block space-y-1 text-sm">
					<span>{t`Letter name`}</span>
					<Input
						value={letter.name}
						placeholder={localLetterName(letter)}
						maxLength={100}
						onChange={(event) => onChange({ name: event.target.value })}
					/>
				</label>
				<label className="block space-y-1 text-sm">
					<span>{t`Recipient name`}</span>
					<Input
						value={letter.recipientName}
						placeholder={t`Hiring team`}
						maxLength={200}
						onChange={(event) => onChange({ recipientName: event.target.value })}
					/>
				</label>
				<label className="block space-y-1 text-sm">
					<span>{t`Company`}</span>
					<Input
						value={letter.recipientCompany}
						maxLength={200}
						onChange={(event) => onChange({ recipientCompany: event.target.value })}
					/>
				</label>
				<label className="block space-y-1 text-sm">
					<span>{t`Date`}</span>
					<Input
						type="date"
						value={letter.letterDate}
						onChange={(event) => onChange({ letterDate: event.target.value })}
					/>
				</label>
				<label className="block space-y-1 text-sm">
					<span>{t`Letter body`}</span>
					<Textarea
						className="min-h-52 resize-y"
						value={letter.body}
						maxLength={100_000}
						onChange={(event) => onChange({ body: event.target.value })}
					/>
				</label>
				<Button variant="secondary" onClick={onDelete}>
					<TrashIcon /> {t`Delete cover letter`}
				</Button>
			</section>
			<aside className="space-y-3 rounded-2xl border border-line bg-raised p-5 lg:sticky lg:top-6">
				<h2 className="font-semibold">{t`Live preview`}</h2>
				{preview && "url" in preview ? (
					<iframe
						title={t`Cover letter PDF preview`}
						src={preview.url}
						className="h-[65vh] min-h-96 w-full rounded-lg border border-line bg-white"
					/>
				) : (
					<p role="status" className="text-sm text-ink-3">
						{words.isError || preview ? t`Could not render the cover letter preview.` : t`Preparing preview…`}
					</p>
				)}
				<Button onClick={() => void download()} disabled={!data || downloadStatus === "pending"}>
					<DownloadSimpleIcon /> {t`Download PDF`}
				</Button>
				{downloadStatus === "error" && (
					<p role="alert" className="text-sm text-danger">{t`Download failed. Try again.`}</p>
				)}
			</aside>
		</div>
	);
}

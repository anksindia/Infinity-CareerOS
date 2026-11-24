import type { Template } from "@reactive-resume/schema/templates";
import { t } from "@lingui/core/macro";
import {
	ArrowRightIcon,
	FilePlusIcon,
	FileTextIcon,
	TableIcon,
	TrashIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { templateLayouts } from "@reactive-resume/schema/templates";
import { Button } from "@reactive-resume/ui/components/button";
import { BulkImportDialog } from "./bulk/bulk-import-dialog";
import { localLetterName } from "./cover-letters";
import {
	createLocalResume,
	deleteLocalResume,
	importLocalResume,
	listLocalResumes,
	localTemplateOptions,
} from "./storage";
import { templates } from "@/dialogs/resume/template/data";
import { useConfirm } from "@/hooks/use-confirm";

export const LocalLibrary = () => {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const [resumes, setResumes] = useState(listLocalResumes);
	const [importError, setImportError] = useState<string | null>(null);
	const [showTemplates, setShowTemplates] = useState(false);
	const [showBulk, setShowBulk] = useState(false);
	const [bulkNotice, setBulkNotice] = useState<string | null>(null);
	const [sample, setSample] = useState(false);
	const [template, setTemplate] = useState<Template>(defaultResumeData.metadata.template);
	const chooseCreation = (useSample = false) => {
		setSample(useSample);
		setTemplate(defaultResumeData.metadata.template);
		setShowTemplates(true);
	};
	const create = () => {
		const resume = createLocalResume(sample, template);
		setShowTemplates(false);
		void navigate({ to: "/builder/$resumeId", params: { resumeId: resume.id } });
	};

	return (
		<main className="min-h-svh bg-bg px-5 py-12 text-ink sm:px-10">
			<div className="mx-auto max-w-5xl">
				<header className="mb-10 flex flex-wrap items-end justify-between gap-5">
					<div>
						<p className="mb-2 text-sm font-medium text-accent-text">Infinity CareerOS</p>
						<h1 className="text-4xl font-semibold tracking-tight">Your resumes</h1>
						<p className="mt-2 text-ink-3">Saved in this browser. No account or server required.</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2 text-sm font-medium hover:bg-bg">
							<UploadSimpleIcon /> Import backup
							<input
								className="sr-only"
								type="file"
								accept="application/json,.json"
								onChange={async (event) => {
									const input = event.currentTarget;
									const file = input.files?.[0];
									if (!file) return;
									try {
										const resume = importLocalResume(JSON.parse(await file.text()));
										void navigate({ to: "/builder/$resumeId", params: { resumeId: resume.id } });
									} catch {
										setImportError("Could not read that resume backup.");
									}
									input.value = "";
								}}
							/>
						</label>
						<Button variant="secondary" onClick={() => setShowBulk(true)}>
							<TableIcon /> Bulk create (CSV)
						</Button>
						<Button onClick={() => chooseCreation()}>
							<FilePlusIcon /> New resume
						</Button>
					</div>
				</header>
				{importError && (
					<p role="alert" className="mb-5 text-sm text-danger">
						{importError}
					</p>
				)}
				{bulkNotice && (
					<p role="status" className="mb-5 text-sm text-accent-text">
						{bulkNotice}
					</p>
				)}
				{showBulk && (
					<BulkImportDialog
						onClose={() => setShowBulk(false)}
						onImported={(count) => {
							setShowBulk(false);
							setResumes(listLocalResumes());
							setBulkNotice(`${count} ${count === 1 ? "resume" : "resumes"} created from CSV.`);
						}}
					/>
				)}
				{showTemplates && (
					<div className="fixed inset-0 z-50 grid place-items-center p-4">
						<button
							type="button"
							aria-label="Close template picker"
							className="absolute inset-0 cursor-default bg-black/50"
							onClick={() => setShowTemplates(false)}
						/>
						<section
							role="dialog"
							aria-modal="true"
							aria-labelledby="template-picker-title"
							className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-xl"
						>
							<header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
								<div>
									<h2 id="template-picker-title" className="text-xl font-semibold">
										Choose a template
									</h2>
									<p className="mt-1 text-sm text-ink-3">You can change this later in your resume.</p>
								</div>
								<button
									type="button"
									aria-label="Close template picker"
									className="rounded-md px-3 py-2 text-ink-3 hover:bg-hover"
									onClick={() => setShowTemplates(false)}
								>
									✕
								</button>
							</header>
							<div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-4">
								{localTemplateOptions.map((id) => {
									const layout = templateLayouts[id];
									return (
										<button
											key={id}
											type="button"
											aria-pressed={template === id}
											onClick={() => setTemplate(id)}
											className={`rounded-xl border p-2 text-left transition-colors ${template === id ? "border-accent bg-accent-soft ring-2 ring-accent" : "border-line hover:border-ink-3"}`}
										>
											<img
												src={`/templates/thumb/${id}.webp`}
												alt={`${templates[id].name} resume template`}
												loading="lazy"
												className="aspect-[3/4] w-full rounded-md bg-white object-cover"
											/>
											<span className="mt-2 block font-semibold">{templates[id].name}</span>
											<span className="mt-0.5 block text-xs text-ink-3">
												{layout.columns === 1 ? "One column" : "Two columns"}
												{layout.atsSafe ? " · ATS-friendly" : ""}
											</span>
										</button>
									);
								})}
							</div>
							<footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">
								<span className="text-sm text-ink-3">
									{sample ? "Sample content" : "Blank resume"} · {templates[template].name}
								</span>
								<div className="flex gap-2">
									<Button variant="secondary" onClick={() => setShowTemplates(false)}>
										Cancel
									</Button>
									<Button onClick={create}>Create resume</Button>
								</div>
							</footer>
						</section>
					</div>
				)}
				{resumes.length === 0 ? (
					<section className="rounded-2xl border border-line bg-raised p-10 text-center">
						<FileTextIcon className="mx-auto mb-4 size-10 text-ink-3" />
						<h2 className="text-xl font-semibold">Start with a blank page</h2>
						<p className="mt-2 text-ink-3">Create resume, edit it, then download polished PDF.</p>
						<div className="mt-6 flex justify-center gap-3">
							<Button onClick={() => chooseCreation()}>Create blank resume</Button>
							<Button variant="secondary" onClick={() => chooseCreation(true)}>
								Try sample
							</Button>
						</div>
					</section>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{resumes.map((resume) => (
							<article key={resume.id} className="rounded-2xl border border-line bg-raised p-5 shadow-sm">
								<div className="mb-8 flex items-center justify-between">
									<FileTextIcon className="size-8 text-accent-text" />
									<button
										aria-label={`Delete ${resume.name}`}
										className="rounded-md p-2 text-ink-3 hover:bg-bg hover:text-danger"
										onClick={async () => {
											if (
												resume.coverLetters?.length &&
												!(await confirm(t`Delete this resume and its cover letters?`, {
													confirmText: t`Delete resume`,
												}))
											)
												return;
											deleteLocalResume(resume.id);
											setResumes(listLocalResumes());
										}}
									>
										<TrashIcon />
									</button>
								</div>
								<h2 className="truncate text-lg font-semibold">{resume.name}</h2>
								<p className="mt-1 text-sm text-ink-3">{resume.data.basics.name || "Add your name"}</p>
								<div className="mt-5 flex items-center justify-between text-xs text-ink-3">
									<span>Edited {new Date(resume.updatedAt).toLocaleDateString()}</span>
									<Link
										className="inline-flex items-center gap-1 font-medium text-accent-text"
										to="/builder/$resumeId"
										params={{ resumeId: resume.id }}
									>
										Open <ArrowRightIcon />
									</Link>
								</div>
							</article>
						))}
					</div>
				)}
				<section aria-labelledby="local-cover-letters" className="mt-10 space-y-4">
					<h2 id="local-cover-letters" className="text-2xl font-semibold">{t`Cover letters`}</h2>
					{resumes.length === 0 ? (
						<p className="text-sm text-ink-3">{t`Create or import a resume to write a matching cover letter.`}</p>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{resumes.map((resume) => (
								<article key={resume.id} className="space-y-3 rounded-2xl border border-line bg-raised p-5">
									<div>
										<h3 className="truncate font-semibold">{resume.name}</h3>
										<p className="text-sm text-ink-3">{templates[resume.data.metadata.template].name}</p>
									</div>
									{Boolean(resume.coverLetters?.length) && (
										<ul className="space-y-2">
											{resume.coverLetters?.map((letter) => (
												<li key={letter.id}>
													<Link
														className="block truncate text-sm font-medium text-accent-text hover:underline"
														to="/builder/$resumeId"
														params={{ resumeId: resume.id }}
														search={{ letter: letter.id }}
													>
														{localLetterName(letter)}
													</Link>
												</li>
											))}
										</ul>
									)}
									<Link
										className="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
										to="/builder/$resumeId"
										params={{ resumeId: resume.id }}
										search={{ letter: "all" }}
									>
										{t`Manage cover letters`} <ArrowRightIcon />
									</Link>
								</article>
							))}
						</div>
					)}
				</section>
				<p className="mt-10 text-center text-xs text-ink-3">
					{t`Your resumes and cover letters stay on this device. Export a JSON backup from the resume editor to move them.`}
				</p>
			</div>
		</main>
	);
};

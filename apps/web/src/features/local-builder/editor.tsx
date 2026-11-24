import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { t } from "@lingui/core/macro";
import { ArrowLeftIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { templateLayouts } from "@reactive-resume/schema/templates";
import { Button } from "@reactive-resume/ui/components/button";
import { LocalCoverLetters } from "./cover-letters";
import { deleteLocalResume, getLocalResume, getTemplateAccent, localTemplateOptions, saveLocalResume } from "./storage";
import { templates } from "@/dialogs/resume/template/data";
import { createResumePdfBlob } from "@/features/resume/export/pdf-document";
import { useConfirm } from "@/hooks/use-confirm";

function updateAt<T>(items: T[], index: number, update: (item: T) => void) {
	const item = items.at(index);
	if (item) update(item);
}

function colorToHex(color: string) {
	const rgba = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
	if (rgba)
		return `#${rgba
			.slice(1, 4)
			.map((value) => Number(value).toString(16).padStart(2, "0"))
			.join("")}`;
	return /^#[\da-f]{6}$/i.test(color) ? color : "#dc2626";
}

async function resizePhoto(file: File) {
	const image = await createImageBitmap(file);
	const scale = Math.min(1, 600 / Math.max(image.width, image.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(image.width * scale));
	canvas.height = Math.max(1, Math.round(image.height * scale));
	canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
	image.close();
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(value) => (value ? resolve(value) : reject(new Error("Could not resize photo"))),
			"image/jpeg",
			0.86,
		);
	});
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read photo"));
		reader.onerror = () => reject(reader.error ?? new Error("Could not read photo"));
		reader.readAsDataURL(blob);
	});
}

type LocalEditorProps = { resumeId: string; letterId: string | undefined };

export function LocalEditor({ resumeId, letterId }: LocalEditorProps) {
	const confirm = useConfirm();
	const [resume, setResume] = useState(() => {
		const stored = getLocalResume(resumeId);
		const defaultColor = defaultResumeData.metadata.design.colors.primary;
		const sampleColor = "rgba(0, 112, 178, 1)";
		if (stored && [defaultColor, sampleColor].includes(stored.data.metadata.design.colors.primary)) {
			stored.data.metadata.design.colors.primary = getTemplateAccent(stored.data.metadata.template);
		}
		return stored;
	});
	const deleted = useRef(false);
	const [previewUrl, setPreviewUrl] = useState<string>();
	const [photoError, setPhotoError] = useState<string>();
	const data = resume?.data;

	useEffect(() => {
		if (!resume) return;
		let pending = true;
		const save = () => {
			if (!pending || deleted.current) return;
			saveLocalResume(resume);
			pending = false;
		};
		const timeout = window.setTimeout(save, 300);
		window.addEventListener("pagehide", save);
		return () => {
			window.clearTimeout(timeout);
			window.removeEventListener("pagehide", save);
			save();
		};
	}, [resume]);
	useEffect(() => {
		if (!data || letterId) return;
		let nextUrl: string | undefined;
		let cancelled = false;
		const timeout = window.setTimeout(() => {
			void createResumePdfBlob(data)
				.then((blob) => {
					if (cancelled) return;
					nextUrl = URL.createObjectURL(blob);
					setPreviewUrl(nextUrl);
				})
				.catch((error: unknown) => console.error("Could not render resume preview", error));
		}, 500);
		return () => {
			cancelled = true;
			window.clearTimeout(timeout);
			if (nextUrl) URL.revokeObjectURL(nextUrl);
		};
	}, [data, letterId]);

	if (!resume || !data) return null;
	if (letterId) {
		return (
			<LocalCoverLetters
				resume={resume}
				letterId={letterId}
				onChange={(update) =>
					setResume((current) => (current ? { ...current, coverLetters: update(current.coverLetters ?? []) } : current))
				}
			/>
		);
	}
	const patch = (update: (draft: ResumeData) => void) =>
		setResume((current) => {
			if (!current) return current;
			const next = structuredClone(current);
			update(next.data);
			return next;
		});
	const field = (label: string, value: string, onChange: (value: string) => void, multiline = false) => {
		const shared =
			"mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-accent";
		return (
			<label className="block text-sm font-medium text-ink-2">
				{label}
				{multiline ? (
					<textarea
						className={`${shared} min-h-24 resize-y`}
						value={value}
						onChange={(event) => onChange(event.target.value)}
					/>
				) : (
					<input className={shared} value={value} onChange={(event) => onChange(event.target.value)} />
				)}
			</label>
		);
	};
	const downloadPdf = async () => {
		const blob = await createResumePdfBlob(data);
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${data.basics.name || resume.name}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
	};
	const downloadBackup = () => {
		const blob = new Blob([JSON.stringify(resume, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${resume.name}.json`.replace(/[\\/:*?"<>|]/g, "-");
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
	};
	const addExperience = () =>
		patch((draft) =>
			draft.sections.experience.items.push({
				id: crypto.randomUUID(),
				hidden: false,
				company: "",
				position: "",
				location: "",
				period: "",
				website: { url: "", label: "", inlineLink: true },
				description: "",
				roles: [],
			}),
		);
	const addEducation = () =>
		patch((draft) =>
			draft.sections.education.items.push({
				id: crypto.randomUUID(),
				hidden: false,
				school: "",
				degree: "",
				area: "",
				grade: "",
				location: "",
				period: "",
				website: { url: "", label: "", inlineLink: true },
				description: "",
			}),
		);
	const addSkill = () =>
		patch((draft) =>
			draft.sections.skills.items.push({
				id: crypto.randomUUID(),
				hidden: false,
				icon: "sparkle",
				iconColor: "",
				name: "",
				level: 0,
				proficiency: "",
				keywords: [],
			}),
		);

	return (
		<div className="min-h-svh bg-bg text-ink">
			<header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur sm:px-8">
				<Link to="/" className="mr-auto inline-flex items-center gap-2 text-sm font-medium text-ink-2">
					<ArrowLeftIcon /> My resumes
				</Link>
				<span className="text-xs text-ink-3">Autosaves on this device</span>
				<Button
					variant="secondary"
					render={<Link to="/builder/$resumeId" params={{ resumeId }} search={{ letter: "all" }} />}
					nativeButton={false}
				>
					<EnvelopeSimpleIcon /> {t`Cover letters`}
				</Button>
				<Button onClick={() => void downloadPdf()}>
					<DownloadSimpleIcon /> Download PDF
				</Button>
			</header>
			<main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-6">
					<section className="rounded-2xl border border-line bg-raised p-5 sm:p-7">
						<div className="mb-5">
							<h1 className="text-2xl font-semibold">Template</h1>
							<p className="mt-1 text-sm text-ink-3">Choose a layout. Preview updates as you edit.</p>
						</div>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
							{localTemplateOptions.map((id) => (
								<TemplateOption
									key={id}
									id={id}
									selected={data.metadata.template === id}
									onSelect={(nextTemplate) =>
										patch((draft) => {
											draft.metadata.template = nextTemplate;
											draft.metadata.design.colors.primary = getTemplateAccent(nextTemplate);
										})
									}
								/>
							))}
						</div>
					</section>
					<section className="rounded-2xl border border-line bg-raised p-5 sm:p-7">
						<h2 className="text-xl font-semibold">Photo</h2>
						<p className="mt-1 text-sm text-ink-3">Add a profile photo. It stays in this browser with your resume.</p>
						<div className="mt-4 flex flex-wrap items-center gap-4">
							<div className="grid size-24 place-items-center overflow-hidden rounded-lg border border-line bg-bg">
								{data.picture.url ? (
									<img src={data.picture.url} alt="Resume profile" className="size-full object-cover" />
								) : (
									<span className="text-sm text-ink-3">No photo</span>
								)}
							</div>
							<div className="flex flex-wrap gap-2">
								<label className="inline-flex cursor-pointer items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
									Upload photo
									<input
										className="sr-only"
										type="file"
										accept="image/*"
										onChange={async (event) => {
											const input = event.currentTarget;
											const file = input.files?.[0];
											if (!file) return;
											try {
												const url = await resizePhoto(file);
												patch((draft) => {
													draft.picture.url = url;
													draft.picture.hidden = false;
												});
												setPhotoError(undefined);
											} catch {
												setPhotoError("Could not load this image. Try another photo.");
											} finally {
												input.value = "";
											}
										}}
									/>
								</label>
								{data.picture.url && (
									<>
										<Button
											variant="secondary"
											onClick={() =>
												patch((draft) => {
													draft.picture.hidden = !draft.picture.hidden;
												})
											}
										>
											{data.picture.hidden ? "Show on resume" : "Hide on resume"}
										</Button>
										<Button
											variant="secondary"
											onClick={() =>
												patch((draft) => {
													draft.picture.url = "";
													draft.picture.hidden = false;
												})
											}
										>
											Remove photo
										</Button>
									</>
								)}
							</div>
						</div>
						{photoError && (
							<p role="alert" className="mt-3 text-sm text-danger">
								{photoError}
							</p>
						)}
					</section>
					<section className="rounded-2xl border border-line bg-raised p-5 sm:p-7">
						<h2 className="text-xl font-semibold">Theme color</h2>
						<p className="mt-1 text-sm text-ink-3">Template starts with its theme color. Change it any time.</p>
						<label className="mt-4 flex w-fit items-center gap-3 rounded-lg border border-line bg-bg px-3 py-2 text-sm font-medium">
							<input
								type="color"
								aria-label="Resume theme color"
								value={colorToHex(data.metadata.design.colors.primary)}
								onChange={(event) =>
									patch((draft) => {
										draft.metadata.design.colors.primary = event.target.value;
									})
								}
								className="size-9 cursor-pointer rounded border-0 bg-transparent p-0"
							/>
							<span>{colorToHex(data.metadata.design.colors.primary).toUpperCase()}</span>
						</label>
						<Button
							className="mt-3"
							variant="secondary"
							size="sm"
							onClick={() =>
								patch((draft) => {
									draft.metadata.design.colors.primary = getTemplateAccent(draft.metadata.template);
								})
							}
						>
							Reset to {templates[data.metadata.template].name} color
						</Button>
					</section>
					<section className="rounded-2xl border border-line bg-raised p-5 sm:p-7">
						<h1 className="mb-5 text-2xl font-semibold">Resume details</h1>
						<div className="grid gap-4 sm:grid-cols-2">
							{field("Resume name", resume.name, (name) => setResume((current) => current && { ...current, name }))}
							{field("Full name", data.basics.name, (value) =>
								patch((draft) => {
									draft.basics.name = value;
								}),
							)}
							{field("Professional title", data.basics.headline, (value) =>
								patch((draft) => {
									draft.basics.headline = value;
								}),
							)}
							{field("Email", data.basics.email, (value) =>
								patch((draft) => {
									draft.basics.email = value;
								}),
							)}
							{field("Phone", data.basics.phone, (value) =>
								patch((draft) => {
									draft.basics.phone = value;
								}),
							)}
							{field("Location", data.basics.location, (value) =>
								patch((draft) => {
									draft.basics.location = value;
								}),
							)}
						</div>
						<div className="mt-4">
							{field(
								"Professional summary",
								data.summary.content.replace(/<[^>]*>/g, ""),
								(value) =>
									patch((draft) => {
										draft.summary.content = value;
									}),
								true,
							)}
						</div>
					</section>
					<section className="rounded-2xl border border-line bg-raised p-5 sm:p-7">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="text-xl font-semibold">Experience</h2>
							<Button variant="secondary" size="sm" onClick={addExperience}>
								<PlusIcon /> Add
							</Button>
						</div>
						<div className="space-y-5">
							{data.sections.experience.items.map((item, index) => (
								<div key={item.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
									{field("Job title", item.position, (value) =>
										patch((draft) =>
											updateAt(draft.sections.experience.items, index, (entry) => {
												entry.position = value;
											}),
										),
									)}
									{field("Company", item.company, (value) =>
										patch((draft) =>
											updateAt(draft.sections.experience.items, index, (entry) => {
												entry.company = value;
											}),
										),
									)}
									{field("Dates", item.period, (value) =>
										patch((draft) =>
											updateAt(draft.sections.experience.items, index, (entry) => {
												entry.period = value;
											}),
										),
									)}
									{field("Location", item.location, (value) =>
										patch((draft) =>
											updateAt(draft.sections.experience.items, index, (entry) => {
												entry.location = value;
											}),
										),
									)}
									<div className="sm:col-span-2">
										{field(
											"Description",
											item.description.replace(/<[^>]*>/g, ""),
											(value) =>
												patch((draft) =>
													updateAt(draft.sections.experience.items, index, (entry) => {
														entry.description = value;
													}),
												),
											true,
										)}
									</div>
									<button
										className="justify-self-start text-xs text-danger"
										onClick={() =>
											patch((draft) => {
												draft.sections.experience.items.splice(index, 1);
											})
										}
									>
										<TrashIcon className="mr-1 inline" />
										Remove
									</button>
								</div>
							))}
						</div>
					</section>
					<section className="rounded-2xl border border-line bg-raised p-5 sm:p-7">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="text-xl font-semibold">Education</h2>
							<Button variant="secondary" size="sm" onClick={addEducation}>
								<PlusIcon /> Add
							</Button>
						</div>
						<div className="space-y-4">
							{data.sections.education.items.map((item, index) => (
								<div key={item.id} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2">
									{field("School", item.school, (value) =>
										patch((draft) =>
											updateAt(draft.sections.education.items, index, (entry) => {
												entry.school = value;
											}),
										),
									)}
									{field("Degree", item.degree, (value) =>
										patch((draft) =>
											updateAt(draft.sections.education.items, index, (entry) => {
												entry.degree = value;
											}),
										),
									)}
									{field("Field of study", item.area, (value) =>
										patch((draft) =>
											updateAt(draft.sections.education.items, index, (entry) => {
												entry.area = value;
											}),
										),
									)}
									{field("Dates", item.period, (value) =>
										patch((draft) =>
											updateAt(draft.sections.education.items, index, (entry) => {
												entry.period = value;
											}),
										),
									)}
									<button
										className="text-xs text-danger"
										onClick={() =>
											patch((draft) => {
												draft.sections.education.items.splice(index, 1);
											})
										}
									>
										<TrashIcon className="mr-1 inline" />
										Remove
									</button>
								</div>
							))}
						</div>
					</section>
					<section className="rounded-2xl border border-line bg-raised p-5 sm:p-7">
						<div className="mb-5 flex items-center justify-between">
							<h2 className="text-xl font-semibold">Skills</h2>
							<Button variant="secondary" size="sm" onClick={addSkill}>
								<PlusIcon /> Add
							</Button>
						</div>
						<div className="space-y-3">
							{data.sections.skills.items.map((item, index) => (
								<div key={item.id} className="flex items-end gap-3">
									{field("Skill", item.name, (value) =>
										patch((draft) =>
											updateAt(draft.sections.skills.items, index, (entry) => {
												entry.name = value;
											}),
										),
									)}
									<button
										className="mb-2 text-xs text-danger"
										aria-label="Remove skill"
										onClick={() =>
											patch((draft) => {
												draft.sections.skills.items.splice(index, 1);
											})
										}
									>
										<TrashIcon />
									</button>
								</div>
							))}
						</div>
					</section>
				</div>
				<aside className="h-fit rounded-2xl border border-line bg-raised p-5 lg:sticky lg:top-24">
					<h2 className="font-semibold">Live preview · {templates[data.metadata.template].name}</h2>
					<div className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
						{previewUrl ? (
							<iframe title="Live resume PDF preview" src={previewUrl} className="h-[65vh] min-h-120 w-full" />
						) : (
							<img
								src={`/templates/thumb/${data.metadata.template}.webp`}
								alt={`${templates[data.metadata.template].name} preview`}
								className="w-full"
							/>
						)}
					</div>
					<p className="mt-2 text-sm leading-6 text-ink-3">
						This resume is stored in this browser’s local storage. Clearing browser data removes it.
					</p>
					<Button className="mt-5 w-full" onClick={() => void downloadPdf()}>
						<DownloadSimpleIcon /> Export PDF
					</Button>
					<Button className="mt-3 w-full" variant="secondary" onClick={downloadBackup}>
						Export JSON backup
					</Button>
					<Button
						className="mt-3 w-full"
						variant="secondary"
						onClick={async () => {
							if (
								resume.coverLetters?.length &&
								!(await confirm(t`Delete this resume and its cover letters?`, { confirmText: t`Delete resume` }))
							)
								return;
							deleted.current = true;
							deleteLocalResume(resume.id);
							window.location.assign("/");
						}}
					>
						Delete resume
					</Button>
				</aside>
			</main>
		</div>
	);
}

type TemplateOptionProps = { id: Template; selected: boolean; onSelect: (id: Template) => void };

function TemplateOption({ id, selected, onSelect }: TemplateOptionProps) {
	const layout = templateLayouts[id];
	return (
		<button
			type="button"
			aria-pressed={selected}
			onClick={() => onSelect(id)}
			className={`rounded-lg border p-2 text-left transition-colors ${selected ? "border-accent bg-accent-soft ring-2 ring-accent" : "border-line hover:border-ink-3"}`}
		>
			<img
				src={`/templates/thumb/${id}-small.webp`}
				alt={`${templates[id].name} template`}
				loading="lazy"
				className="aspect-[3/4] w-full rounded bg-white object-cover"
			/>
			<span className="mt-2 block text-sm font-semibold">{templates[id].name}</span>
			<span className="mt-0.5 block text-xs text-ink-3">{layout.columns === 1 ? "One column" : "Two columns"}</span>
		</button>
	);
}

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import z from "zod";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createSampleResumeData } from "@reactive-resume/schema/resume/sample";
import { templateSchema } from "@reactive-resume/schema/templates";

const STORAGE_KEY = "reactive-resume:local-resumes:v1";

const localCoverLetterSchema = z.object({
	id: z.uuid(),
	name: z.string().max(100),
	recipientName: z.string().max(200),
	recipientCompany: z.string().max(200),
	letterDate: z.union([z.iso.date(), z.literal("")]),
	body: z.string().max(100_000),
});

export type LocalCoverLetter = z.infer<typeof localCoverLetterSchema>;

export type LocalResume = {
	id: string;
	name: string;
	data: ResumeData;
	createdAt: string;
	updatedAt: string;
	coverLetters?: LocalCoverLetter[];
};

const templateAccents = {
	azurill: "#347d68",
	bronzor: "#286fbd",
	chikorita: "#95516b",
	ditgar: "#745aa5",
	ditto: "#9a5838",
	gengar: "#92345f",
	glalie: "#759b91",
	kakuna: "#bf3676",
	lapras: "#537b9b",
	leafish: "#718f7c",
	meowth: "#b78734",
	onyx: "#344355",
	persian: "#648eaa",
	pikachu: "#d79b1e",
	porygon: "#6552a1",
	rhyhorn: "#8e735a",
	scizor: "#ba343d",
	smeargle: "#566f9b",
} satisfies Record<Template, string>;

export const getTemplateAccent = (template: Template) => templateAccents[template];

function stripKeywordsSection(resume: LocalResume): LocalResume {
	if (!resume.data?.customSections?.some((section) => section.id === "local-keywords")) return resume;
	return {
		...resume,
		data: {
			...resume.data,
			customSections: resume.data.customSections.filter((section) => section.id !== "local-keywords"),
			metadata: {
				...resume.data.metadata,
				layout: {
					...resume.data.metadata.layout,
					pages: resume.data.metadata.layout.pages.map((page) => ({
						...page,
						main: page.main.filter((sectionId) => sectionId !== "local-keywords"),
						sidebar: page.sidebar.filter((sectionId) => sectionId !== "local-keywords"),
					})),
				},
			},
		},
	};
}

function readAll(): LocalResume[] {
	if (typeof window === "undefined") return [];
	try {
		const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		if (!Array.isArray(value)) return [];
		const resumes = (value as LocalResume[]).map(stripKeywordsSection);
		if (resumes.some((resume, index) => resume !== value[index])) writeAll(resumes);
		return resumes;
	} catch {
		return [];
	}
}

function writeAll(resumes: LocalResume[]) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
}

export const listLocalResumes = () => readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export const getLocalResume = (id: string) => readAll().find((resume) => resume.id === id) ?? null;

export function createLocalResume(sample = false, template: Template = defaultResumeData.metadata.template) {
	const now = new Date().toISOString();
	const data = structuredClone(sample ? createSampleResumeData() : defaultResumeData);
	data.metadata.template = template;
	data.metadata.design.colors.primary = getTemplateAccent(template);
	const resume: LocalResume = {
		id: crypto.randomUUID(),
		name: sample ? "Sample resume" : "Untitled resume",
		data,
		createdAt: now,
		updatedAt: now,
	};
	writeAll([resume, ...readAll()]);
	return resume;
}

export function importLocalResume(value: unknown) {
	if (!value || typeof value !== "object") throw new Error("Invalid resume backup");
	const backup = value as { name?: unknown; data?: unknown; coverLetters?: unknown };
	if (typeof backup.name !== "string" || !backup.data) throw new Error("Invalid resume backup");
	const now = new Date().toISOString();
	const resume: LocalResume = {
		id: crypto.randomUUID(),
		name: backup.name,
		data: parseResumeData(backup.data),
		createdAt: now,
		updatedAt: now,
		coverLetters: z.array(localCoverLetterSchema).parse(backup.coverLetters ?? []),
	};
	writeAll([resume, ...readAll()]);
	return resume;
}

/** Browsers give each origin roughly 5M characters of localStorage; keep headroom for edits. */
const STORAGE_BUDGET_CHARS = 4_500_000;

export const localStorageUsage = () => {
	if (typeof window === "undefined") return 0;
	return (localStorage.getItem(STORAGE_KEY) ?? "").length;
};

export const localStorageRemaining = () => Math.max(0, STORAGE_BUDGET_CHARS - localStorageUsage());

export function createLocalResumesBulk(items: { name: string; data: ResumeData }[]) {
	const now = new Date().toISOString();
	const created: LocalResume[] = items.map(({ name, data }) => ({
		id: crypto.randomUUID(),
		name,
		data,
		createdAt: now,
		updatedAt: now,
	}));
	try {
		writeAll([...created, ...readAll()]);
	} catch {
		throw new Error("Browser storage is full. Delete some resumes and try again.");
	}
	return created;
}

export const localTemplateOptions = templateSchema.options;

export function saveLocalResume(resume: LocalResume) {
	const updated = { ...resume, updatedAt: new Date().toISOString() };
	writeAll([updated, ...readAll().filter((item) => item.id !== resume.id)]);
	return updated;
}

export function deleteLocalResume(id: string) {
	writeAll(readAll().filter((resume) => resume.id !== id));
}

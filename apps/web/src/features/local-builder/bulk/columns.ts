import { templateSchema } from "@reactive-resume/schema/templates";
import { templates } from "@/dialogs/resume/template/data";

export const MAX_ROWS_PER_IMPORT = 100;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_EXPERIENCE = 3;
export const MAX_EDUCATION = 2;
export const MAX_PROJECTS = 2;
/** Column the error report adds; ignored when that report is uploaded again. */
export const ISSUES_COLUMN = "import_issues";

type ColumnKind = "text" | "long" | "email" | "phone" | "url" | "list" | "template";

export type Column = { key: string; kind: ColumnKind; max: number; required?: boolean };

const short = (key: string, kind: ColumnKind = "text", max = 200): Column => ({ key, kind, max });
const long = (key: string): Column => ({ key, kind: "long", max: 5000 });

export const experienceFields = ["company", "position", "location", "period", "description"] as const;
export const educationFields = ["school", "degree", "area", "grade", "period"] as const;
export const projectFields = ["name", "period", "link", "description"] as const;

const repeated = (prefix: string, count: number, fields: readonly string[]) =>
	Array.from({ length: count }, (_, index) =>
		fields.map((field) => {
			const key = `${prefix}${index + 1}_${field}`;
			if (field === "description") return long(key);
			if (field === "link") return short(key, "url", 500);
			return short(key);
		}),
	).flat();

export const columns: Column[] = [
	short("resume_name", "text", 100),
	short("template", "template", 50),
	{ key: "full_name", kind: "text", max: 100, required: true },
	short("headline"),
	short("email", "email"),
	short("phone", "phone", 50),
	short("location"),
	short("website", "url", 500),
	short("linkedin", "url", 500),
	short("github", "url", 500),
	long("summary"),
	...repeated("exp", MAX_EXPERIENCE, experienceFields),
	...repeated("edu", MAX_EDUCATION, educationFields),
	...repeated("proj", MAX_PROJECTS, projectFields),
	short("skills", "list", 1000),
	short("languages", "list", 1000),
	short("certifications", "list", 1000),
	short("interests", "list", 1000),
];

export const columnsByKey = new Map(columns.map((column) => [column.key, column]));

export const templateNames = templateSchema.options.map((id) => templates[id].name);

/** Lowercases and turns spaces/dashes into underscores so "Full Name" matches full_name. */
export const normalizeHeader = (header: string) =>
	header
		.trim()
		.toLowerCase()
		.replace(/[\s-]+/g, "_");

export function sampleCsvRows(): string[][] {
	const example: Record<string, string>[] = [
		{
			resume_name: "Aarav - Frontend",
			template: "Pikachu",
			full_name: "Aarav Sharma",
			headline: "Frontend Developer",
			email: "aarav@example.com",
			phone: "+91 98765 43210",
			location: "Delhi, India",
			website: "https://aarav.dev",
			linkedin: "https://linkedin.com/in/aarav",
			github: "https://github.com/aarav",
			summary: "Frontend developer with 3 years of experience building fast, accessible web apps.",
			exp1_company: "Acme Tech",
			exp1_position: "Frontend Developer",
			exp1_location: "Gurugram",
			exp1_period: "Jan 2023 - Present",
			exp1_description: "- Built design system used by 4 teams\n- Cut page load time by 40%",
			exp2_company: "Pixel Labs",
			exp2_position: "Intern",
			exp2_period: "Jun 2022 - Dec 2022",
			edu1_school: "Delhi University",
			edu1_degree: "B.Sc.",
			edu1_area: "Computer Science",
			edu1_grade: "8.4 CGPA",
			edu1_period: "2019 - 2022",
			proj1_name: "Expense Tracker",
			proj1_link: "https://github.com/aarav/expenses",
			proj1_description: "React + IndexedDB offline expense tracker.",
			skills: "React; TypeScript; Tailwind CSS; Testing",
			languages: "English; Hindi",
			certifications: "AWS Cloud Practitioner",
			interests: "Chess; Trekking",
		},
		{
			template: "Bronzor",
			full_name: "Priya Verma",
			headline: "Data Analyst",
			email: "priya@example.com",
			location: "Pune, India",
			exp1_company: "DataWorks",
			exp1_position: "Data Analyst",
			exp1_period: "2021 - Present",
			edu1_school: "Pune University",
			edu1_degree: "MBA",
			edu1_area: "Business Analytics",
			edu1_period: "2019 - 2021",
			skills: "SQL; Excel; Power BI; Python",
		},
	];
	return [columns.map((column) => column.key), ...example.map((row) => columns.map((column) => row[column.key] ?? ""))];
}

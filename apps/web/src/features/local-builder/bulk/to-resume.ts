import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { getTemplateAccent } from "../storage";
import { MAX_EDUCATION, MAX_EXPERIENCE, MAX_PROJECTS } from "./columns";
import { normalizeUrl } from "./validate";

const escapeHtml = (value: string) =>
	value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Plain text to editor HTML: lines starting with "-", "*" or "•" become bullets, other lines paragraphs. */
export function textToHtml(text: string) {
	const html: string[] = [];
	let bullets: string[] = [];
	const flush = () => {
		if (bullets.length) html.push(`<ul>${bullets.map((item) => `<li><p>${item}</p></li>`).join("")}</ul>`);
		bullets = [];
	};
	for (const line of text.split(/\r?\n/).map((value) => value.trim())) {
		if (!line) continue;
		const bullet = /^[-*•]\s*(.*)$/.exec(line);
		if (bullet) bullets.push(escapeHtml(bullet[1] ?? ""));
		else {
			flush();
			html.push(`<p>${escapeHtml(line)}</p>`);
		}
	}
	flush();
	return html.join("");
}

export const splitList = (value: string) =>
	value
		.split(/[;\n]/)
		.map((item) => item.trim())
		.filter(Boolean);

const website = (value = "") => ({ url: normalizeUrl(value) ?? "", label: "", inlineLink: false });
const id = () => crypto.randomUUID();

export function rowToResume(
	values: Record<string, string>,
	template: Template | null,
): { name: string; data: ResumeData } {
	const get = (key: string) => values[key] ?? "";
	const data = structuredClone(defaultResumeData);
	const chosen = template ?? data.metadata.template;
	data.metadata.template = chosen;
	data.metadata.design.colors.primary = getTemplateAccent(chosen);

	data.basics = {
		...data.basics,
		name: get("full_name"),
		headline: get("headline"),
		email: get("email"),
		phone: get("phone"),
		location: get("location"),
		website: { url: normalizeUrl(get("website")) ?? "", label: "" },
	};
	data.summary.content = textToHtml(get("summary"));

	const { sections } = data;
	for (const [network, key] of [
		["LinkedIn", "linkedin"],
		["GitHub", "github"],
	] as const) {
		const url = normalizeUrl(get(key));
		if (!url) continue;
		const username = new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
		sections.profiles.items.push({
			id: id(),
			hidden: false,
			icon: key === "linkedin" ? "linkedin-logo" : "github-logo",
			iconColor: "",
			network,
			username,
			website: website(url),
		});
	}

	for (let index = 1; index <= MAX_EXPERIENCE; index++) {
		const company = get(`exp${index}_company`);
		if (!company) continue;
		sections.experience.items.push({
			id: id(),
			hidden: false,
			company,
			position: get(`exp${index}_position`),
			location: get(`exp${index}_location`),
			period: get(`exp${index}_period`),
			website: website(),
			description: textToHtml(get(`exp${index}_description`)),
			roles: [],
		});
	}

	for (let index = 1; index <= MAX_EDUCATION; index++) {
		const school = get(`edu${index}_school`);
		if (!school) continue;
		sections.education.items.push({
			id: id(),
			hidden: false,
			school,
			degree: get(`edu${index}_degree`),
			area: get(`edu${index}_area`),
			grade: get(`edu${index}_grade`),
			location: "",
			period: get(`edu${index}_period`),
			website: website(),
			description: "",
		});
	}

	for (let index = 1; index <= MAX_PROJECTS; index++) {
		const name = get(`proj${index}_name`);
		if (!name) continue;
		sections.projects.items.push({
			id: id(),
			hidden: false,
			name,
			period: get(`proj${index}_period`),
			website: website(get(`proj${index}_link`)),
			description: textToHtml(get(`proj${index}_description`)),
		});
	}

	for (const name of splitList(get("skills")))
		sections.skills.items.push({
			id: id(),
			hidden: false,
			icon: "",
			iconColor: "",
			name,
			proficiency: "",
			level: 0,
			keywords: [],
		});
	for (const language of splitList(get("languages")))
		sections.languages.items.push({ id: id(), hidden: false, language, fluency: "", level: 0 });
	for (const title of splitList(get("certifications")))
		sections.certifications.items.push({
			id: id(),
			hidden: false,
			title,
			issuer: "",
			date: "",
			website: website(),
			description: "",
		});
	for (const name of splitList(get("interests")))
		sections.interests.items.push({ id: id(), hidden: false, icon: "", iconColor: "", name, keywords: [] });

	const name = get("resume_name") || `${get("full_name")}${get("headline") ? ` - ${get("headline")}` : ""}`;
	return { name: name.slice(0, 100), data: parseResumeData(data) };
}

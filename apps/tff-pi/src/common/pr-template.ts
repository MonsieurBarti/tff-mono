import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readArtifact, resolveTffPath } from "@tff/core";

function resolveResourcesDir(): string {
	const __dirname = fileURLToPath(new URL(".", import.meta.url));
	const candidate = join(__dirname, "..", "resources");
	if (existsSync(candidate)) {
		return candidate;
	}
	return join(__dirname, "resources");
}

function resolveCoreContentDir(): string {
	const __dirname = fileURLToPath(new URL(".", import.meta.url));
	const publishedDir = join(__dirname, "content");
	if (existsSync(publishedDir)) {
		return publishedDir;
	}
	const monorepoDir = join(__dirname, "..", "..", "..", "..", "packages", "core", "src", "content");
	if (existsSync(monorepoDir)) {
		return monorepoDir;
	}
	throw new Error("Cannot resolve @tff/core content directory");
}

const BUILTIN_TEMPLATE_PATH = join(resolveResourcesDir(), "templates", "pr-body.md");
const CORE_TEMPLATES_DIR = join(resolveCoreContentDir(), "templates");

export const PR_TEMPLATE_FIELDS = [
	"description",
	"testSteps",
	"trickyParts",
	"deploymentSteps",
	"envVars",
] as const;

export type PrTemplateField = (typeof PR_TEMPLATE_FIELDS)[number];

export type PrTemplateValues = Partial<Record<PrTemplateField, string | undefined>>;

export function loadPrTemplate(root: string): string {
	const override = readArtifact(root, "templates/pr-body.md");
	if (override && override.trim().length > 0) {
		return override;
	}
	if (existsSync(BUILTIN_TEMPLATE_PATH)) {
		return readFileSync(BUILTIN_TEMPLATE_PATH, "utf-8");
	}
	return readFileSync(join(CORE_TEMPLATES_DIR, "pr-body.md"), "utf-8");
}

export function renderPrTemplate(template: string, values: PrTemplateValues): string {
	let rendered = template;
	for (const field of PR_TEMPLATE_FIELDS) {
		const value = values[field];
		const placeholder = `{{${field}}}`;
		rendered = rendered.split(placeholder).join(value?.trim() ? value.trim() : "_(none)_");
	}
	return rendered;
}

export function prTemplateOverridePath(root: string): string {
	return resolveTffPath(root, "templates", "pr-body.md");
}

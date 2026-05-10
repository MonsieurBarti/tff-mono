import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.join(__dirname, "../../src/content");

const AgentFrontmatterSchema = z.object({
	name: z.string(),
	model: z.string().optional(),
	description: z.string().optional(),
	version: z.string().optional(),
	identity: z.string().optional(),
	routing: z.object({
		handles: z.array(z.string()),
		priority: z.number(),
		min_tier: z.string(),
	}),
	capabilities: z
		.object({
			reviews_code: z.boolean().optional(),
			writes_code: z.boolean().optional(),
			runs_tests: z.boolean().optional(),
			validates_ac: z.boolean().optional(),
			security_focus: z.boolean().optional(),
			audits_decisions: z.boolean().optional(),
			read_only: z.boolean().optional(),
			inline_fixes: z.boolean().optional(),
		})
		.optional(),
	tools: z.array(z.string()),
	thinking: z.enum(["on", "off", "extended"]).optional(),
	systemPromptMode: z.enum(["replace", "append"]).optional(),
	inheritProjectContext: z.boolean().optional(),
	inheritSkills: z.boolean().optional(),
});

const SkillFrontmatterSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		version: z.string().optional(),
		trigger_phrases: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
		"user-invocable": z.boolean().optional(),
		"argument-hint": z.string().optional(),
	})
	.strict();

const CommandFrontmatterSchema = z.object({
	name: z.string(),
	description: z.string(),
	version: z.string().optional(),
	"argument-hint": z.string().optional(),
	tools: z.array(z.string()),
	routing: z
		.object({
			pool: z.array(z.string()),
		})
		.optional(),
});

function parseFrontmatter(filePath: string) {
	const content = fs.readFileSync(filePath, "utf8");
	const match = content.match(/^---\n([\s\S]*?)\n---\n/);
	if (!match) throw new Error(`No frontmatter in ${filePath}`);
	return yaml.parse(match[1]);
}

describe("content frontmatter validation", () => {
	it("validates all agent files", () => {
		const agentsDir = path.join(contentRoot, "agents");
		const files = fs
			.readdirSync(agentsDir)
			.filter((f) => f.endsWith(".md"))
			.map((f) => path.join(agentsDir, f));
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const frontmatter = parseFrontmatter(file);
			AgentFrontmatterSchema.parse(frontmatter);
		}
	});

	it("validates all skill files", () => {
		const skillsDir = path.join(contentRoot, "skills");
		const dirs = fs.readdirSync(skillsDir);
		expect(dirs.length).toBeGreaterThan(0);
		for (const dir of dirs) {
			const skillFile = path.join(skillsDir, dir, "SKILL.md");
			const frontmatter = parseFrontmatter(skillFile);
			SkillFrontmatterSchema.parse(frontmatter);
		}
	});

	it("validates all command files", () => {
		const commandsDir = path.join(contentRoot, "commands");
		const files = fs
			.readdirSync(commandsDir)
			.filter((f) => f.endsWith(".md"))
			.map((f) => path.join(commandsDir, f));
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const frontmatter = parseFrontmatter(file);
			CommandFrontmatterSchema.parse(frontmatter);
		}
	});

	it("rejects agent frontmatter with missing required field", () => {
		const invalid = {
			name: "test-agent",
			// missing routing and tools
		};
		expect(() => AgentFrontmatterSchema.parse(invalid)).toThrow();
	});

	it("rejects skill frontmatter with invalid enum value", () => {
		const invalid = {
			name: "test-skill",
			description: "test",
			thinking: "maybe",
		};
		expect(() => SkillFrontmatterSchema.parse(invalid)).toThrow();
	});
});

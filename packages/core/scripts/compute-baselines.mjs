import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.join(__dirname, "../src/content");
const baselinesPath = path.join(__dirname, "../src/content/content-baselines.json");

function normalize(content) {
	return content
		.replace(/\r\n/g, "\n")
		.replace(/[ \t]+\n/g, "\n")
		.trim();
}

function sha256(content) {
	return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

let existing = {
	version: 1,
	agents: {},
	skills: {},
	workflows: {},
	protocols: {},
	commands: {},
	templates: {},
};
if (fs.existsSync(baselinesPath)) {
	existing = JSON.parse(fs.readFileSync(baselinesPath, "utf8"));
	existing.workflows = existing.workflows || {};
	existing.protocols = existing.protocols || {};
	existing.commands = existing.commands || {};
	existing.templates = existing.templates || {};
}

const baselines = {
	version: 1,
	agents: {},
	skills: {},
	workflows: {},
	protocols: {},
	commands: {},
	templates: {},
};

// Agents
const agentsDir = path.join(contentRoot, "agents");
for (const file of fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"))) {
	const name = path.basename(file, ".md");
	const content = fs.readFileSync(path.join(agentsDir, file), "utf8");
	const hash = sha256(normalize(content));
	const prev = existing.agents[name];
	baselines.agents[name] = {
		approvedAt: prev && prev.sha256 === hash ? prev.approvedAt : new Date().toISOString(),
		sha256: hash,
	};
}

// Skills
const skillsDir = path.join(contentRoot, "skills");
for (const dir of fs.readdirSync(skillsDir)) {
	const skillFile = path.join(skillsDir, dir, "SKILL.md");
	if (!fs.existsSync(skillFile)) continue;
	const content = fs.readFileSync(skillFile, "utf8");
	const hash = sha256(normalize(content));
	const prev = existing.skills[dir];
	baselines.skills[dir] = {
		approvedAt: prev && prev.sha256 === hash ? prev.approvedAt : new Date().toISOString(),
		originalCommitSha: prev ? prev.originalCommitSha : null,
		refinementId: prev ? prev.refinementId : null,
		sha256: hash,
	};
}

// Workflows
const workflowsDir = path.join(contentRoot, "workflows");
if (fs.existsSync(workflowsDir)) {
	for (const file of fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".md"))) {
		const name = path.basename(file, ".md");
		const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
		const hash = sha256(normalize(content));
		const prev = existing.workflows[name];
		baselines.workflows[name] = {
			approvedAt: prev && prev.sha256 === hash ? prev.approvedAt : new Date().toISOString(),
			sha256: hash,
		};
	}
}

// Protocols
const protocolsDir = path.join(contentRoot, "protocols");
if (fs.existsSync(protocolsDir)) {
	for (const file of fs.readdirSync(protocolsDir).filter((f) => f.endsWith(".md"))) {
		const name = path.basename(file, ".md");
		const content = fs.readFileSync(path.join(protocolsDir, file), "utf8");
		const hash = sha256(normalize(content));
		const prev = existing.protocols[name];
		baselines.protocols[name] = {
			approvedAt: prev && prev.sha256 === hash ? prev.approvedAt : new Date().toISOString(),
			sha256: hash,
		};
	}
}

// Commands
const commandsDir = path.join(contentRoot, "commands");
if (fs.existsSync(commandsDir)) {
	for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"))) {
		const name = path.basename(file, ".md");
		const content = fs.readFileSync(path.join(commandsDir, file), "utf8");
		const hash = sha256(normalize(content));
		const prev = existing.commands[name];
		baselines.commands[name] = {
			approvedAt: prev && prev.sha256 === hash ? prev.approvedAt : new Date().toISOString(),
			sha256: hash,
		};
	}
}

// Templates
const templatesDir = path.join(contentRoot, "templates");
if (fs.existsSync(templatesDir)) {
	for (const file of fs.readdirSync(templatesDir).filter((f) => f.endsWith(".md"))) {
		const name = path.basename(file, ".md");
		const content = fs.readFileSync(path.join(templatesDir, file), "utf8");
		const hash = sha256(normalize(content));
		const prev = existing.templates[name];
		baselines.templates[name] = {
			approvedAt: prev && prev.sha256 === hash ? prev.approvedAt : new Date().toISOString(),
			sha256: hash,
		};
	}
}

fs.writeFileSync(baselinesPath, JSON.stringify(baselines, null, 2) + "\n");
console.log(
	`Baselines computed: ${Object.keys(baselines.agents).length} agents, ${Object.keys(baselines.skills).length} skills, ${Object.keys(baselines.workflows).length} workflows, ${Object.keys(baselines.protocols).length} protocols, ${Object.keys(baselines.commands).length} commands, ${Object.keys(baselines.templates).length} templates`,
);

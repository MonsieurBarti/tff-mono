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

let existing = { version: 1, agents: {}, skills: {} };
if (fs.existsSync(baselinesPath)) {
	existing = JSON.parse(fs.readFileSync(baselinesPath, "utf8"));
}

const baselines = { version: 1, agents: {}, skills: {} };

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

fs.writeFileSync(baselinesPath, JSON.stringify(baselines, null, 2) + "\n");
console.log(
	`Baselines computed: ${Object.keys(baselines.agents).length} agents, ${Object.keys(baselines.skills).length} skills`,
);

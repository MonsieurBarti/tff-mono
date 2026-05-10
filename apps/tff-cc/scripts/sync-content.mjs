#!/usr/bin/env node
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const coreRoot = resolve(appRoot, "..", "..", "packages", "core");
const coreContent = join(coreRoot, "src", "content");

const mappings = [
	{ name: "agents", from: "agents", to: "agents", ext: ".md" },
	{ name: "commands", from: "commands", to: join("commands", "tff"), ext: ".md" },
	{ name: "skills", from: "skills", to: "skills", isDir: true },
	{ name: "workflows", from: "workflows", to: "workflows", ext: ".md" },
	{
		name: "references",
		from: "protocols",
		to: "references",
		ext: ".md",
		exclude: ["ABSTRACTIONS.md"],
	},
];

const prePaths = [];
const manifest = [];

// ── Record pre-sync paths ──────────────────────────────────────────
for (const { to, ext, isDir } of mappings) {
	const toPath = join(appRoot, to);
	if (!existsSync(toPath)) continue;
	if (isDir) {
		for (const entry of readdirSync(toPath, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const sub = join(toPath, entry.name);
			for (const f of readdirSync(sub, { recursive: true })) {
				if (typeof f === "string" && statSync(join(sub, f)).isFile()) {
					prePaths.push(join(sub, f));
				}
			}
		}
		// Also record skill-baselines.json if present
		const baseline = join(toPath, "skill-baselines.json");
		if (existsSync(baseline)) prePaths.push(baseline);
	} else {
		for (const f of readdirSync(toPath)) {
			if (!ext || f.endsWith(ext)) prePaths.push(join(toPath, f));
		}
	}
}

// ── Preserve app-specific files ──────────────────────────────────
const preserved = {};
const releaseChecklist = join(appRoot, "references", "release-checklist.md");
if (existsSync(releaseChecklist)) {
	preserved[releaseChecklist] = readFileSync(releaseChecklist, "utf8");
}

// ── Clear & recreate legacy directories ────────────────────────────
for (const { to } of mappings) {
	const toPath = join(appRoot, to);
	if (existsSync(toPath)) {
		rmSync(toPath, { recursive: true });
	}
	mkdirSync(toPath, { recursive: true });
}

// ── Restore app-specific files ───────────────────────────────────
for (const [path, content] of Object.entries(preserved)) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
	manifest.push(`(preserved) ${path}`);
}

// ── Copy core content ──────────────────────────────────────────────
for (const { from, to, ext, isDir, exclude } of mappings) {
	const fromPath = join(coreContent, from);
	const toPath = join(appRoot, to);
	if (!existsSync(fromPath)) {
		console.warn(`Source missing: ${fromPath}`);
		continue;
	}
	if (isDir) {
		for (const entry of readdirSync(fromPath, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const skillFrom = join(fromPath, entry.name);
			const skillTo = join(toPath, entry.name);
			mkdirSync(skillTo, { recursive: true });
			for (const f of readdirSync(skillFrom, { recursive: true })) {
				if (typeof f !== "string") continue;
				const src = join(skillFrom, f);
				if (!statSync(src).isFile()) continue;
				const dst = join(skillTo, f);
				mkdirSync(dirname(dst), { recursive: true });
				copyFileSync(src, dst);
				manifest.push(`${src} -> ${dst}`);
			}
		}
	} else {
		for (const f of readdirSync(fromPath)) {
			if (ext && !f.endsWith(ext)) continue;
			if (exclude?.includes(f)) continue;
			const src = join(fromPath, f);
			const dst = join(toPath, f);
			copyFileSync(src, dst);
			manifest.push(`${src} -> ${dst}`);
		}
	}
}

// ── Generate skill-baselines.json ──────────────────────────────────
const coreBaselinesPath = join(coreContent, "content-baselines.json");
const coreBaselines = JSON.parse(readFileSync(coreBaselinesPath, "utf8"));
const skills = { ...coreBaselines.skills };

// Merge app-specific skills not present in core
const appSkillsDir = join(appRoot, "skills");
for (const id of readdirSync(appSkillsDir)) {
	const skillPath = join(appSkillsDir, id, "SKILL.md");
	if (!existsSync(skillPath)) continue;
	if (skills[id]) continue;
	const content = readFileSync(skillPath, "utf8");
	const sha256 = createHash("sha256").update(content, "utf8").digest("hex");
	skills[id] = {
		approvedAt: new Date().toISOString(),
		originalCommitSha: null,
		refinementId: null,
		sha256,
	};
}

const skillBaselines = {
	version: coreBaselines.version,
	skills,
};
writeFileSync(
	join(appRoot, "skills", "skill-baselines.json"),
	JSON.stringify(skillBaselines, null, 2) + "\n",
);
manifest.push("generated skills/skill-baselines.json");

// ── Print manifest ─────────────────────────────────────────────────
console.log("Synced content manifest:");
for (const line of manifest) console.log(`  ${line}`);

// ── Verification ───────────────────────────────────────────────────
const missing = [];
for (const p of prePaths) {
	if (!existsSync(p)) missing.push(p);
}
if (missing.length > 0) {
	console.error("Verification failed — missing paths after sync:");
	for (const p of missing) console.error(`  ${p}`);
	process.exit(1);
}
console.log("Verification passed: all previously-existing paths are readable.");

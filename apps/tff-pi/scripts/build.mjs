#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(rootDir, "dist");

function copyDir(src, dst) {
	mkdirSync(dst, { recursive: true });
	for (const entry of readdirSync(src, { withFileTypes: true })) {
		const srcPath = join(src, entry.name);
		const dstPath = join(dst, entry.name);
		if (entry.isDirectory()) {
			copyDir(srcPath, dstPath);
		} else {
			copyFileSync(srcPath, dstPath);
		}
	}
}

await build({
	entryPoints: [join(rootDir, "src", "index.ts")],
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node22",
	outfile: join(distDir, "index.js"),
	external: [
		"better-sqlite3",
		"yaml",
		"@earendil-works/pi-ai",
		"@earendil-works/pi-coding-agent",
		"@earendil-works/pi-tui",
		"@sinclair/typebox",
		"@the-forge-flow/fff-pi",
		"@the-forge-flow/gh-pi",
		"@the-forge-flow/ultra-compress-pi",
	],
	logLevel: "info",
});

const resourcesSrc = join(rootDir, "src", "resources");
const resourcesDst = join(distDir, "resources");
if (existsSync(resourcesSrc)) {
	copyDir(resourcesSrc, resourcesDst);
}

const coreContentSrc = join(rootDir, "..", "..", "packages", "core", "src", "content");
const coreContentDst = join(distDir, "content");
if (existsSync(coreContentSrc)) {
	copyDir(coreContentSrc, coreContentDst);
}

const coreMigrationsCandidates = [
	join(rootDir, "node_modules", "@tff", "core", "dist", "db", "migrations"),
	join(rootDir, "..", "..", "packages", "core", "dist", "db", "migrations"),
];
for (const src of coreMigrationsCandidates) {
	if (existsSync(src)) {
		copyDir(src, join(distDir, "migrations"));
		break;
	}
}

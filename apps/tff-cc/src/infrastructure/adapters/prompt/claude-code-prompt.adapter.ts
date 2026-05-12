import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Ok, Err, ContractError } from "@tff/core";
import type { PromptLoader, ContentKind } from "@tff/core";

const CONTENT_KIND_DIRS: Record<ContentKind, string> = {
	agent: "agents",
	skill: "skills",
	workflow: "workflows",
	protocol: "protocols",
	command: "commands",
};

export class ClaudeCodePromptAdapter implements PromptLoader {
	constructor(private readonly repoRoot: string) {}

	async load(kind: ContentKind, name: string) {
		if (name.includes("\0") || name.includes("/") || name.includes("\\") || name.includes("..")) {
			return Err(
				new ContractError(
					`Invalid prompt name: ${kind}/${name}`,
					"PromptLoader",
					"load",
					"Prompt name contains forbidden characters",
				),
			);
		}
		try {
			const dirName = CONTENT_KIND_DIRS[kind];
			const contentDir = resolve(this.repoRoot, "packages", "core", "src", "content", dirName);

			// Try exact match first
			const exactPath = resolve(contentDir, `${name}.md`);
			try {
				const content = await readFile(exactPath, "utf8");
				return Ok(content);
			} catch {
				/* fall through to directory search */
			}

			// Search in subdirectories
			const entries = await readdir(contentDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const subPath = resolve(contentDir, entry.name, `${name}.md`);
					try {
						const content = await readFile(subPath, "utf8");
						return Ok(content);
					} catch {
						/* continue */
					}
				}
			}

			return Err(
				new ContractError(
					`Prompt not found: ${kind}/${name}`,
					"PromptLoader",
					"load",
					`No ${name}.md found in ${contentDir}`,
				),
			);
		} catch (err) {
			return Err(
				new ContractError(
					`Failed to load prompt ${kind}/${name}`,
					"PromptLoader",
					"load",
					String(err),
				),
			);
		}
	}
}

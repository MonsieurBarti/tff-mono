import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Ok, Err, ContractError, SETTINGS_FILE } from "@tff/core";
import { parse as parseYaml } from "yaml";
import type { ConfigReader } from "@tff/core";

const getValueAtPath = (obj: unknown, keyPath: string): unknown => {
	const keys = keyPath.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
};

export class ClaudeCodeConfigAdapter implements ConfigReader {
	constructor(private readonly repoRoot: string) {}

	async readConfig(keyPath?: string) {
		try {
			const settingsPath = resolve(this.repoRoot, SETTINGS_FILE);
			const content = await readFile(settingsPath, "utf8");
			const parsed = parseYaml(content);

			if (!keyPath) {
				return Ok(parsed);
			}

			const value = getValueAtPath(parsed, keyPath);
			if (value === undefined) {
				return Err(
					new ContractError(
						`keyPath not found: ${keyPath}`,
						"ConfigReader",
						"readConfig",
						`keyPath not found: ${keyPath}`,
					),
				);
			}

			return Ok(value);
		} catch (err) {
			return Err(
				new ContractError("Failed to read config", "ConfigReader", "readConfig", String(err)),
			);
		}
	}
}

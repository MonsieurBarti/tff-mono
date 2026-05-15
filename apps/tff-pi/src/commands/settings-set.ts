import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import YAML from "yaml";
import type { TffContext } from "../common/context.js";
import type { Settings } from "../common/settings.js";

const VALID_KEYS = ["model_profile", "compress.user_artifacts", "ship.merge_method"] as const;
type ValidKey = (typeof VALID_KEYS)[number];

const KEY_HELP: Record<ValidKey, { type: string; allowed: string }> = {
	model_profile: { type: "enum", allowed: "quality | balanced | budget" },
	"compress.user_artifacts": { type: "boolean", allowed: "true | false" },
	"ship.merge_method": { type: "enum", allowed: "squash | rebase | merge" },
};

function isValidKey(key: string): key is ValidKey {
	return (VALID_KEYS as readonly string[]).includes(key);
}

function parseValue(key: ValidKey, raw: string): unknown {
	if (key === "model_profile") {
		if (raw === "quality" || raw === "balanced" || raw === "budget") return raw;
		return undefined;
	}
	if (key === "compress.user_artifacts") {
		if (raw === "true") return true;
		if (raw === "false") return false;
		return undefined;
	}
	if (key === "ship.merge_method") {
		if (raw === "squash" || raw === "rebase" || raw === "merge") return raw;
		return undefined;
	}
	return undefined;
}

function applySetting(settings: Settings, key: ValidKey, value: unknown): boolean {
	if (
		key === "model_profile" &&
		(value === "quality" || value === "balanced" || value === "budget")
	) {
		settings.model_profile = value;
		return true;
	}
	if (key === "compress.user_artifacts" && typeof value === "boolean") {
		settings.compress.user_artifacts = value;
		return true;
	}
	if (
		key === "ship.merge_method" &&
		(value === "squash" || value === "rebase" || value === "merge")
	) {
		settings.ship.merge_method = value;
		return true;
	}
	return false;
}

export async function runSettingsSet(
	pi: ExtensionAPI,
	ctx: TffContext,
	_uiCtx: ExtensionCommandContext | null,
	args: string[],
): Promise<void> {
	const key = args[0];
	const rawValue = args[1];

	if (!key || !rawValue) {
		pi.sendUserMessage("Usage: /tff settings set <key> <value>");
		return;
	}

	if (!isValidKey(key)) {
		const lines = ["Unknown setting key. Valid keys:"];
		for (const k of VALID_KEYS) {
			lines.push(`  ${k} (${KEY_HELP[k].type}: ${KEY_HELP[k].allowed})`);
		}
		pi.sendUserMessage(lines.join("\n"));
		return;
	}

	const value = parseValue(key, rawValue);
	if (value === undefined) {
		pi.sendUserMessage(`Invalid value for ${key}. Expected: ${KEY_HELP[key].allowed}`);
		return;
	}

	if (!ctx.settings) {
		pi.sendUserMessage("No settings loaded.");
		return;
	}

	const applied = applySetting(ctx.settings, key, value);
	if (!applied) {
		pi.sendUserMessage(`Failed to apply ${key}.`);
		return;
	}

	// Persist to disk
	const tffDir = ctx.projectRoot ? join(ctx.projectRoot, ".tff") : null;
	if (tffDir) {
		mkdirSync(tffDir, { recursive: true });
		writeFileSync(join(tffDir, "settings.yaml"), YAML.stringify(ctx.settings));
	}

	pi.sendUserMessage(`Updated ${key} to ${String(value)}. Settings persisted.`);
}

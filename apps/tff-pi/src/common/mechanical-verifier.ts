import { spawnSync } from "node:child_process";
import { gitEnv } from "./git.js";
import type { VerifyCommand } from "./verify-commands.js";

export interface CommandResult {
	name: string;
	command: string;
	exitCode: number;
	passed: boolean;
	stdout: string;
	stderr: string;
	durationMs: number;
}

export interface MechanicalReport {
	timestamp: string;
	commands: CommandResult[];
	allPassed: boolean;
}

const MAX_STDOUT_LINES = 200;
const MAX_STDERR_LINES = 100;

/** Parse a simple shell-like command string into argv.
 *  Respects single/double quotes and backslash escapes.
 *  Does NOT expand variables, backticks, or globs.
 *  Returns null for empty/whitespace-only strings. */
function parseShellCommand(cmd: string): string[] | null {
	const tokens: string[] = [];
	let current = "";
	let inSingle = false;
	let inDouble = false;
	let escaped = false;

	for (let i = 0; i < cmd.length; i++) {
		const ch = cmd[i];
		if (escaped) {
			current += ch;
			escaped = false;
			continue;
		}
		if (inSingle) {
			if (ch === "'") inSingle = false;
			else current += ch;
			continue;
		}
		if (inDouble) {
			if (ch === "\\") escaped = true;
			else if (ch === '"') inDouble = false;
			else current += ch;
			continue;
		}
		if (ch === "\\") {
			escaped = true;
			continue;
		}
		if (ch === "'") {
			inSingle = true;
			continue;
		}
		if (ch === '"') {
			inDouble = true;
			continue;
		}
		if (/\s/.test(ch)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}
		current += ch;
	}
	if (current) tokens.push(current);
	return tokens.length > 0 ? tokens : null;
}

function truncateLines(text: string, maxLines: number): string {
	const lines = text.split("\n");
	if (lines.length <= maxLines) return text;
	return `... (${lines.length - maxLines} lines truncated)\n${lines.slice(-maxLines).join("\n")}`;
}

export async function runMechanicalVerification(
	commands: VerifyCommand[],
	cwd: string,
): Promise<MechanicalReport> {
	const results: CommandResult[] = [];

	for (const cmd of commands) {
		const args = parseShellCommand(cmd.command);
		if (!args || args.length === 0) {
			results.push({
				name: cmd.name,
				command: cmd.command,
				exitCode: 1,
				passed: false,
				stdout: "",
				stderr: "Empty or unparsable command",
				durationMs: 0,
			});
			continue;
		}

		const start = Date.now();
		let exitCode = 0;
		let stdout = "";
		let stderr = "";

		const result = spawnSync(args[0], args.slice(1), {
			cwd,
			encoding: "utf-8",
			shell: false,
			timeout: 300_000, // 5 minute timeout per command
			env: gitEnv(),
			maxBuffer: 10 * 1024 * 1024,
		});

		if (result.error) {
			exitCode = 1;
			stderr = result.error.message;
			stdout = result.stdout ?? "";
		} else {
			exitCode = result.status ?? (result.signal ? 1 : 0);
			stdout = result.stdout ?? "";
			stderr = result.stderr ?? "";
		}

		results.push({
			name: cmd.name,
			command: cmd.command,
			exitCode,
			passed: exitCode === 0,
			stdout: truncateLines(stdout, MAX_STDOUT_LINES),
			stderr: truncateLines(stderr, MAX_STDERR_LINES),
			durationMs: Date.now() - start,
		});
	}

	return {
		timestamp: new Date().toISOString(),
		commands: results,
		allPassed: results.every((r) => r.passed),
	};
}

export function formatMechanicalReport(report: MechanicalReport): string {
	const lines: string[] = [
		"# Mechanical Verification Report",
		"",
		`**Timestamp:** ${report.timestamp}`,
		`**Overall:** ${report.allPassed ? "PASS" : "FAIL"}`,
		"",
	];

	for (const cmd of report.commands) {
		const status = cmd.passed ? "PASS" : "FAIL";
		lines.push(`## ${cmd.name} — ${status}`);
		lines.push("");
		lines.push(`**Command:** \`${cmd.command}\``);
		lines.push(`**Exit code:** ${cmd.exitCode}`);
		lines.push(`**Duration:** ${cmd.durationMs}ms`);

		if (cmd.stdout.trim()) {
			lines.push("", "### stdout", "", "```", cmd.stdout.trim(), "```");
		}
		if (cmd.stderr.trim()) {
			lines.push("", "### stderr", "", "```", cmd.stderr.trim(), "```");
		}
		lines.push("");
	}

	return lines.join("\n");
}

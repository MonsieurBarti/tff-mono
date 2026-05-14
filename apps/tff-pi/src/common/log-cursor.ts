import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CURSOR_FILE = ".pi-log-cursor.json";

function cursorPath(root: string): string {
	return join(root, ".tff", CURSOR_FILE);
}

export function readLogCursor(root: string): { lastHash: string | null; lastRow: number } {
	const path = cursorPath(root);
	if (!existsSync(path)) {
		return { lastHash: null, lastRow: 0 };
	}
	const raw = readFileSync(path, "utf-8");
	const parsed = JSON.parse(raw) as { hash?: string; row?: number };
	return {
		lastHash: typeof parsed.hash === "string" ? parsed.hash : null,
		lastRow: typeof parsed.row === "number" ? parsed.row : 0,
	};
}

export function writeLogCursor(root: string, hash: string, row: number): void {
	const path = cursorPath(root);
	mkdirSync(join(root, ".tff"), { recursive: true });
	writeFileSync(path, JSON.stringify({ hash, row }), "utf-8");
}

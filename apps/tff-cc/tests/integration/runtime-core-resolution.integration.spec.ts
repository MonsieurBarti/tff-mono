import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const distCli = resolve(process.cwd(), "dist", "cli", "index.js");
const distMigrations = resolve(process.cwd(), "dist", "cli", "migrations");

describe("Runtime @tff/core resolution", () => {
	it("bundle --help exits cleanly", () => {
		const out = execSync(`node "${distCli}" --help`, { encoding: "utf8" });
		expect(out).toContain("tff-tools");
	});

	it("dist/cli/migrations/ contains SQL files from @tff/core", () => {
		expect(existsSync(distMigrations)).toBe(true);
		const files = readdirSync(distMigrations);
		const sqlFiles = files.filter((f) => f.endsWith(".sql"));
		expect(sqlFiles.length).toBeGreaterThan(0);
	});

	it("bundle exposes @tff/core exports at runtime", async () => {
		const m = await import(distCli);
		expect(typeof m.runMigrations).toBe("function");
		expect(typeof m.Milestone).toBe("function");
	});
});

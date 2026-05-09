import { describe, it, expect, beforeEach } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { runMigrations, getCurrentVersion } from "../src/db/run-migrations.js";

describe("runMigrations", () => {
	let db: Database.Database;

	beforeEach(() => {
		db = new Database(":memory:");
	});

	it("applies v1 baseline to a fresh database", () => {
		runMigrations(db);
		expect(getCurrentVersion(db)).toBe(1);

		const tables = db
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
			.all() as Array<{ name: string }>;
		const tableNames = tables.map((t) => t.name);

		expect(tableNames).toContain("schema_version");
		expect(tableNames).toContain("project");
		expect(tableNames).toContain("milestone");
		expect(tableNames).toContain("slice");
		expect(tableNames).toContain("task");
		expect(tableNames).toContain("dependency");
		expect(tableNames).toContain("slice_dependency");
		expect(tableNames).toContain("workflow_session");
		expect(tableNames).toContain("review");
		expect(tableNames).toContain("milestone_audit");
		expect(tableNames).toContain("pending_judgments");
		expect(tableNames).toContain("event_log");
		expect(tableNames).toContain("settings");
		expect(tableNames).toContain("phase_run");
	});

	it("is idempotent", () => {
		runMigrations(db);
		runMigrations(db);
		expect(getCurrentVersion(db)).toBe(1);
	});

	it("accepts an explicit migrations directory", () => {
		const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../src/db/migrations");
		runMigrations(db, migrationsDir);
		expect(getCurrentVersion(db)).toBe(1);
	});
});

import { beforeEach, describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { getCurrentVersion, runMigrations } from "../src/db/run-migrations.js";

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
			.all() as { name: string }[];
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

	it("rejects invalid migration filenames", () => {
		const dir = mkdtempSync(join(tmpdir(), "tff-migrations-"));
		writeFileSync(
			join(dir, "foo.sql"),
			"CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));\nCREATE TABLE foo (id INTEGER PRIMARY KEY);",
		);
		try {
			expect(() => runMigrations(db, dir)).toThrow("Invalid migration filename: foo.sql");
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it("throws when database version is newer than code version", () => {
		runMigrations(db);
		// Simulate a newer database version by inserting a fake future version
		db.prepare("INSERT INTO schema_version (version) VALUES (99)").run();
		expect(() => runMigrations(db)).toThrow(
			"VERSION_MISMATCH: Database schema version 99 is newer than code version 1.",
		);
	});

	it("applies migrations in numeric order", () => {
		const dir = mkdtempSync(join(tmpdir(), "tff-migrations-"));
		writeFileSync(
			join(dir, "v1.sql"),
			"CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));\nCREATE TABLE t1 (id INTEGER PRIMARY KEY);",
		);
		writeFileSync(join(dir, "v2.sql"), "ALTER TABLE t1 ADD COLUMN name TEXT;");
		try {
			runMigrations(db, dir);
			expect(getCurrentVersion(db)).toBe(2);
			const cols = db.prepare("SELECT name FROM pragma_table_info('t1') ORDER BY cid").all() as {
				name: string;
			}[];
			expect(cols.map((c) => c.name)).toEqual(["id", "name"]);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});

	it("sorts double-digit versions correctly", () => {
		const dir = mkdtempSync(join(tmpdir(), "tff-migrations-"));
		writeFileSync(
			join(dir, "v1.sql"),
			"CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));\nCREATE TABLE v1 (id INTEGER PRIMARY KEY);",
		);
		writeFileSync(join(dir, "v10.sql"), "ALTER TABLE v1 ADD COLUMN col10 TEXT;");
		writeFileSync(join(dir, "v2.sql"), "ALTER TABLE v1 ADD COLUMN col2 TEXT;");
		try {
			runMigrations(db, dir);
			expect(getCurrentVersion(db)).toBe(10);
			const cols = db.prepare("SELECT name FROM pragma_table_info('v1') ORDER BY cid").all() as {
				name: string;
			}[];
			expect(cols.map((c) => c.name)).toEqual(["id", "col2", "col10"]);
		} finally {
			rmSync(dir, { recursive: true });
		}
	});
});

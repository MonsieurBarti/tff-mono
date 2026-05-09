import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type Database from "better-sqlite3";

export function getCurrentVersion(db: Database.Database): number {
	try {
		const row = db.prepare("SELECT MAX(version) as version FROM schema_version").get() as
			| { version: number | null }
			| undefined;
		return row?.version ?? 0;
	} catch (err) {
		if (err instanceof Error && err.message.includes("no such table: schema_version")) {
			return 0;
		}
		throw err;
	}
}

export function runMigrations(db: Database.Database, migrationsDir?: string): void {
	db.pragma("journal_mode = WAL");

	const currentVersion = getCurrentVersion(db);

	const resolvedDir = migrationsDir ?? join(dirname(fileURLToPath(import.meta.url)), "migrations");

	const files = readdirSync(resolvedDir)
		.filter((f) => f.endsWith(".sql"))
		.sort((a, b) => {
			const va = Number.parseInt(a.match(/^v(\d+)\.sql$/)?.[1] ?? "0", 10);
			const vb = Number.parseInt(b.match(/^v(\d+)\.sql$/)?.[1] ?? "0", 10);
			return va - vb;
		});

	const migrations = files.map((file) => {
		const match = file.match(/^v(\d+)\.sql$/);
		if (!match || match[1] === undefined) {
			throw new Error(`Invalid migration filename: ${file}`);
		}
		const version = Number.parseInt(match[1], 10);
		const sql = readFileSync(join(resolvedDir, file), "utf-8");
		return { version, sql };
	});

	const maxCodeVersion = migrations[migrations.length - 1]?.version ?? 0;
	if (currentVersion > maxCodeVersion) {
		throw new Error(
			`VERSION_MISMATCH: Database schema version ${currentVersion} is newer than code version ${maxCodeVersion}.`,
		);
	}

	db.pragma("foreign_keys = OFF");
	try {
		for (const migration of migrations) {
			if (migration.version <= currentVersion) continue;

			db.transaction(() => {
				db.exec(migration.sql);
				db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(migration.version);
			})();
		}

		const violations = db.pragma("foreign_key_check") as unknown[];
		if (Array.isArray(violations) && violations.length > 0) {
			throw new Error(`Migration failed: foreign_key_check: ${JSON.stringify(violations)}`);
		}
	} finally {
		db.pragma("foreign_keys = ON");
	}
}

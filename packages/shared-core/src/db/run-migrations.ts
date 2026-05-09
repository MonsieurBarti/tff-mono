import type Database from "better-sqlite3";

export function getCurrentVersion(_db: Database.Database): number {
	return 0;
}

export function runMigrations(_db: Database.Database, _migrationsDir?: string): void {}

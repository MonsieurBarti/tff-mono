import { readFile, writeFile, access, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Ok, Err, ContractError } from "@tff/core";
import type { FileSystem, FileSystemEntry } from "@tff/core";

export class ClaudeCodeFileSystemAdapter implements FileSystem {
	async readFile(path: string) {
		try {
			const data = await readFile(path, "utf8");
			return Ok(data);
		} catch (err) {
			return Err(
				new ContractError(`Failed to read ${path}`, "FileSystem", "readFile", String(err)),
			);
		}
	}

	async writeFile(path: string, content: string) {
		try {
			await writeFile(path, content, "utf8");
			return Ok(undefined);
		} catch (err) {
			return Err(
				new ContractError(`Failed to write ${path}`, "FileSystem", "writeFile", String(err)),
			);
		}
	}

	async exists(path: string) {
		try {
			await access(path);
			return Ok(true);
		} catch {
			return Ok(false);
		}
	}

	async mkdir(path: string, recursive = false) {
		try {
			await mkdir(path, { recursive });
			return Ok(undefined);
		} catch (err) {
			return Err(new ContractError(`Failed to mkdir ${path}`, "FileSystem", "mkdir", String(err)));
		}
	}

	async readdir(path: string) {
		try {
			const entries = await readdir(path, { withFileTypes: true });
			const result: FileSystemEntry[] = entries.map((e) => ({
				path: resolve(path, e.name),
				isDirectory: e.isDirectory(),
			}));
			return Ok(result);
		} catch (err) {
			return Err(
				new ContractError(`Failed to readdir ${path}`, "FileSystem", "readdir", String(err)),
			);
		}
	}
}

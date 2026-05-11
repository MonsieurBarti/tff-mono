import { GenericDomainError, type DomainError } from "../errors/generic-domain-error.js";
import type { ArtifactStore } from "../../domain/ports/artifact-store.port.js";
import { Err, Ok, type Result } from "@tff/core";

export class InMemoryArtifactStore implements ArtifactStore {
	private files = new Map<string, string>();
	private failOnWritePaths = new Set<string>();

	simulateWriteFailure(path: string): void {
		this.failOnWritePaths.add(path);
	}

	async read(path: string): Promise<Result<string, DomainError>> {
		const content = this.files.get(path);
		if (content === undefined)
			return Err(new GenericDomainError("NOT_FOUND", `File not found: ${path}`, { path }));
		return Ok(content);
	}

	async write(path: string, content: string): Promise<Result<void, DomainError>> {
		if (this.failOnWritePaths.has(path)) {
			return Err(
				new GenericDomainError("WRITE_FAILURE", `Simulated write failure for: ${path}`, { path }),
			);
		}
		this.files.set(path, content);
		return Ok(undefined);
	}
	async exists(path: string): Promise<boolean> {
		return this.files.has(path);
	}

	async list(directory: string): Promise<Result<string[], DomainError>> {
		const prefix = directory.endsWith("/") ? directory : `${directory}/`;
		const matches = [...this.files.keys()].filter((k) => k.startsWith(prefix));
		return Ok(matches);
	}

	async mkdir(_path: string): Promise<Result<void, DomainError>> {
		return Ok(undefined);
	}

	reset(): void {
		this.files.clear();
	}
	seed(files: Record<string, string>): void {
		for (const [path, content] of Object.entries(files)) {
			this.files.set(path, content);
		}
	}
	getAll(): Map<string, string> {
		return new Map(this.files);
	}
}

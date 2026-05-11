import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { DomainError } from "../../errors/generic-domain-error.js";
import { GenericDomainError } from "../../errors/generic-domain-error.js";
import type {
	RoutingDecisionLogger,
	RoutingLogEntry,
} from "../../../domain/ports/routing-decision-logger.port.js";
import { Err, Ok, type Result } from "@tff/core";
import { warnIfOversize } from "./warn-if-oversize.js";
import { withAppendLock } from "./with-append-lock.js";

export class JsonlRoutingDecisionLogger implements RoutingDecisionLogger {
	constructor(private readonly path: string) {}

	async append(entry: RoutingLogEntry): Promise<Result<void, DomainError>> {
		try {
			await mkdir(dirname(this.path), { recursive: true });
			await withAppendLock(this.path, async () => {
				await appendFile(this.path, `${JSON.stringify(entry)}\n`, "utf8");
			});
			await warnIfOversize(this.path);
			return Ok(undefined);
		} catch (err) {
			return Err(
				new GenericDomainError(
					"ROUTING_CONFIG",
					`routing log append failed: ${err instanceof Error ? err.message : String(err)}`,
					{ path: this.path },
				),
			);
		}
	}
}

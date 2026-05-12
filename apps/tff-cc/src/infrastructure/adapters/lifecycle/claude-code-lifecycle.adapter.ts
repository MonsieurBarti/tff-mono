import { Ok } from "@tff/core";
import type { LifecycleManager } from "@tff/core";

export class ClaudeCodeLifecycleAdapter implements LifecycleManager {
	private sessionStartHandlers: Array<() => Promise<void> | void> = [];
	private sessionShutdownHandlers: Array<() => Promise<void> | void> = [];
	private signalsRegistered = false;

	private registerSignals(): void {
		if (this.signalsRegistered) return;
		this.signalsRegistered = true;

		const runShutdownHandlers = async (): Promise<void> => {
			for (const handler of this.sessionShutdownHandlers) {
				try {
					await handler();
				} catch {
					/* ignore shutdown handler errors */
				}
			}
		};

		process.on("SIGINT", () => {
			runShutdownHandlers().finally(() => process.exit(0));
		});

		process.on("SIGTERM", () => {
			runShutdownHandlers().finally(() => process.exit(0));
		});
	}

	async onSessionStart(handler: () => Promise<void> | void) {
		this.sessionStartHandlers.push(handler);
		return Ok(undefined);
	}

	async onSessionShutdown(handler: () => Promise<void> | void) {
		this.sessionShutdownHandlers.push(handler);
		this.registerSignals();
		return Ok(undefined);
	}
}

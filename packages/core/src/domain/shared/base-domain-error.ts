export abstract class BaseDomainError<Context> {
	abstract readonly errorLabel: string;
	abstract readonly status: number;
	abstract readonly context: Context;
	abstract readonly message: string;
	readonly recoveryHint?: string;

	constructor(recoveryHint?: string) {
		if (recoveryHint !== undefined) {
			this.recoveryHint = recoveryHint;
		}
	}
}

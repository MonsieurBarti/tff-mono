export abstract class BaseDomainError<Context> {
	abstract readonly errorLabel: string;
	abstract readonly status: number;
	abstract readonly context: Context;
}

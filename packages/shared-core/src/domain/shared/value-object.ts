export abstract class ValueObject<P> {
	abstract equals(_other: ValueObject<P>): boolean;
	abstract validate(): void;
}

import { describe, it, expect } from "vitest";
import { ValueObject } from "../../src/domain/shared/value-object.js";

describe("ValueObject", () => {
	it("equals returns true for same props", () => {
		class Money extends ValueObject<{ amount: number; currency: string }> {
			constructor(public readonly props: { amount: number; currency: string }) {
				super();
				this.validate();
			}

			equals(other: ValueObject<{ amount: number; currency: string }>): boolean {
				return (
					this.props.amount === (other as Money).props.amount &&
					this.props.currency === (other as Money).props.currency
				);
			}

			validate(): void {
				if (this.props.amount < 0) throw new Error("amount must be positive");
			}
		}

		const a = new Money({ amount: 100, currency: "USD" });
		const b = new Money({ amount: 100, currency: "USD" });
		const c = new Money({ amount: 200, currency: "USD" });

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});

	it("validate throws on invalid input", () => {
		class Money extends ValueObject<{ amount: number; currency: string }> {
			constructor(public readonly props: { amount: number; currency: string }) {
				super();
				this.validate();
			}

			equals(): boolean {
				return false;
			}

			validate(): void {
				if (this.props.amount < 0) throw new Error("amount must be positive");
			}
		}

		expect(() => new Money({ amount: -5, currency: "USD" })).toThrow("amount must be positive");
	});
});

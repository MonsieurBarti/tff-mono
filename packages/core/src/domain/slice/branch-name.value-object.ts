import { randomUUID } from "node:crypto";
import { ValueObject } from "../shared/value-object.js";
import type { SliceKind } from "./slice-kind.js";

export class BranchName extends ValueObject<string> {
	constructor(public readonly props: string) {
		super();
		this.validate();
	}

	static create(label: string, prefix?: string): BranchName {
		const value = prefix ? `${prefix}/${label}` : label;
		return new BranchName(value);
	}

	static generate(sliceKind: SliceKind, sliceNumber: number): BranchName {
		switch (sliceKind) {
			case "milestone": {
				const prefix = randomUUID().split("-")[0];
				return new BranchName(`slice/${prefix}`);
			}
			case "quick":
				return new BranchName(`quick/${sliceNumber.toString()}`);
			case "debug":
				return new BranchName(`debug/${sliceNumber.toString()}`);
		}
	}

	get value(): string {
		return this.props;
	}

	get prefix(): string {
		const idx = this.props.indexOf("/");
		return idx === -1 ? "" : this.props.slice(0, idx);
	}

	get label(): string {
		const idx = this.props.indexOf("/");
		return idx === -1 ? this.props : this.props.slice(idx + 1);
	}

	equals(other: ValueObject<string>): boolean {
		return this.props === (other as BranchName).props;
	}

	validate(): void {
		if (!this.props || this.props.trim() === "") {
			throw new Error("branch name cannot be empty");
		}
	}
}

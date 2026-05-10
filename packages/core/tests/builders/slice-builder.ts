import { randomUUID } from "node:crypto";
import type { SliceKind } from "../../src/domain/slice/slice-kind.js";

export class SliceBuilder {
	private _milestoneId = randomUUID();
	private _kind: SliceKind = "milestone";
	private _number = 1;
	private _title = "Test Slice";
	private _baseBranch = "main";

	withMilestoneId(milestoneId: string): this {
		this._milestoneId = milestoneId;
		return this;
	}

	withKind(kind: SliceKind): this {
		this._kind = kind;
		return this;
	}

	withNumber(number: number): this {
		this._number = number;
		return this;
	}

	withTitle(title: string): this {
		this._title = title;
		return this;
	}

	withBaseBranch(baseBranch: string): this {
		this._baseBranch = baseBranch;
		return this;
	}

	build(): {
		milestoneId: string;
		kind: SliceKind;
		number: number;
		title: string;
		baseBranch: string;
	} {
		return {
			milestoneId: this._milestoneId,
			kind: this._kind,
			number: this._number,
			title: this._title,
			baseBranch: this._baseBranch,
		};
	}
}

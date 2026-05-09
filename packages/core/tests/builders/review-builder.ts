import { randomUUID } from "node:crypto";

export class ReviewBuilder {
	private _sliceId = randomUUID();
	private _type = "code";
	private _reviewer = "agent";
	private _commitSha: string | null = null;
	private _notes: string | null = null;

	withSliceId(sliceId: string): this {
		this._sliceId = sliceId;
		return this;
	}

	withType(type: string): this {
		this._type = type;
		return this;
	}

	withReviewer(reviewer: string): this {
		this._reviewer = reviewer;
		return this;
	}

	withCommitSha(commitSha: string | null): this {
		this._commitSha = commitSha;
		return this;
	}

	withNotes(notes: string | null): this {
		this._notes = notes;
		return this;
	}

	build(): {
		sliceId: string;
		type: string;
		reviewer: string;
		commitSha: string | null;
		notes: string | null;
	} {
		return {
			sliceId: this._sliceId,
			type: this._type,
			reviewer: this._reviewer,
			commitSha: this._commitSha,
			notes: this._notes,
		};
	}
}

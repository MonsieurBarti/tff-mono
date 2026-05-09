import { randomUUID } from "node:crypto";

export class TaskBuilder {
	private _sliceId = randomUUID();
	private _number = 1;
	private _title = "Test Task";
	private _wave: number | null = null;
	private _difficulty: number | null = null;

	withSliceId(sliceId: string): this {
		this._sliceId = sliceId;
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

	withWave(wave: number | null): this {
		this._wave = wave;
		return this;
	}

	withDifficulty(difficulty: number | null): this {
		this._difficulty = difficulty;
		return this;
	}

	build(): {
		sliceId: string;
		number: number;
		title: string;
		wave: number | null;
		difficulty: number | null;
	} {
		return {
			sliceId: this._sliceId,
			number: this._number,
			title: this._title,
			wave: this._wave,
			difficulty: this._difficulty,
		};
	}
}

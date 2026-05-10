export abstract class IDateProvider {
	abstract now(): Date;
}

export class RealDateProvider extends IDateProvider {
	now(): Date {
		return new Date();
	}
}

export class FakeDateProvider extends IDateProvider {
	private _date: Date;

	constructor(date: Date) {
		super();
		this._date = date;
	}

	now(): Date {
		return this._date;
	}

	set(date: Date): void {
		this._date = date;
	}

	advance(ms: number): void {
		this._date = new Date(this._date.getTime() + ms);
	}
}

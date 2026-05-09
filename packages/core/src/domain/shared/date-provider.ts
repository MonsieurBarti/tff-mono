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

	setDate(date: Date): void {
		this._date = date;
	}
}

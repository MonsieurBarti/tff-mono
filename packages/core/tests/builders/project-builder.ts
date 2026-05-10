export class ProjectBuilder {
	private _name = "Test Project";
	private _vision = "A vision";

	withName(name: string): this {
		this._name = name;
		return this;
	}

	withVision(vision: string): this {
		this._vision = vision;
		return this;
	}

	build(): { name: string; vision: string } {
		return { name: this._name, vision: this._vision };
	}
}

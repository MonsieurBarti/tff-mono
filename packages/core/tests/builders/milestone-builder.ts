import { randomUUID } from "node:crypto";

export class MilestoneBuilder {
	private _projectId = randomUUID();
	private _number = 1;
	private _name = "Milestone 1";
	private _branch = "milestone/abc12345";

	withProjectId(projectId: string): this {
		this._projectId = projectId;
		return this;
	}

	withNumber(number: number): this {
		this._number = number;
		return this;
	}

	withName(name: string): this {
		this._name = name;
		return this;
	}

	withBranch(branch: string): this {
		this._branch = branch;
		return this;
	}

	build(): { projectId: string; number: number; name: string; branch: string } {
		return {
			projectId: this._projectId,
			number: this._number,
			name: this._name,
			branch: this._branch,
		};
	}
}

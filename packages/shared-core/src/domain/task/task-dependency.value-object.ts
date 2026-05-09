import { ValueObject } from "../shared/value-object.js";

export class TaskDependency extends ValueObject<{ fromId: string; toId: string }> {
	private constructor(public readonly props: { fromId: string; toId: string }) {
		super();
		this.validate();
	}

	static create(fromId: string, toId: string): TaskDependency {
		return new TaskDependency({ fromId, toId });
	}

	get fromId(): string {
		return this.props.fromId;
	}

	get toId(): string {
		return this.props.toId;
	}

	equals(other: ValueObject<{ fromId: string; toId: string }>): boolean {
		return (
			this.props.fromId === (other as TaskDependency).props.fromId &&
			this.props.toId === (other as TaskDependency).props.toId
		);
	}

	validate(): void {
		if (!this.props.fromId) throw new Error("fromId is required");
		if (!this.props.toId) throw new Error("toId is required");
	}
}

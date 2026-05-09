import { describe, it, expect } from "vitest";
import { RepositoryPort } from "../../src/domain/shared/repository-port.js";
import { AggregateRoot } from "../../src/domain/shared/aggregate-root.js";
import { DomainEvent } from "../../src/domain/shared/domain-event.js";

describe("RepositoryPort", () => {
	it("can be implemented with all required methods", async () => {
		class FakeEntity extends AggregateRoot {
			constructor(id: string) {
				super();
				this._id = id;
			}
		}

		class FakeRepo extends RepositoryPort<FakeEntity> {
			private entities = new Map<string, FakeEntity>();

			async save(entity: FakeEntity): Promise<void> {
				this.entities.set(entity.id, entity);
			}

			async findById(id: string): Promise<FakeEntity | null> {
				return this.entities.get(id) ?? null;
			}

			async findAll(): Promise<FakeEntity[]> {
				return [...this.entities.values()];
			}

			async delete(id: string): Promise<void> {
				this.entities.delete(id);
			}
		}

		const repo = new FakeRepo();
		const entity = new FakeEntity("e1");
		entity.addEvent(DomainEvent.create("test", {}));

		await repo.save(entity);
		expect(await repo.findById("e1")).toBe(entity);
		expect(await repo.findAll()).toHaveLength(1);
		await repo.delete("e1");
		expect(await repo.findById("e1")).toBeNull();
	});
});

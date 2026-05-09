import type { AggregateRoot } from "./aggregate-root.js";

export abstract class RepositoryPort<Entity extends AggregateRoot> {
	abstract save(entity: Entity): Promise<void>;
	abstract findById(id: string): Promise<Entity | null>;
	abstract findAll(): Promise<Entity[]>;
	abstract delete(id: string): Promise<void>;
}

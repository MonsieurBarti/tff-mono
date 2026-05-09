# Layer Rules — Hexagonal Architecture

Companion to [SKILL.md](./SKILL.md). Quick-reference for layer boundaries in `tff-mono`.

---

## Dependency Matrix

```
Presentation (apps/)  → Application (apps/)
Application (apps/)   → Domain (packages/core/src/domain/)
Infrastructure        → Domain (implements ports defined in domain)
Domain                → nothing (pure, zero SQLite / file I/O / host API)
```

**Iron Law:** Every import in file F at layer L must be at L or an inner layer. Violations are architectural bugs, not style issues.

---

## Package Structure

| Directory       | Responsibility                                          | Host Access                      |
| --------------- | ------------------------------------------------------- | -------------------------------- |
| `src/domain/`   | Entities, Value Objects, Domain Events, errors, ports   | Both apps                        |
| `src/contract/` | Client adapter interface + types                        | Both apps (implement in `apps/`) |
| `src/content/`  | Agents, skills, workflows, protocols, commands, prompts | Both apps                        |
| `src/db/`       | Schema, migrations, query layer                         | Both apps                        |

Dependency direction: `content` → `domain`; `contract` ← `domain` (domain defines ports, contract is the host-facing boundary); `db` → `domain` (implements repository ports).

---

## What Belongs in Each Layer

### Domain (`packages/core/src/domain/`)

| Belongs                    | Example                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| Entities with behavior     | `Slice` with `transition()`, `classifyTier()`, `archive()`           |
| Value Objects              | `Phase` (has ordering logic), `BranchName` (validation + generation) |
| Aggregate roots            | `Slice` containing `Task[]`, `Dependency`, `Review`                  |
| Domain Events              | `SliceCreatedEvent`, `TaskClaimedEvent`                              |
| Domain Services            | Stateless operations on entities/VOs passed in                       |
| Repository port interfaces | `SliceRepository` (abstract class, not implementation)               |
| Domain Errors              | `InvalidTransitionError`, `AlreadyClaimedError`                      |
| Zod schemas                | `CreateSliceProps`, `UserPropsSchema`                                |
| Transition tables          | `transitions.ts` — canonical edge table                              |
| Guard predicates           | `guards.ts` — business-rule checks                                   |

### Application (`apps/*/application/`)

| Belongs              | Example                                        |
| -------------------- | ---------------------------------------------- |
| Commands             | `CreateSliceCommand`, `ClaimTaskCommand`       |
| Command Handlers     | `CreateSliceHandler.execute(cmd)`              |
| Queries              | `GetSliceQuery`, `ListOpenTasksQuery`          |
| Query Handlers       | `GetSliceHandler.execute(query)`               |
| Application Services | Orchestration of multiple domain operations    |
| Event handlers       | Subscribers to domain events (fire-and-forget) |
| Port usage           | `this.sliceRepo.save(slice)` via injected port |

### Infrastructure (`packages/core/src/db/` + `apps/*/infrastructure/`)

| Belongs                   | Example                                                    |
| ------------------------- | ---------------------------------------------------------- |
| Repository adapters       | `SQLiteSliceRepository extends SliceRepository`            |
| In-memory adapters        | `InMemorySliceRepository extends SliceRepository`          |
| Data mappers              | `SliceMapper.toDomain(row)` / `.toPersistence(entity)`     |
| External service adapters | Host-specific glue (Claude Code native, PI `ExtensionAPI`) |
| Database clients          | SQLite connection, schema, migrations                      |
| File system adapters      | Path-guarded file I/O                                      |

### Presentation (`apps/*/presentation/`)

| Belongs                       | Example                                      |
| ----------------------------- | -------------------------------------------- |
| Slash commands / CLI handlers | `tff-tools` command dispatch                 |
| Skill invocations             | Trigger routing and context curation         |
| Request/Response DTOs         | Zod schemas at the boundary                  |
| DI container wiring           | Port → concrete adapter binding              |
| Exception / error mapping     | `Result` errors → host-appropriate responses |

---

## What Does NOT Belong (Violation Examples)

### Domain Violations

```typescript
// VIOLATION: domain imports infrastructure
import { SQLiteSliceRepository } from '../db/repositories/slice.repository';

// VIOLATION: domain imports node:fs (I/O in pure layer)
import { readFileSync } from 'node:fs';

// VIOLATION: domain throws instead of returning Result
static create(input: SliceInput): Slice {
  if (!input.title) throw new Error('Title required');  // WRONG
}

// VIOLATION: domain imports application layer
import { CreateSliceHandler } from '../application/commands/create-slice.handler';
```

### Application Violations

```typescript
// VIOLATION: application imports infrastructure
import { SQLiteSliceRepository } from "../../db/repositories/slice.repository";

// VIOLATION: application does direct I/O
import { readFile } from "node:fs/promises";

// VIOLATION: business logic in application layer
class CreateSliceHandler {
	async execute(cmd) {
		// WRONG: tier classification belongs in domain
		const tier = cmd.complexity > 5 ? "SSS" : "S";
	}
}
```

### Infrastructure Violations

```typescript
// VIOLATION: infrastructure contains business logic
class SQLiteSliceRepository extends SliceRepository {
	async save(slice: Slice) {
		// WRONG: validation belongs in domain
		if (!slice.title) throw new Error("Invalid title");
	}
}
```

### Presentation Violations

```typescript
// VIOLATION: presentation imports domain directly
import { Slice } from "@tff/core/domain/entities/slice.entity";
const slice = Slice.create({ title });
await this.sliceRepo.save(slice); // WRONG: go through command handler

// VIOLATION: business logic in controller / handler
class TffCreateSliceCommand {
	async run(args) {
		// WRONG: belongs in command handler / domain
		if (await this.repo.findByTitle(args.title)) {
			return { error: "Slice exists" };
		}
	}
}
```

---

## Import Rules — Quick Check

| If you see this import...  | in this layer... | Verdict                            |
| -------------------------- | ---------------- | ---------------------------------- |
| `from '../db/'`            | Domain           | VIOLATION                          |
| `from '../application/'`   | Domain           | VIOLATION                          |
| `from '../../apps/'`       | Domain           | VIOLATION                          |
| `from '../db/'`            | Application      | VIOLATION                          |
| `from '../../apps/'`       | Application      | VIOLATION                          |
| `from '../../apps/'`       | Infrastructure   | VIOLATION                          |
| `from '@tff/core/domain/'` | Presentation     | VIOLATION (go through Application) |
| `from '../db/'`            | Presentation     | VIOLATION (use DI)                 |
| `from 'node:fs'`           | Domain           | VIOLATION                          |
| `from 'node:fs'`           | Application      | VIOLATION                          |

**Rule of thumb:** If you're importing from an outer layer, you have a dependency inversion problem. Define a port (abstract class) in the inner layer and implement it in the outer layer.

---

## Test Isolation

Each layer must be testable **independently** without instantiating outer layers.

| Layer                      | Test Setup                       | Dependencies                                            |
| -------------------------- | -------------------------------- | ------------------------------------------------------- |
| Domain                     | Direct instantiation             | None — `Slice.create()` needs no adapters               |
| Commands (write use cases) | Inject in-memory adapters        | `new CreateSliceHandler(new InMemorySliceRepository())` |
| Queries (read use cases)   | SQLite `:memory:`                | Verify projection + mapping                             |
| Presentation               | Full stack or mocked application | Host-specific CLI runner                                |

### Testing Principle

- **Domain tests** prove business rules work
- **Command tests** prove use cases orchestrate correctly with in-memory adapters
- **Query tests** prove adapter mapping and projection work (integration, real SQLite)
- **Presentation tests** prove entry points parse input and return expected output

```typescript
// Command test — fully isolated, no I/O
describe("CreateSliceHandler", () => {
	let handler: CreateSliceHandler;
	let sliceRepo: InMemorySliceRepository;

	beforeEach(() => {
		sliceRepo = new InMemorySliceRepository();
		handler = new CreateSliceHandler(sliceRepo);
	});

	it("should create a slice", async () => {
		const result = await handler.execute(new CreateSliceCommand("M02-S03"));

		expect(result.ok).toBe(true);
		const saved = await sliceRepo.findById(result.value);
		expect(saved.value?.title).toBe("M02-S03");
	});
});
```

---

## Entity Construction Pattern

```typescript
// Zod schema for creation input (internal, not exported)
const CreateSlicePropsSchema = z.object({ title: z.string().min(1) });
type CreateSliceProps = z.infer<typeof CreateSlicePropsSchema>;

// Exported state interface (used by mapper for reconstruct())
export interface SliceState {
	id: string;
	title: string;
	status: SliceStatus;
}

// Entity class
export class Slice extends AggregateRoot {
	private constructor(private readonly _state: SliceState) {
		super();
	}

	static createNew(props: CreateSliceProps): Slice {
		const parsed = CreateSlicePropsSchema.safeParse(props);
		if (!parsed.success) throw BaseDomainError.validation(parsed.error);
		return new Slice({
			id: crypto.randomUUID(),
			title: parsed.data.title,
			status: SliceStatus.CREATED,
		});
	}

	static reconstruct(state: SliceState): Slice {
		return new Slice(state);
	}

	get title(): string {
		return this._state.title;
	}
	get status(): SliceStatus {
		return this._state.status;
	}
}
```

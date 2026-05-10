# ADR 001 — Hexagonal Architecture in Shared Core

## Status

Proposed

## Context

The `tff-mono` monorepo contains two host-specific applications:

- `apps/tff-cc` — Claude Code plugin with standalone CLI (`tff-tools`)
- `apps/tff-pi` — PI Coding Agent extension

Both apps share the same domain concepts (milestones, slices, tasks, state machines) but currently implement them independently. `tff-cc` has a functional domain layer (Zod schemas + plain objects + standalone transition functions). `tff-pi` has minimal types with no runtime validation. This duplication creates drift risk and makes parity impossible.

We need a single shared package (`packages/core`) that both apps consume. The domain logic must be:

- **Host-agnostic** — no Claude Code or PI-specific types leak in
- **Framework-independent** — no NestJS, no GraphQL, no host framework
- **Testable in isolation** — pure TypeScript, no I/O in domain
- **Extractable** — if we ever split the package out, the boundary is clean

The patterns in this ADR are adapted from a previous project's hexagonal architecture ADR (a mature DDD reference from a 50-engineer NestJS monolith). We keep the structural decisions; we drop the NestJS/Mongoose/GraphQL specifics.

## Decision

### 1. Package Structure

Single shared package with four source directories:

| Directory       | Responsibility                                          | Host Access                      |
| --------------- | ------------------------------------------------------- | -------------------------------- |
| `src/domain/`   | Entities, Value Objects, Domain Events, errors, ports   | Both apps                        |
| `src/contract/` | Client adapter interface + types                        | Both apps (implement in `apps/`) |
| `src/content/`  | Agents, skills, workflows, protocols, commands, prompts | Both apps                        |
| `src/db/`       | Schema, migrations, query layer                         | Both apps                        |

Dependency direction: `content` → `domain`; `contract` ← `domain` (domain defines ports, contract is the host-facing boundary); `db` → `domain` (implements repository ports).

### 2. Layer Architecture

Four conceptual layers with strict dependency direction:

| Layer                                                                   | Responsibility                                              | Depends On                |
| ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------- |
| **Presentation** (in `apps/`)                                           | Slash commands, CLI handlers, skill invocations             | Application               |
| **Application** (in `apps/`)                                            | Use cases (commands/queries), orchestration, event handlers | Domain                    |
| **Domain** (`packages/core/src/domain/`)                                | Entities, VOs, Events, errors, repository ports             | Nothing                   |
| **Infrastructure** (`packages/core/src/db/` + `apps/*/infrastructure/`) | SQLite repos, file adapters, host-specific glue             | Domain (implements ports) |

The domain layer depends on **nothing** — zero SQLite, zero file I/O, zero host API. This is enforced by lint rules (no imports from outside `domain/` except TypeScript builtins and `zod`).

### 3. Entity Construction Pattern

`createNew()` + `reconstruct()`, private constructor. All definitions colocated in a single `{name}.entity.ts` file.

**File contents per entity:**

1. Zod schema for creation input (internal, not exported)
2. `CreateXxxProps` type inferred from Zod schema (not exported)
3. `XxxState` interface exported (used by infrastructure mapper for `reconstruct()`)
4. Entity class extending `AggregateRoot`

**Property conventions:**

- All properties are `private`, prefixed with `_` (e.g. `private _status: SliceStatus`)
- Immutable properties use `private readonly` (e.g. `private readonly _id: string`)
- Exposed via `get` accessors without the underscore (e.g. `get status(): SliceStatus`)
- Derived/computed properties are also getters (e.g. `get isClosed(): boolean`)

**Constructor:**

- `private constructor(state: XxxState)` — assigns all fields from the state object
- Impossible to instantiate without going through a factory

**Factories:**

- `static createNew(props: CreateXxxProps): Xxx` — validates via Zod, generates UUID (`crypto.randomUUID()`), emits domain events, returns entity
- `static reconstruct(state: XxxState): Xxx` — hydrates from DB, zero validation, zero events

**Behavioral methods:**

- Mutations (`transition()`, `classifyTier()`, `archive()`...) — validate inline (simple invariants) or via Zod (complex), throw typed domain errors, emit events
- Never `new Date()` directly in the entity; inject `IDateProvider` if time is needed for mutation logic

### 4. Validation Strategy

Zod in domain exclusively. No class-validator (no GraphQL/class-based DTOs in this project).

- **Value Objects & Entities**: Zod schemas for domain invariants.
- **Two layers validate different concerns**: application = "well-formed input" (schema parse), domain = "valid business state" (entity invariants).

### 5. Value Objects — When to Create One

VO when there's behavior; Zod in the entity when there's only constraints.

| Type                                           | Verdict       | Reason                                                                   |
| ---------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `SliceStatus`, `MilestoneStatus`, `TaskStatus` | Zod enum      | No behavior; transition logic lives in external state machine            |
| `ComplexityTier`, `SliceKind`                  | Zod enum      | Just constraints                                                         |
| `Phase`                                        | **VO**        | Has ordering logic (`PIPELINE_PHASE_ORDER`), `nextPhase()`, `isBefore()` |
| `BranchName`                                   | **VO**        | Has validation + generation logic                                        |
| Simple strings with min/max                    | Zod in entity | Just constraints                                                         |

Criterion: does the field have **behavior** (methods, operations)? → VO. Just constraints? → Zod in entity `createNew()` validation.

### 6. Repositories — Domain-Infrastructure Contract

Generic `RepositoryPort<Entity>` + extension per aggregate. Ports are **abstract classes** (not interfaces).

- `RepositoryPort<Entity>` provides: `save()`, `findById()`, `findAll()`, `delete()`.
- Each aggregate extends with specific methods: `abstract class SliceRepository extends RepositoryPort<Slice>`.
- Infrastructure implements (e.g. `SQLiteSliceRepository`).
- Tests use `InMemorySliceRepository` implementing the same abstract class.
- Ports are abstract classes — used directly as DI tokens if the host framework supports it; otherwise used as type contracts.

### 7. Dependency Injection

No hard dependency on a specific DI framework. Abstract class as token where applicable.

- In `tff-cc` (Claude Code plugin): manual composition or esbuild-injected DI.
- In `tff-pi` (PI extension): PI's `ExtensionAPI` registration pattern.
- The shared core exposes factories and ports; apps wire them.

### 8. Domain Events

In-process, fire-and-forget. All events are integration events by design.

- Repository publishes events after successful `save()`.
- Event handlers live in Application layer (in `apps/`).
- If a handler fails: log the error, no automatic retry.
- If guaranteed delivery is needed later, introduce outbox/queue for THAT case only.
- All domain events are treated as integration events: their payload is a flat, serializable DTO (primitives, no Value Objects, no entity references). Safe for cross-app consumption from day one.
- Naming: `{Aggregate}{Verb}Event` (e.g. `SliceCreatedEvent`, `TaskClaimedEvent`).

### 9. Event Bus Port

`EventBus` abstract class (port) in `domain/shared/`:

```typescript
abstract class EventBus {
	abstract publish(event: DomainEvent<unknown>): void;
	abstract subscribe<T>(eventName: string, handler: (event: DomainEvent<T>) => void): void;
}
```

Infrastructure provides implementation. Domain only defines the contract.

### 10. State Machine

Data-driven transition table + pluggable guard functions (hybrid pattern).

- Canonical edge table as `const` in `domain/{aggregate}/transitions.ts` — single source of truth.
- Guard predicates in `domain/{aggregate}/guards.ts` — business-rule checks for specific transitions.
- Entity's `transition(to)` method: table lookup → guard check → status mutation → event emission.
- `nextSliceStatus()` utility for workflow automation (S-tier skip, derived state reconciliation).

### 11. Error Handling

Typed domain error hierarchy.

- `BaseDomainError<Context>`: abstract class with `errorLabel` (SCREAMING_SNAKE), `status` (indicative), `context: T`.
- Each module has concrete errors: `InvalidTransitionError`, `AlreadyClaimedError`, `SliceNotFoundError`, etc.
- Domain methods throw these errors directly. Application layer catches and maps to host-appropriate responses (JSON error for CLI, tool result for PI).

### 12. Date Management

`IDateProvider` injectable.

- `IDateProvider`: abstract class with `now()`.
- `RealDateProvider`: production implementation (`Date.now()`).
- `FakeDateProvider`: test implementation with `set(date)`.
- Domain and use cases inject `IDateProvider`, never `new Date()` directly.

### 13. Read Path (Queries)

Query use cases can read directly via repository-specific query methods — no domain passage required.

- No read repository abstraction required; repository ports can expose query methods.
- Read model is a plain TS interface defined next to the query use case (in Application layer).

### 14. Write Path — Strict Entity Passage

Every write goes through a domain entity, no exception.

- The use case loads (or creates) an entity, calls a behavioral method, persists via repository.
- Read use cases can query the DB directly (no domain passage).

### 15. Shared Kernel

Complete shared kernel in `packages/core/src/domain/shared/`.

Contains:

- `AggregateRoot<Props>` — base entity class with domain events (`addEvent()`, `pullEvents()`)
- `ValueObject<Props>` — immutable, `equals()`, `validate()`
- `DomainEvent<Payload>` — event with `eventName`, `payload`, `occurredAt`
- `BaseDomainError<Context>` — error with `errorLabel`, `status`, `context`
- `RepositoryPort<Entity>` — generic abstract class (`save`, `findById`, `findAll`, `delete`)
- `Mapper<Entity, DbRecord>` — interface `toDomain` / `toPersistence`
- `IDateProvider` — abstract class + Real/Fake implementations
- `Result<T, E>` — lightweight monad (`Ok` | `Err`) ported from existing `tff-cc`

### 16. Aggregate Boundaries

Three aggregate roots in the domain:

| Aggregate   | Root        | Children / VOs                                        |
| ----------- | ----------- | ----------------------------------------------------- |
| `Project`   | `Project`   | None (singleton aggregate)                            |
| `Milestone` | `Milestone` | None                                                  |
| `Slice`     | `Slice`     | `Task` (entity), `Dependency` (VO), `Review` (entity) |

`Task` is an entity within the `Slice` aggregate. `Dependency` and `Review` are value objects / child entities within `Slice`. They have no independent lifecycle.

### 17. ID Strategy

UUID v4 generated by domain, typed as `string` everywhere.

- `createNew()` generates ID via `crypto.randomUUID()`. Domain sees only `string`.
- SQLite stores UUID as `TEXT PRIMARY KEY`.
- The mapper (infrastructure) is the ONLY layer that manipulates row shape.
- No `ObjectId`, no auto-increment in domain logic.

### 18. Naming Conventions

Explicit suffix per role:

| File             | Suffix                            |
| ---------------- | --------------------------------- |
| Aggregate root   | `{name}.entity.ts`                |
| Value Object     | `{name}.value-object.ts`          |
| Domain Event     | `{name}.event.ts`                 |
| Domain Error     | `{name}.error.ts`                 |
| Repository Port  | `{name}.repository.ts`            |
| Transition table | `transitions.ts`                  |
| Guard predicates | `guards.ts`                       |
| Shared kernel    | `{name}.ts` (in `domain/shared/`) |

### 19. Folder Structure

Per aggregate under `domain/`:

```
domain/
├── shared/
│   ├── aggregate-root.ts
│   ├── base-domain-error.ts
│   ├── domain-event.ts
│   ├── value-object.ts
│   ├── result.ts
│   ├── repository-port.ts
│   └── date-provider.ts
├── project/
│   ├── project.entity.ts
│   ├── project.event.ts
│   ├── project.error.ts
│   └── project.repository.ts
├── milestone/
│   ├── milestone.entity.ts
│   ├── milestone-status.value-object.ts   # if it gains behavior
│   ├── milestone.event.ts
│   ├── milestone.error.ts
│   └── milestone.repository.ts
├── slice/
│   ├── slice.entity.ts
│   ├── slice-status.value-object.ts       # if it gains behavior
│   ├── slice-kind.value-object.ts         # if it gains behavior
│   ├── complexity-tier.value-object.ts    # if it gains behavior
│   ├── phase.value-object.ts
│   ├── slice.event.ts
│   ├── slice.error.ts
│   ├── slice.repository.ts
│   ├── transitions.ts
│   ├── guards.ts
│   ├── next-slice-status.ts
│   └── derived-state.ts
└── task/
    ├── task.entity.ts
    ├── task-status.value-object.ts        # if it gains behavior
    ├── task.event.ts
    ├── task.error.ts
    └── task.repository.ts
```

### 20. Testing Strategy

Unit tests on Domain + Commands. Integration tests on Queries only.

| Layer                      | Test type   | How                                                         |
| -------------------------- | ----------- | ----------------------------------------------------------- |
| Domain (entities, VOs)     | Unit        | Pure TS, no mocks, instant                                  |
| Commands / write use cases | Unit        | In-memory repos, verify orchestration + invariants + events |
| Queries / read use cases   | Integration | SQLite `:memory:`, verify projection + mapping              |

- In-memory repos implement the same abstract class as SQLite repos.
- Builders for test fixtures.

### 21. Content Surfaces

Markdown files (agents, skills, workflows, protocols, commands, prompts) live as source under `src/content/`. Build step inlines them as TS string exports. Apps import from `packages/core` programmatically — no raw markdown I/O in app code.

### 22. Contract Layer

`packages/core/src/contract/` defines the client adapter interface — the contract each app must implement to host the shared core:

- `ToolExecutor` — execute tools (Claude Code native vs PI `ExtensionAPI`)
- `FileIO` — read/write files with path traversal guards
- `GitOps` — async git operations
- `PromptLoader` — load markdown content surfaces (host-native discovery vs runtime `readFileSync`)

Apps implement these ports in their infrastructure layer. The shared core is agnostic to the host.

### 23. Adaptations from Source Reference

This ADR is a direct adaptation from a prior project's hexagonal architecture reference. Key differences for `tff-mono`:

| Aspect           | Source Reference        | tff core (This ADR)                             |
| ---------------- | ----------------------- | ----------------------------------------------- |
| Framework        | NestJS                  | Host-agnostic (no framework)                    |
| DB               | MongoDB / Mongoose      | SQLite / better-sqlite3                         |
| IDs              | ObjectId                | UUID v4 (`crypto.randomUUID()`)                 |
| API              | GraphQL resolvers       | Slash commands / CLI handlers (in `apps/`)      |
| DI               | NestJS module system    | Manual composition / host-specific              |
| Read path        | Direct Mongoose queries | Direct SQLite queries via repository extensions |
| VO justification | `Money`, `DateRange`    | `Phase`, `BranchName`                           |

All structural decisions (entity pattern, shared kernel, event model, error hierarchy, repository ports, write-path strictness) are preserved.

## Consequences

**Positive:**

- Clean testability: domain logic is pure TS, testable without mocks or infrastructure.
- Host independence: the shared core survives Claude Code or PI version upgrades, or can be hosted by a third client.
- Onboarding clarity: explicit folder structure and naming conventions eliminate guesswork.
- Parity enforcement: both apps consume the same domain types, state machine, and events — drift is structurally impossible.
- Incremental adoption: existing `tff-cc` functional domain can coexist until slices are migrated.

**Negative:**

- More files per feature: an entity requires entity file, events, errors, repository port — more boilerplate than the legacy functional approach.
- Learning curve: engineers need to internalize the layering rules.
- Duplication during transition: ADR-based and legacy implementations coexist until migration is complete.

**Neutral:**

- No performance impact: the extra layers are compile-time abstractions.
- Read path is pragmatic (direct SQLite queries via repo extensions) — no over-abstraction for reads.
- Legacy code in `apps/tff-cc/src/domain/` is unaffected until explicitly migrated (M03 rewiring).

## Alternatives Considered

**Port tff-cc functional domain as-is.** Rejected: the functional pattern (plain objects + standalone functions) has no encapsulation, no event emission on entity methods, and no clear aggregate boundaries. The class-based DDD pattern provides explicit lifecycle control and host-agnostic event propagation.

**Adopt `neverthrow` for Result.** Rejected: the existing hand-rolled `Result<T, E>` monad in `tff-cc` is sufficient and dependency-free. Replacing it adds a package with no functional benefit.

**Keep tff-pi status (`created`) as default.** Accepted: tff-pi's `created` starting status is adopted over tff-cc's `discussing` default. The merged state machine uses `created → discussing` as the initial transition.

## Related References

- `docs/adr/001-hexagonal-architecture-in-core.md` — this document
- `apps/tff-cc/references/conventions.md` — tff workflow conventions
- `apps/tff-cc/references/model-profiles.md` — agent model assignments
- `apps/tff-cc/references/orchestrator-pattern.md` — agent dispatch patterns
- `packages/core/` — implementation package

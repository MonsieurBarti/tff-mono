// Re-export core domain types
export * from "@tff/core";

// Re-export app-specific value objects from shared
export * from "../shared/value-objects/index.js";

// Re-export local app-specific ports
export type { ArtifactStore } from "./ports/artifact-store.port.js";
export type { DatabaseInit } from "./ports/database-init.port.js";
export type { DependencyStore } from "./ports/dependency-store.port.js";
export type { DiffReader, DiffSummary } from "./ports/diff-reader.port.js";
export type { EventBus } from "./ports/event-bus.port.js";
export type { GitOps } from "./ports/git-ops.port.js";
export type { JournalRepository } from "./ports/journal-repository.port.js";
export type {
	AuditVerdict,
	MilestoneAuditRecord,
	MilestoneAuditStore,
} from "./ports/milestone-audit-store.port.js";
export type { ObservationStore } from "./ports/observation-store.port.js";
export type { OutcomeReadFilter, OutcomeSource } from "./ports/outcome-source.port.js";
export type { OutcomeWriter } from "./ports/outcome-writer.port.js";
export type {
	PendingJudgmentRecord,
	PendingJudgmentStore,
} from "./ports/pending-judgment-store.port.js";
export type { ReviewStore } from "./ports/review-store.port.js";
export type {
	CalibrationConfig,
	ModelJudgeConfig,
	RoutingConfig,
	RoutingConfigReader,
} from "./ports/routing-config-reader.port.js";
export type {
	DebugEventLogEntry,
	RoutingDecisionLogEntry,
	RoutingDecisionLogger,
	RoutingLogEntry,
	SignalExtractionLogEntry,
	TierDecisionLogEntry,
} from "./ports/routing-decision-logger.port.js";
export type {
	DebugEventRecord,
	KnownDecision,
	RoutingDecisionReader,
} from "./ports/routing-decision-reader.port.js";
export type { SessionStore } from "./ports/session-store.port.js";
export type { ExtractInput, SignalExtractor } from "./ports/signal-extractor.port.js";
export type { SliceDependency, SliceDependencyStore } from "./ports/slice-dependency-store.port.js";
export type { SliceMergeLookup } from "./ports/slice-merge-lookup.port.js";
export type { SliceSpecReader, SliceSpecResult } from "./ports/slice-spec-reader.port.js";
export type { DEFAULT_TIER_POLICY, TierConfigReader } from "./ports/tier-config-reader.port.js";
export type { TransactionRunner } from "./ports/transaction-runner.port.js";

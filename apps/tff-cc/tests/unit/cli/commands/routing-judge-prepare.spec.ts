import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { routingJudgePrepareCmd } from "../../../../src/cli/commands/routing-judge-prepare.cmd.js";

const { getConfigEnabled, setConfigEnabled } = vi.hoisted(() => {
	let _enabled = false;
	return {
		getConfigEnabled: () => _enabled,
		setConfigEnabled: (v: boolean) => {
			_enabled = v;
		},
	};
});

const { getModelJudgeEnabled, setModelJudgeEnabled } = vi.hoisted(() => {
	let _enabled = false;
	return {
		getModelJudgeEnabled: () => _enabled,
		setModelJudgeEnabled: (v: boolean) => {
			_enabled = v;
		},
	};
});

vi.mock("../../../../src/infrastructure/adapters/filesystem/yaml-routing-config-reader.js", () => ({
	YamlRoutingConfigReader: class {
		async readConfig() {
			return Ok({
				enabled: getConfigEnabled(),
				confidence_threshold: 0.5,
				logging: { path: ".tff/logs/routing.jsonl" },
				calibration: {
					n_min: 5,
					debug_join: { enabled: true },
					model_judge: { enabled: getModelJudgeEnabled() },
				},
			});
		}
	},
}));

vi.mock("../../../../src/infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js", () => ({
	JsonlRoutingDecisionReader: class {
		async readKnownDecisions() {
			return [];
		}
		async readDebugEvents() {
			return [];
		}
	},
}));

vi.mock("../../../../src/infrastructure/adapters/jsonl/routing-outcome-jsonl-reader.js", () => ({
	JsonlRoutingOutcomeReader: class {
		async *readOutcomes() {
			yield* [];
		}
	},
}));

describe("routing:judge-prepare", () => {
	beforeEach(() => {
		setConfigEnabled(false);
		setModelJudgeEnabled(false);
	});

	it("returns skipped when routing is disabled", async () => {
		const result = JSON.parse(
			await routingJudgePrepareCmd(["--slice", "M01-S01"], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "closed",
			}),
		);
		expect(result.ok).toBe(true);
		expect(result.data.skipped).toBe(true);
		expect(result.data.reason).toBe("routing_disabled");
	});

	it("returns precondition error when model judge is disabled", async () => {
		setConfigEnabled(true);
		setModelJudgeEnabled(false);
		const result = JSON.parse(
			await routingJudgePrepareCmd(["--slice", "M01-S01"], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "closed",
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("returns evidence for a closed slice with model judge enabled", async () => {
		setConfigEnabled(true);
		setModelJudgeEnabled(true);
		const result = JSON.parse(
			await routingJudgePrepareCmd(["--slice", "M01-S01"], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "closed",
				mergeLookupFactory: () => ({
					findMergeCommit: async () => Ok("abc123"),
				}),
				diffReaderFactory: () => ({
					readMergeDiff: async () =>
						Ok({ files_changed: 1, insertions: 2, deletions: 0, patch: "diff" }),
				}),
				specReaderFactory: () => ({
					readSpec: async () => Ok({ text: "spec", missing: false }),
				}),
			}),
		);
		expect(result.ok).toBe(true);
		expect(result.data.slice_label).toBe("M01-S01");
	});

	it("fails when slice is not closed", async () => {
		setConfigEnabled(true);
		setModelJudgeEnabled(true);
		const result = JSON.parse(
			await routingJudgePrepareCmd(["--slice", "M01-S01"], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "executing",
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("fails for missing required flag", async () => {
		const result = JSON.parse(await routingJudgePrepareCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});

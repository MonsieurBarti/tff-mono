import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { routingJudgeRecordCmd } from "../../../../src/cli/commands/routing-judge-record.cmd.js";

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

const { getWritten, setWritten } = vi.hoisted(() => {
	let _written: unknown[] = [];
	return {
		getWritten: () => _written,
		setWritten: (v: unknown[]) => {
			_written = v;
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
			return [{ decision_id: "d1", slice_id: "M01-S01", workflow_id: "tff:ship" }];
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

vi.mock("../../../../src/infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js", () => ({
	JsonlRoutingOutcomeWriter: class {
		async append(outcome: unknown) {
			getWritten().push(outcome);
		}
	},
}));

describe("routing:judge-record", () => {
	beforeEach(() => {
		setConfigEnabled(false);
		setModelJudgeEnabled(false);
		setWritten([]);
	});

	it("returns skipped when routing is disabled", async () => {
		const result = JSON.parse(
			await routingJudgeRecordCmd(["--slice", "M01-S01", "--verdicts-json", '{"verdicts":[]}'], {
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
			await routingJudgeRecordCmd(["--slice", "M01-S01", "--verdicts-json", '{"verdicts":[]}'], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "closed",
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("records verdicts for a closed slice", async () => {
		setConfigEnabled(true);
		setModelJudgeEnabled(true);
		const verdictsJson = JSON.stringify({
			verdicts: [
				{
					decision_id: "d1",
					dimension: "tier",
					verdict: "too-low",
					reason: "needed opus",
				},
			],
		});
		const result = JSON.parse(
			await routingJudgeRecordCmd(["--slice", "M01-S01", "--verdicts-json", verdictsJson], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "closed",
				clearPendingJudgment: () => {},
			}),
		);
		expect(result.ok).toBe(true);
		expect(result.data.outcomes_emitted).toBe(1);
		expect(getWritten().length).toBe(1);
	});

	it("fails when slice is not closed", async () => {
		setConfigEnabled(true);
		setModelJudgeEnabled(true);
		const result = JSON.parse(
			await routingJudgeRecordCmd(["--slice", "M01-S01", "--verdicts-json", '{"verdicts":[]}'], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "executing",
				clearPendingJudgment: () => {},
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("fails when no verdicts source provided", async () => {
		setConfigEnabled(true);
		setModelJudgeEnabled(true);
		const result = JSON.parse(
			await routingJudgeRecordCmd(["--slice", "M01-S01"], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "closed",
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("fails for invalid verdicts json", async () => {
		setConfigEnabled(true);
		setModelJudgeEnabled(true);
		const result = JSON.parse(
			await routingJudgeRecordCmd(["--slice", "M01-S01", "--verdicts-json", "not-json"], {
				sliceLabelLookup: async () => "M01-S01",
				sliceStatusLookup: async () => "closed",
			}),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("fails for missing required flag", async () => {
		const result = JSON.parse(await routingJudgeRecordCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});

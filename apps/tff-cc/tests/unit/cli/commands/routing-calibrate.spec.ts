import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { routingCalibrateCmd } from "../../../../src/cli/commands/routing-calibrate.cmd.js";

const { getConfigEnabled, setConfigEnabled } = vi.hoisted(() => {
	let _enabled = false;
	return {
		getConfigEnabled: () => _enabled,
		setConfigEnabled: (v: boolean) => {
			_enabled = v;
		},
	};
});

const { getDecisions, setDecisions } = vi.hoisted(() => {
	let _decisions: unknown[] = [];
	return {
		getDecisions: () => _decisions,
		setDecisions: (v: unknown[]) => {
			_decisions = v;
		},
	};
});

const { getReport, setReport } = vi.hoisted(() => {
	let _report: string = "";
	return {
		getReport: () => _report,
		setReport: (v: string) => {
			_report = v;
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
					model_judge: { enabled: true },
				},
			});
		}
	},
}));

vi.mock("../../../../src/infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js", () => ({
	JsonlRoutingDecisionReader: class {
		async readDecisions() {
			return getDecisions();
		}
		async readKnownDecisions() {
			return [];
		}
		async readDebugEvents() {
			return [];
		}
	},
}));

vi.mock("../../../../src/infrastructure/adapters/jsonl/debug-join-outcome-source.js", () => ({
	DebugJoinOutcomeSource: class {
		async *readOutcomes() {
			yield* [];
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
		async append() {}
	},
}));

vi.mock("../../../../src/infrastructure/adapters/markdown/calibration-report-renderer.js", () => ({
	renderCalibrationReport: () => getReport(),
}));

vi.mock("node:fs/promises", () => ({
	mkdir: vi.fn(async () => {}),
	writeFile: vi.fn(async () => {}),
}));

describe("routing:calibrate", () => {
	beforeEach(() => {
		setConfigEnabled(false);
		setDecisions([]);
		setReport("# Calibration Report");
	});

	it("returns skipped when routing is disabled", async () => {
		const result = JSON.parse(await routingCalibrateCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.skipped).toBe(true);
		expect(result.data.reason).toBe("routing_disabled");
	});

	it("produces a calibration report when routing enabled", async () => {
		setConfigEnabled(true);
		setDecisions([
			{
				decisionId: "d1",
				sliceId: "M01-S01",
				workflowId: "tff:ship",
				agent: "agent-a",
				tier: "sonnet",
				confidence: 0.8,
				signals: { complexity: "medium", risk: { level: "low", tags: [] } },
			},
		]);
		const result = JSON.parse(await routingCalibrateCmd([]));
		expect(result.ok).toBe(true);
		expect(result.data.cells_evaluated).toBeDefined();
		expect(result.data.report_path).toBeDefined();
	});

	it("accepts --n-min override", async () => {
		setConfigEnabled(true);
		setDecisions([
			{
				decisionId: "d1",
				sliceId: "M01-S01",
				workflowId: "tff:ship",
				agent: "agent-a",
				tier: "sonnet",
				confidence: 0.8,
				signals: { complexity: "medium", risk: { level: "low", tags: [] } },
			},
		]);
		const result = JSON.parse(await routingCalibrateCmd(["--n-min", "1"]));
		expect(result.ok).toBe(true);
	});
});

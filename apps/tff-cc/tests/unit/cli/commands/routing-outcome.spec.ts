import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ok } from "@tff/core";
import { routingOutcomeCmd } from "../../../../src/cli/commands/routing-outcome.cmd.js";

const { getConfigEnabled, setConfigEnabled } = vi.hoisted(() => {
	let _enabled = false;
	return {
		getConfigEnabled: () => _enabled,
		setConfigEnabled: (v: boolean) => {
			_enabled = v;
		},
	};
});

const { getKnownDecisions, setKnownDecisions } = vi.hoisted(() => {
	let _decisions: Array<{ decision_id: string; slice_id: string; workflow_id: string }> = [];
	return {
		getKnownDecisions: () => _decisions,
		setKnownDecisions: (
			v: Array<{ decision_id: string; slice_id: string; workflow_id: string }>,
		) => {
			_decisions = v;
		},
	};
});

const { getAppended, setAppended } = vi.hoisted(() => {
	let _appended: unknown[] = [];
	return {
		getAppended: () => _appended,
		setAppended: (v: unknown[]) => {
			_appended = v;
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
			});
		}
	},
}));

vi.mock("../../../../src/infrastructure/adapters/jsonl/jsonl-routing-decision-reader.js", () => ({
	JsonlRoutingDecisionReader: class {
		async readKnownDecisions() {
			return getKnownDecisions();
		}
	},
}));

vi.mock("../../../../src/infrastructure/adapters/jsonl/routing-outcome-jsonl-writer.js", () => ({
	JsonlRoutingOutcomeWriter: class {
		async append(outcome: unknown) {
			getAppended().push(outcome);
		}
	},
}));

describe("routing:outcome", () => {
	beforeEach(() => {
		setConfigEnabled(false);
		setKnownDecisions([]);
		setAppended([]);
	});

	it("returns skipped when routing is disabled", async () => {
		const result = JSON.parse(
			await routingOutcomeCmd([
				"--decision",
				"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				"--dimension",
				"tier",
				"--verdict",
				"too-low",
			]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.skipped).toBe(true);
		expect(result.data.reason).toBe("routing_disabled");
	});

	it("records an outcome for a known decision", async () => {
		setConfigEnabled(true);
		setKnownDecisions([
			{
				decision_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				slice_id: "M01-S01",
				workflow_id: "tff:ship",
			},
		]);
		const result = JSON.parse(
			await routingOutcomeCmd([
				"--decision",
				"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				"--dimension",
				"tier",
				"--verdict",
				"too-low",
				"--reason",
				"needed opus",
			]),
		);
		expect(result.ok).toBe(true);
		expect(result.data.outcome_id).toBeDefined();
		expect(getAppended().length).toBe(1);
	});

	it("fails for unknown decision_id", async () => {
		setConfigEnabled(true);
		const result = JSON.parse(
			await routingOutcomeCmd([
				"--decision",
				"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				"--dimension",
				"tier",
				"--verdict",
				"too-low",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PRECONDITION_VIOLATION");
	});

	it("fails for invalid decision uuid format", async () => {
		const result = JSON.parse(
			await routingOutcomeCmd([
				"--decision",
				"not-a-uuid",
				"--dimension",
				"tier",
				"--verdict",
				"too-low",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("PATTERN_MISMATCH");
	});

	it("fails for invalid dimension enum", async () => {
		const result = JSON.parse(
			await routingOutcomeCmd([
				"--decision",
				"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				"--dimension",
				"cost",
				"--verdict",
				"too-low",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});

	it("fails for invalid verdict enum", async () => {
		const result = JSON.parse(
			await routingOutcomeCmd([
				"--decision",
				"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				"--dimension",
				"tier",
				"--verdict",
				"maybe",
			]),
		);
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("INVALID_ENUM_VALUE");
	});

	it("fails when missing required flags", async () => {
		const result = JSON.parse(await routingOutcomeCmd([]));
		expect(result.ok).toBe(false);
		expect(result.error.code).toBe("MISSING_REQUIRED_FLAG");
	});
});

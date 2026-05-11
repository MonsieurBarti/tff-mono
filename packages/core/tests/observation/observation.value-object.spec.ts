import { describe, it, expect } from "vitest";
import {
	Observation,
	type ObservationProps,
} from "../../src/domain/observation/observation.value-object.js";

describe("Observation", () => {
	const baseProps: ObservationProps = {
		ts: "2024-01-01T00:00:00Z",
		session: "session-1",
		tool: "git-status",
		args: "--short",
		project: "my-project",
	};

	describe("create", () => {
		it("returns an Observation for valid props", () => {
			const obs = Observation.create(baseProps);
			expect(obs.ts).toBe(baseProps.ts);
			expect(obs.session).toBe(baseProps.session);
			expect(obs.tool).toBe(baseProps.tool);
			expect(obs.args).toBe(baseProps.args);
			expect(obs.project).toBe(baseProps.project);
		});

		it("throws when tool is empty string", () => {
			expect(() => Observation.create({ ...baseProps, tool: "" })).toThrow(
				"Observation tool cannot be empty",
			);
		});

		it("handles null args", () => {
			const obs = Observation.create({ ...baseProps, args: null });
			expect(obs.args).toBeNull();
		});
	});

	describe("getters", () => {
		it("returns correct values for all props", () => {
			const obs = Observation.create(baseProps);
			expect(obs.ts).toBe("2024-01-01T00:00:00Z");
			expect(obs.session).toBe("session-1");
			expect(obs.tool).toBe("git-status");
			expect(obs.args).toBe("--short");
			expect(obs.project).toBe("my-project");
		});
	});

	describe("equals", () => {
		it("returns true for identical observations", () => {
			const a = Observation.create(baseProps);
			const b = Observation.create(baseProps);
			expect(a.equals(b)).toBe(true);
		});

		it("returns false for different ts", () => {
			const a = Observation.create(baseProps);
			const b = Observation.create({ ...baseProps, ts: "2024-01-02T00:00:00Z" });
			expect(a.equals(b)).toBe(false);
		});

		it("returns false for different session", () => {
			const a = Observation.create(baseProps);
			const b = Observation.create({ ...baseProps, session: "session-2" });
			expect(a.equals(b)).toBe(false);
		});

		it("returns false for different tool", () => {
			const a = Observation.create(baseProps);
			const b = Observation.create({ ...baseProps, tool: "other-tool" });
			expect(a.equals(b)).toBe(false);
		});

		it("returns false for different args", () => {
			const a = Observation.create(baseProps);
			const b = Observation.create({ ...baseProps, args: "--long" });
			expect(a.equals(b)).toBe(false);
		});

		it("returns false when one args is null and other is not", () => {
			const a = Observation.create(baseProps);
			const b = Observation.create({ ...baseProps, args: null });
			expect(a.equals(b)).toBe(false);
		});

		it("returns false for different project", () => {
			const a = Observation.create(baseProps);
			const b = Observation.create({ ...baseProps, project: "other-project" });
			expect(a.equals(b)).toBe(false);
		});
	});

	describe("props", () => {
		it("returns a copy of the underlying props", () => {
			const obs = Observation.create(baseProps);
			const props = obs.props;
			expect(props).toEqual(baseProps);
			props.tool = "mutated";
			expect(obs.tool).toBe("git-status");
		});
	});
});

import { describe, it, expect } from "vitest";
import { ProjectBuilder } from "./project-builder.js";
import { MilestoneBuilder } from "./milestone-builder.js";
import { SliceBuilder } from "./slice-builder.js";
import { TaskBuilder } from "./task-builder.js";
import { ReviewBuilder } from "./review-builder.js";

describe("Domain Test Builders", () => {
	describe("ProjectBuilder", () => {
		it("builds with defaults", () => {
			const result = new ProjectBuilder().build();
			expect(result.name).toBe("Test Project");
			expect(result.vision).toBe("A vision");
		});

		it("builds with overrides", () => {
			const result = new ProjectBuilder().withName("Custom").withVision("Custom vision").build();
			expect(result.name).toBe("Custom");
			expect(result.vision).toBe("Custom vision");
		});
	});

	describe("MilestoneBuilder", () => {
		it("builds with defaults", () => {
			const result = new MilestoneBuilder().build();
			expect(result.number).toBe(1);
			expect(result.name).toBe("Milestone 1");
			expect(result.branch).toBe("milestone/abc12345");
			expect(result.projectId).toBeDefined();
		});

		it("builds with overrides", () => {
			const result = new MilestoneBuilder()
				.withProjectId("proj-1")
				.withNumber(2)
				.withName("M2")
				.withBranch("milestone/xyz")
				.build();
			expect(result.projectId).toBe("proj-1");
			expect(result.number).toBe(2);
			expect(result.name).toBe("M2");
			expect(result.branch).toBe("milestone/xyz");
		});
	});

	describe("SliceBuilder", () => {
		it("builds with defaults", () => {
			const result = new SliceBuilder().build();
			expect(result.kind).toBe("milestone");
			expect(result.number).toBe(1);
			expect(result.title).toBe("Test Slice");
			expect(result.baseBranch).toBe("main");
			expect(result.milestoneId).toBeDefined();
		});

		it("builds with overrides", () => {
			const result = new SliceBuilder()
				.withMilestoneId("ms-1")
				.withKind("quick")
				.withNumber(3)
				.withTitle("Quick Slice")
				.withBaseBranch("dev")
				.build();
			expect(result.milestoneId).toBe("ms-1");
			expect(result.kind).toBe("quick");
			expect(result.number).toBe(3);
			expect(result.title).toBe("Quick Slice");
			expect(result.baseBranch).toBe("dev");
		});
	});

	describe("TaskBuilder", () => {
		it("builds with defaults", () => {
			const result = new TaskBuilder().build();
			expect(result.number).toBe(1);
			expect(result.title).toBe("Test Task");
			expect(result.wave).toBeNull();
			expect(result.difficulty).toBeNull();
			expect(result.sliceId).toBeDefined();
		});

		it("builds with overrides", () => {
			const result = new TaskBuilder()
				.withSliceId("sl-1")
				.withNumber(2)
				.withTitle("T2")
				.withWave(1)
				.withDifficulty(3)
				.build();
			expect(result.sliceId).toBe("sl-1");
			expect(result.number).toBe(2);
			expect(result.title).toBe("T2");
			expect(result.wave).toBe(1);
			expect(result.difficulty).toBe(3);
		});
	});

	describe("ReviewBuilder", () => {
		it("builds with defaults", () => {
			const result = new ReviewBuilder().build();
			expect(result.type).toBe("code");
			expect(result.reviewer).toBe("agent");
			expect(result.commitSha).toBeNull();
			expect(result.notes).toBeNull();
			expect(result.sliceId).toBeDefined();
		});

		it("builds with overrides", () => {
			const result = new ReviewBuilder()
				.withSliceId("sl-1")
				.withType("security")
				.withReviewer("human")
				.withCommitSha("abc123")
				.withNotes("lgtm")
				.build();
			expect(result.sliceId).toBe("sl-1");
			expect(result.type).toBe("security");
			expect(result.reviewer).toBe("human");
			expect(result.commitSha).toBe("abc123");
			expect(result.notes).toBe("lgtm");
		});
	});
});

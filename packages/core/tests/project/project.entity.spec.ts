import { describe, it, expect } from "vitest";
import { Project } from "../../src/domain/project/project.entity.js";
import { ProjectCreatedEvent } from "../../src/domain/project/project-created.event.js";
import { ProjectVisionUpdatedEvent } from "../../src/domain/project/project-vision-updated.event.js";
import { ProjectNameUpdatedEvent } from "../../src/domain/project/project-name-updated.event.js";
import { ProjectExistsError } from "../../src/domain/project/project.error.js";
import { ProjectRepository } from "../../src/domain/project/project.repository.js";

describe("Project aggregate root", () => {
	describe("createNew", () => {
		it("creates a project with id 'singleton'", () => {
			const project = Project.createNew({ name: "My Project", vision: "Build something great" });
			expect(project.id).toBe("singleton");
		});

		it("creates a project with the given name and vision", () => {
			const project = Project.createNew({ name: "My Project", vision: "Build something great" });
			expect(project.name).toBe("My Project");
			expect(project.vision).toBe("Build something great");
		});

		it("sets createdAt and updatedAt to the current time", () => {
			const before = new Date();
			const project = Project.createNew({ name: "My Project", vision: "Build something great" });
			const after = new Date();
			expect(project.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(project.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
			expect(project.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(project.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("emits a ProjectCreatedEvent", () => {
			const project = Project.createNew({ name: "My Project", vision: "Build something great" });
			const events = project.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(ProjectCreatedEvent);
			expect(events[0].eventName).toBe("project.created");
			expect(events[0].payload).toEqual({ projectId: "singleton", name: "My Project" });
		});

		it("throws for an empty name", () => {
			expect(() => Project.createNew({ name: "", vision: "Build something great" })).toThrow();
		});

		it("throws for an empty vision", () => {
			expect(() => Project.createNew({ name: "My Project", vision: "" })).toThrow();
		});
	});

	describe("reconstruct", () => {
		it("reconstructs a project from state", () => {
			const state = {
				id: "singleton",
				name: "My Project",
				vision: "Build something great",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
			};
			const project = Project.reconstruct(state);
			expect(project.id).toBe("singleton");
			expect(project.name).toBe("My Project");
			expect(project.vision).toBe("Build something great");
			expect(project.createdAt).toEqual(new Date("2024-01-01"));
			expect(project.updatedAt).toEqual(new Date("2024-01-02"));
		});

		it("does not emit events on reconstruct", () => {
			const state = {
				id: "singleton",
				name: "My Project",
				vision: "Build something great",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
			};
			const project = Project.reconstruct(state);
			expect(project.pullEvents()).toHaveLength(0);
		});
	});

	describe("updateVision", () => {
		it("updates the vision", () => {
			const project = Project.createNew({ name: "My Project", vision: "Old vision" });
			project.pullEvents();
			project.updateVision("New vision");
			expect(project.vision).toBe("New vision");
		});

		it("emits a ProjectVisionUpdatedEvent", () => {
			const project = Project.createNew({ name: "My Project", vision: "Old vision" });
			project.pullEvents();
			project.updateVision("New vision");
			const events = project.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(ProjectVisionUpdatedEvent);
			expect(events[0].eventName).toBe("project.vision.updated");
			expect(events[0].payload).toEqual({
				projectId: "singleton",
				oldVision: "Old vision",
				newVision: "New vision",
			});
		});

		it("throws for an empty vision", () => {
			const project = Project.createNew({ name: "My Project", vision: "Old vision" });
			expect(() => project.updateVision("")).toThrow();
		});
	});

	describe("updateName", () => {
		it("updates the name", () => {
			const project = Project.createNew({ name: "Old Name", vision: "Build something great" });
			project.pullEvents();
			project.updateName("New Name");
			expect(project.name).toBe("New Name");
		});

		it("emits a ProjectNameUpdatedEvent", () => {
			const project = Project.createNew({ name: "Old Name", vision: "Build something great" });
			project.pullEvents();
			project.updateName("New Name");
			const events = project.pullEvents();
			expect(events).toHaveLength(1);
			expect(events[0]).toBeInstanceOf(ProjectNameUpdatedEvent);
			expect(events[0].eventName).toBe("project.name.updated");
			expect(events[0].payload).toEqual({
				projectId: "singleton",
				oldName: "Old Name",
				newName: "New Name",
			});
		});

		it("throws for an empty name", () => {
			const project = Project.createNew({ name: "Old Name", vision: "Build something great" });
			expect(() => project.updateName("")).toThrow();
		});
	});

	describe("updatedAt", () => {
		it("is updated on updateVision", () => {
			const project = Project.createNew({ name: "My Project", vision: "Old vision" });
			const before = new Date();
			project.pullEvents();
			project.updateVision("New vision");
			const after = new Date();
			expect(project.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(project.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});

		it("is updated on updateName", () => {
			const project = Project.createNew({ name: "Old Name", vision: "Build something great" });
			const before = new Date();
			project.pullEvents();
			project.updateName("New Name");
			const after = new Date();
			expect(project.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(project.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});
});

describe("ProjectCreatedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = ProjectCreatedEvent.create({ projectId: "singleton", name: "My Project" });
		expect(event.eventName).toBe("project.created");
		expect(event.payload).toEqual({ projectId: "singleton", name: "My Project" });
	});
});

describe("ProjectVisionUpdatedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = ProjectVisionUpdatedEvent.create({
			projectId: "singleton",
			oldVision: "Old",
			newVision: "New",
		});
		expect(event.eventName).toBe("project.vision.updated");
		expect(event.payload).toEqual({ projectId: "singleton", oldVision: "Old", newVision: "New" });
	});
});

describe("ProjectNameUpdatedEvent", () => {
	it("has the correct eventName and payload", () => {
		const event = ProjectNameUpdatedEvent.create({
			projectId: "singleton",
			oldName: "Old",
			newName: "New",
		});
		expect(event.eventName).toBe("project.name.updated");
		expect(event.payload).toEqual({ projectId: "singleton", oldName: "Old", newName: "New" });
	});
});

describe("ProjectExistsError", () => {
	it("has the correct label and status", () => {
		const error = new ProjectExistsError("singleton");
		expect(error.errorLabel).toBe("PROJECT_EXISTS");
		expect(error.status).toBe(409);
		expect(error.context).toEqual({ projectId: "singleton" });
	});
});

describe("ProjectRepository", () => {
	it("is an abstract class extending RepositoryPort", () => {
		expect(typeof ProjectRepository).toBe("function");
		expect(Object.getPrototypeOf(ProjectRepository).name).toBe("RepositoryPort");
	});
});

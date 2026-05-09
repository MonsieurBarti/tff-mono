import { describe, it, expect } from "vitest";
import { RealDateProvider, FakeDateProvider } from "../../src/domain/shared/date-provider.js";

describe("IDateProvider", () => {
	it("RealDateProvider returns the current date", () => {
		const provider = new RealDateProvider();
		const before = new Date();
		const now = provider.now();
		const after = new Date();
		expect(now).toBeInstanceOf(Date);
		expect(now.getTime()).toBeGreaterThanOrEqual(before.getTime());
		expect(now.getTime()).toBeLessThanOrEqual(after.getTime());
	});

	it("FakeDateProvider returns a fixed date", () => {
		const fixed = new Date("2024-01-01T00:00:00Z");
		const provider = new FakeDateProvider(fixed);
		expect(provider.now()).toBe(fixed);
	});

	it("FakeDateProvider can update the fixed date", () => {
		const provider = new FakeDateProvider(new Date("2024-01-01T00:00:00Z"));
		const newDate = new Date("2024-06-15T12:30:00Z");
		provider.setDate(newDate);
		expect(provider.now()).toBe(newDate);
	});
});

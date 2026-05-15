import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..", "..", "..");

/**
 * Lightweight regex-based extraction of interface property names from a
 * TypeScript source file. Not a full parser — sufficient for the simple
 * interface declarations used in this codebase.
 */
function extractInterfaceProps(source: string, interfaceName: string): string[] {
	const pattern = new RegExp(`export\\s+interface\\s+${interfaceName}\\s*\\{([^}]+)\\}`, "s");
	const match = pattern.exec(source);
	if (!match || match[1] === undefined) return [];
	const body = match[1];
	const props: string[] = [];
	for (const line of body.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;
		// Match property name before optional marker or type annotation
		const propMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)[?:]/.exec(trimmed);
		if (propMatch && propMatch[1] !== undefined) props.push(propMatch[1]);
	}
	return props;
}

/**
 * Extract properties from a core entity by looking at its `*State` interface.
 */
function extractCoreEntityProps(entityName: string): string[] {
	const file = join(
		repoRoot,
		"packages",
		"core",
		"src",
		"domain",
		entityName,
		`${entityName}.entity.ts`,
	);
	const source = readFileSync(file, "utf-8");
	return extractInterfaceProps(
		source,
		`${entityName.charAt(0).toUpperCase() + entityName.slice(1)}State`,
	);
}

/**
 * Extract properties from a tff-pi DTO interface.
 */
function extractDtoProps(interfaceName: string): string[] {
	const file = join(repoRoot, "apps", "tff-pi", "src", "common", "dto.ts");
	const source = readFileSync(file, "utf-8");
	return extractInterfaceProps(source, interfaceName);
}

describe("schema parity", () => {
	it("task dto covers all core task state fields", () => {
		const core = new Set(extractCoreEntityProps("task"));
		const dto = new Set(extractDtoProps("Task"));
		const missing = [...core].filter((p) => !dto.has(p));
		expect(missing).toEqual([]);
	});

	it("slice dto covers all core slice state fields", () => {
		const core = new Set(extractCoreEntityProps("slice"));
		const dto = new Set(extractDtoProps("Slice"));
		const missing = [...core].filter((p) => !dto.has(p));
		expect(missing).toEqual([]);
	});

	it("milestone dto covers all core milestone state fields", () => {
		const core = new Set(extractCoreEntityProps("milestone"));
		const dto = new Set(extractDtoProps("Milestone"));
		const missing = [...core].filter((p) => !dto.has(p));
		expect(missing).toEqual([]);
	});

	it("project dto covers all core project state fields", () => {
		const core = new Set(extractCoreEntityProps("project"));
		const dto = new Set(extractDtoProps("Project"));
		const missing = [...core].filter((p) => !dto.has(p));
		expect(missing).toEqual([]);
	});
});

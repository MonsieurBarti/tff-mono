import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	root: __dirname,
	test: {
		globals: true,
		environment: "node",
		pool: "forks",
		include: ["tests/**/*.spec.ts"],
		exclude: ["node_modules", "dist"],
		setupFiles: ["tests/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules", "dist", "tests/**/*.spec.ts"],
			lines: 80,
			functions: 80,
			branches: 80,
			statements: 80,
		},
	},
});

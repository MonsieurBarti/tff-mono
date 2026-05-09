module.exports = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"type-enum": [
			2,
			"always",
			[
				"feat",
				"fix",
				"docs",
				"style",
				"refactor",
				"perf",
				"test",
				"build",
				"ci",
				"chore",
				"revert",
			],
		],
		"subject-case": [2, "always", "lower-case"],
	},
	ignores: [
		// S01 squash-merge commit on milestone branch predates strict lower-case rule
		(commit) => commit.includes("root scaffold (pnpm workspace + Turbo + base TS + lefthook)"),
	],
};

export interface TransitionViolation {
	code: string;
	from: string;
	to: string;
	expected: readonly string[];
}

export type TransitionResult = { ok: true } | { ok: false; violation: TransitionViolation };

export function validateTransition(
	from: string,
	to: string,
	table: Record<string, readonly string[]>,
): TransitionResult {
	const allowed = table[from] ?? [];
	if (allowed.includes(to)) {
		return { ok: true };
	}
	return {
		ok: false,
		violation: {
			code: "INVALID_TRANSITION",
			from,
			to,
			expected: allowed,
		},
	};
}

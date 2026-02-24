export function extractCustomCategoryFilters(
	url: URL,
	allowedKeys: string[]
): Record<string, string[]> {
	const custom: Record<string, string[]> = {};
	const allowed = new Set(allowedKeys);

	if (allowed.size === 0) {
		return custom;
	}

	for (const key of url.searchParams.keys()) {
		if (!allowed.has(key)) continue;
		const values = url.searchParams.getAll(key).filter(Boolean);
		if (values.length > 0) {
			custom[key] = values;
		}
	}

	return custom;
}

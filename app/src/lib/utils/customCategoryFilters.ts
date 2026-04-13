export function extractCustomCategoryFilters(
	url: URL,
	allowedKeys: string[]
): Record<string, string[]> {
	return extractCustomCategoryFiltersFromParams(url.searchParams, allowedKeys);
}

export function extractCustomCategoryFiltersFromParams(
	params: URLSearchParams,
	allowedKeys: string[]
): Record<string, string[]> {
	const custom: Record<string, string[]> = {};
	const allowed = new Set(allowedKeys);

	if (allowed.size === 0) {
		return custom;
	}

	for (const key of params.keys()) {
		if (!allowed.has(key)) continue;
		const values = params.getAll(key).filter(Boolean);
		if (values.length > 0) {
			custom[key] = values;
		}
	}

	return custom;
}

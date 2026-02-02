const KNOWN_FILTER_KEYS = new Set([
	'assignee',
	'indicatorCategory',
	'indicatorType',
	'included',
	'member',
	'organization',
	'organizationalUnit',
	'programType',
	'relationType',
	'related-to',
	'sort',
	'taskCategory',
	'template',
	'terms',
	'type',
	'programTypes'
]);

export function extractCustomCategoryFilters(url: URL): Record<string, string[]> {
	const custom: Record<string, string[]> = {};

	for (const key of url.searchParams.keys()) {
		if (KNOWN_FILTER_KEYS.has(key)) continue;
		const values = url.searchParams.getAll(key).filter(Boolean);
		if (values.length > 0) {
			custom[key] = values;
		}
	}

	return custom;
}

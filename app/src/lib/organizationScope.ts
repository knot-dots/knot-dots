export const organizationScopeFilterKeys = ['organization', 'organizationalUnit'] as const;

export type CollectionFilter = Record<string, string[] | 'current'>;

export type OrganizationScope =
	| { type: 'current'; includeSubordinateOrganizationalUnits: boolean }
	| { type: 'explicit'; organizations: string[]; organizationalUnits: string[] };

export function defaultOrganizationScope(): OrganizationScope {
	return { type: 'current', includeSubordinateOrganizationalUnits: true };
}

function asArray(value: string[] | 'current' | undefined): string[] {
	return Array.isArray(value) ? value : [];
}

// The empty string is the sentinel for content without an organizational
// unit, i.e. organization-level content. It shares the encoding with the
// organizationalUnit query param.
export function parseOrganizationScope(filter: CollectionFilter): OrganizationScope {
	if (filter.organization === 'current') {
		return {
			type: 'current',
			includeSubordinateOrganizationalUnits: !asArray(filter.organizationalUnit).includes('')
		};
	}

	const organizations = asArray(filter.organization);
	const organizationalUnits = asArray(filter.organizationalUnit).filter((value) => value !== '');

	if (organizations.length === 0 && organizationalUnits.length === 0) {
		return defaultOrganizationScope();
	}

	return { type: 'explicit', organizations, organizationalUnits };
}

export function organizationScopeAsFilter(scope: OrganizationScope): CollectionFilter {
	if (scope.type === 'current') {
		return {
			organization: 'current',
			organizationalUnit: scope.includeSubordinateOrganizationalUnits ? [] : ['']
		};
	}

	return {
		organization: [...scope.organizations],
		organizationalUnit: [...scope.organizationalUnits]
	};
}

export function hasConfiguredFilter(filter: CollectionFilter): boolean {
	return Object.values(filter).some((value) => value === 'current' || value.length > 0);
}

export function resolveOrganizationScope(
	filter: CollectionFilter,
	context: { currentOrganization: { guid: string } }
): Array<[string, string]> {
	const scope = parseOrganizationScope(filter);

	if (scope.type === 'current') {
		return [
			['organization', context.currentOrganization.guid],
			...(scope.includeSubordinateOrganizationalUnits
				? []
				: [['organizationalUnit', ''] as [string, string]])
		];
	}

	return [
		...scope.organizations.map((guid): [string, string] => ['organization', guid]),
		...scope.organizationalUnits.map((guid): [string, string] => ['organizationalUnit', guid])
	];
}

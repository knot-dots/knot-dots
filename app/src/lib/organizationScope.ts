export const organizationScopeFilterKeys = [
	'organization',
	'organizationalUnit',
	'organizationalUnitWithChildren'
] as const;

export type CollectionFilter = Record<string, string[] | 'current' | null>;

export type OrganizationScope =
	| { type: 'current'; includeSubordinateOrganizationalUnits: boolean }
	| {
			type: 'explicit';
			organizations: string[];
			organizationalUnits: string[];
			organizationsWithSubordinates: string[];
	  };

export interface OrganizationScopeContext {
	currentOrganization: { guid: string };
	currentOrganizationalUnit?: { guid: string } | null;
	organizationalUnits: Array<{ guid: string; organization: string }>;
}

export function defaultOrganizationScope(): OrganizationScope {
	return { type: 'current', includeSubordinateOrganizationalUnits: true };
}

function asArray(value: string[] | 'current' | null | undefined): string[] {
	return Array.isArray(value) ? value : [];
}

export function parseOrganizationScope(filter: CollectionFilter): OrganizationScope {
	if (filter.organization === 'current') {
		return {
			type: 'current',
			includeSubordinateOrganizationalUnits: filter.organizationalUnit !== 'current'
		};
	}

	const organizations = asArray(filter.organization);
	const organizationalUnits = asArray(filter.organizationalUnit);
	const organizationsWithSubordinates = asArray(filter.organizationalUnitWithChildren);

	// Filters written before the scope selector existed carry organization
	// values without an organizationalUnit key. They meant "whole organization"
	// including all organizational units.
	if (
		organizations.length > 0 &&
		!Array.isArray(filter.organizationalUnit) &&
		organizationsWithSubordinates.length === 0
	) {
		return {
			type: 'explicit',
			organizations: [],
			organizationalUnits: [],
			organizationsWithSubordinates: organizations
		};
	}

	if (
		organizations.length === 0 &&
		organizationalUnits.length === 0 &&
		organizationsWithSubordinates.length === 0
	) {
		return defaultOrganizationScope();
	}

	return { type: 'explicit', organizations, organizationalUnits, organizationsWithSubordinates };
}

export function organizationScopeAsFilter(scope: OrganizationScope): CollectionFilter {
	if (scope.type === 'current') {
		return scope.includeSubordinateOrganizationalUnits
			? {
					organization: 'current',
					organizationalUnit: [],
					organizationalUnitWithChildren: 'current'
				}
			: {
					organization: 'current',
					organizationalUnit: 'current',
					organizationalUnitWithChildren: []
				};
	}

	return {
		organization: [...scope.organizations],
		organizationalUnit: [...scope.organizationalUnits],
		organizationalUnitWithChildren: [...scope.organizationsWithSubordinates]
	};
}

export function hasExplicitOrganizationScope(filter: CollectionFilter): boolean {
	return (
		asArray(filter.organization).length > 0 ||
		asArray(filter.organizationalUnit).length > 0 ||
		asArray(filter.organizationalUnitWithChildren).length > 0
	);
}

export function hasNonScopeFilter(filter: CollectionFilter): boolean {
	return Object.entries(filter).some(
		([key, value]) =>
			!(organizationScopeFilterKeys as readonly string[]).includes(key) &&
			Array.isArray(value) &&
			value.length > 0
	);
}

export function resolveOrganizationScope(
	filter: CollectionFilter,
	context: OrganizationScopeContext
): Array<[string, string]> {
	const scope = parseOrganizationScope(filter);

	if (scope.type === 'current') {
		const entries: Array<[string, string]> = [['organization', context.currentOrganization.guid]];
		if (scope.includeSubordinateOrganizationalUnits) {
			if (context.currentOrganizationalUnit) {
				entries.push(['organizationalUnitWithChildren', context.currentOrganizationalUnit.guid]);
			}
		} else {
			entries.push(['organizationalUnit', context.currentOrganizationalUnit?.guid ?? '']);
		}
		return entries;
	}

	const organizationalUnitsByGuid = new Map(
		context.organizationalUnits.map((organizationalUnit) => [
			organizationalUnit.guid,
			organizationalUnit
		])
	);
	const organizations = new Set(scope.organizations);
	for (const guid of scope.organizationalUnits) {
		const parent = organizationalUnitsByGuid.get(guid)?.organization;
		if (parent) {
			organizations.add(parent);
		}
	}
	// Entries of organizationsWithSubordinates are organization guids when
	// written by the picker, but the query param equally accepts organizational
	// unit guids, so only map known organizational units to their parent.
	for (const guid of scope.organizationsWithSubordinates) {
		organizations.add(organizationalUnitsByGuid.get(guid)?.organization ?? guid);
	}

	return [
		...[...organizations].map((guid): [string, string] => ['organization', guid]),
		...(scope.organizations.length > 0 || scope.organizationsWithSubordinates.length > 0
			? [['organizationalUnit', ''] as [string, string]]
			: []),
		...scope.organizationalUnits.map((guid): [string, string] => ['organizationalUnit', guid]),
		...scope.organizationsWithSubordinates.map((guid): [string, string] => [
			'organizationalUnitWithChildren',
			guid
		])
	];
}

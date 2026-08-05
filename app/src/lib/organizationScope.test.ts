import { describe, expect, it } from 'vitest';
import {
	defaultOrganizationScope,
	hasExplicitOrganizationScope,
	hasNonScopeFilter,
	type OrganizationScope,
	organizationScopeAsFilter,
	parseOrganizationScope,
	resolveOrganizationScope
} from '$lib/organizationScope';

const org = 'a4f1e0aa-0000-4000-8000-000000000001';
const otherOrg = 'a4f1e0aa-0000-4000-8000-000000000002';
const unit = 'b4f1e0aa-0000-4000-8000-000000000001';
const childUnit = 'b4f1e0aa-0000-4000-8000-000000000002';
const unitOfOtherOrg = 'b4f1e0aa-0000-4000-8000-000000000003';
const unknownUnit = 'b4f1e0aa-0000-4000-8000-000000000009';

const organizationalUnits = [
	{ guid: unit, organization: org },
	{ guid: childUnit, organization: org },
	{ guid: unitOfOtherOrg, organization: otherOrg }
];

const atOrganization = {
	currentOrganization: { guid: org },
	currentOrganizationalUnit: null,
	organizationalUnits
};

const atOrganizationalUnit = {
	currentOrganization: { guid: org },
	currentOrganizationalUnit: { guid: unit },
	organizationalUnits
};

describe('parseOrganizationScope', () => {
	it('parses the default for a filter without scope keys', () => {
		expect(parseOrganizationScope({})).toEqual(defaultOrganizationScope());
	});

	it('parses current scope including subordinate organizational units', () => {
		expect(
			parseOrganizationScope({
				organization: 'current',
				organizationalUnit: [],
				organizationalUnitWithChildren: 'current'
			})
		).toEqual({ type: 'current', includeSubordinateOrganizationalUnits: true });
	});

	it('parses current scope excluding subordinate organizational units', () => {
		expect(
			parseOrganizationScope({
				organization: 'current',
				organizationalUnit: 'current',
				organizationalUnitWithChildren: []
			})
		).toEqual({ type: 'current', includeSubordinateOrganizationalUnits: false });
	});

	it('parses explicit scope from arrays', () => {
		expect(parseOrganizationScope({ organization: [org], organizationalUnit: [unit] })).toEqual({
			type: 'explicit',
			organizations: [org],
			organizationalUnits: [unit]
		});
	});

	it('parses legacy pre-migration filters as explicit scope', () => {
		expect(parseOrganizationScope({ organization: [org] })).toEqual({
			type: 'explicit',
			organizations: [org],
			organizationalUnits: []
		});
	});

	it('treats null like an empty array', () => {
		expect(parseOrganizationScope({ organization: [org], organizationalUnit: null })).toEqual({
			type: 'explicit',
			organizations: [org],
			organizationalUnits: []
		});
	});

	it('collapses explicit scope without any selection to the default', () => {
		expect(parseOrganizationScope({ organization: [], organizationalUnit: [] })).toEqual(
			defaultOrganizationScope()
		);
	});
});

describe('organizationScopeAsFilter', () => {
	const scopes: OrganizationScope[] = [
		defaultOrganizationScope(),
		{ type: 'current', includeSubordinateOrganizationalUnits: false },
		{ type: 'explicit', organizations: [org], organizationalUnits: [unit, childUnit] }
	];

	it.each(scopes)('roundtrips through parseOrganizationScope (%j)', (scope) => {
		expect(parseOrganizationScope(organizationScopeAsFilter(scope))).toEqual(scope);
	});
});

describe('resolveOrganizationScope', () => {
	it('resolves current scope with subordinate units at the organization level', () => {
		expect(
			resolveOrganizationScope(
				organizationScopeAsFilter(defaultOrganizationScope()),
				atOrganization
			)
		).toEqual([['organization', org]]);
	});

	it('resolves current scope with subordinate units on an organizational unit page', () => {
		expect(
			resolveOrganizationScope(
				organizationScopeAsFilter(defaultOrganizationScope()),
				atOrganizationalUnit
			)
		).toEqual([
			['organization', org],
			['organizationalUnitWithChildren', unit]
		]);
	});

	it('resolves current scope without subordinate units at the organization level', () => {
		expect(
			resolveOrganizationScope(
				{
					organization: 'current',
					organizationalUnit: 'current',
					organizationalUnitWithChildren: []
				},
				atOrganization
			)
		).toEqual([
			['organization', org],
			['organizationalUnit', '']
		]);
	});

	it('resolves current scope without subordinate units on an organizational unit page', () => {
		expect(
			resolveOrganizationScope(
				{
					organization: 'current',
					organizationalUnit: 'current',
					organizationalUnitWithChildren: []
				},
				atOrganizationalUnit
			)
		).toEqual([
			['organization', org],
			['organizationalUnit', unit]
		]);
	});

	it('resolves explicit organizations to org-level scope', () => {
		expect(
			resolveOrganizationScope({ organization: [org], organizationalUnit: [] }, atOrganization)
		).toEqual([
			['organization', org],
			['organizationalUnit', '']
		]);
	});

	it('resolves explicit organizational units and derives their parent organizations', () => {
		expect(
			resolveOrganizationScope(
				{ organization: [], organizationalUnit: [unit, unitOfOtherOrg] },
				atOrganization
			)
		).toEqual([
			['organization', org],
			['organization', otherOrg],
			['organizationalUnit', unit],
			['organizationalUnit', unitOfOtherOrg]
		]);
	});

	it('resolves mixed explicit selections', () => {
		expect(
			resolveOrganizationScope(
				{ organization: [otherOrg], organizationalUnit: [unit] },
				atOrganization
			)
		).toEqual([
			['organization', otherOrg],
			['organization', org],
			['organizationalUnit', ''],
			['organizationalUnit', unit]
		]);
	});

	it('skips parent derivation for unknown organizational units', () => {
		expect(
			resolveOrganizationScope(
				{ organization: [org], organizationalUnit: [unknownUnit] },
				atOrganization
			)
		).toEqual([
			['organization', org],
			['organizationalUnit', ''],
			['organizationalUnit', unknownUnit]
		]);
	});
});

describe('scope predicates', () => {
	it('detects explicit scope only for non-empty arrays', () => {
		expect(hasExplicitOrganizationScope({ organization: [org] })).toBe(true);
		expect(hasExplicitOrganizationScope({ organizationalUnit: [unit] })).toBe(true);
		expect(hasExplicitOrganizationScope({ organization: 'current' })).toBe(false);
		expect(hasExplicitOrganizationScope({ organizationalUnit: null })).toBe(false);
		expect(hasExplicitOrganizationScope({})).toBe(false);
	});

	it('detects non-scope filters ignoring scope keys and sentinels', () => {
		expect(hasNonScopeFilter({ status: ['status.in_implementation'] })).toBe(true);
		expect(hasNonScopeFilter({ organization: [org], organizationalUnitWithChildren: [unit] })).toBe(
			false
		);
		expect(hasNonScopeFilter({ topic: [] })).toBe(false);
	});
});

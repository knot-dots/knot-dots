import { describe, expect, it } from 'vitest';
import {
	defaultOrganizationScope,
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

const contextAtOrganizationRoot = {
	currentOrganization: { guid: org },
	currentOrganizationalUnit: null,
	organizationalUnits
};

const contextAtOrganizationalUnit = {
	currentOrganization: { guid: org },
	currentOrganizationalUnit: { guid: unit },
	organizationalUnits
};

const contextAtAdministrativeArea = {
	currentOrganization: { guid: org },
	currentOrganizationalUnit: {
		guid: unit,
		payload: { organizationalUnitType: 'organizational_unit_type.administrative_area' }
	},
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
			organizationalUnits: [unit],
			organizationsWithSubordinates: []
		});
	});

	it('parses whole-organization selections', () => {
		expect(
			parseOrganizationScope({
				organization: [],
				organizationalUnit: [],
				organizationalUnitWithChildren: [org]
			})
		).toEqual({
			type: 'explicit',
			organizations: [],
			organizationalUnits: [],
			organizationsWithSubordinates: [org]
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
		{
			type: 'explicit',
			organizations: [org],
			organizationalUnits: [unit, childUnit],
			organizationsWithSubordinates: []
		},
		{
			type: 'explicit',
			organizations: [],
			organizationalUnits: [],
			organizationsWithSubordinates: [org]
		}
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
				contextAtOrganizationRoot
			)
		).toEqual([['organization', org]]);
	});

	it('resolves current scope with subordinate units on an organizational unit page', () => {
		expect(
			resolveOrganizationScope(
				organizationScopeAsFilter(defaultOrganizationScope()),
				contextAtOrganizationalUnit
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
				contextAtOrganizationRoot
			)
		).toEqual([
			['organization', org],
			['organizationalUnit', '']
		]);
	});

	it('resolves current scope on administrative area pages like the organization level', () => {
		expect(
			resolveOrganizationScope(
				organizationScopeAsFilter(defaultOrganizationScope()),
				contextAtAdministrativeArea
			)
		).toEqual([['organization', org]]);
		expect(
			resolveOrganizationScope(
				{
					organization: 'current',
					organizationalUnit: 'current',
					organizationalUnitWithChildren: []
				},
				contextAtAdministrativeArea
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
				contextAtOrganizationalUnit
			)
		).toEqual([
			['organization', org],
			['organizationalUnit', unit]
		]);
	});

	it('resolves explicit organizations to org-level scope', () => {
		expect(
			resolveOrganizationScope(
				{ organization: [org], organizationalUnit: [] },
				contextAtOrganizationRoot
			)
		).toEqual([
			['organization', org],
			['organizationalUnit', '']
		]);
	});

	it('resolves whole-organization selections to a plain organization constraint', () => {
		expect(
			resolveOrganizationScope(
				{ organization: [], organizationalUnit: [], organizationalUnitWithChildren: [org] },
				contextAtOrganizationRoot
			)
		).toEqual([['organization', org]]);
	});

	it('resolves whole organizations in mixed selections with the unit constraint', () => {
		expect(
			resolveOrganizationScope(
				{
					organization: [otherOrg],
					organizationalUnit: [],
					organizationalUnitWithChildren: [org]
				},
				contextAtOrganizationRoot
			)
		).toEqual([
			['organization', otherOrg],
			['organization', org],
			['organizationalUnit', ''],
			['organizationalUnitWithChildren', org]
		]);
	});

	it('resolves explicit organizational units and derives their parent organizations', () => {
		expect(
			resolveOrganizationScope(
				{ organization: [], organizationalUnit: [unit, unitOfOtherOrg] },
				contextAtOrganizationRoot
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
				contextAtOrganizationRoot
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
				contextAtOrganizationRoot
			)
		).toEqual([
			['organization', org],
			['organizationalUnit', ''],
			['organizationalUnit', unknownUnit]
		]);
	});
});

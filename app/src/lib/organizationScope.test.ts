import { describe, expect, it } from 'vitest';
import {
	defaultOrganizationScope,
	hasConfiguredFilter,
	type OrganizationScope,
	organizationScopeAsFilter,
	parseOrganizationScope,
	resolveOrganizationScope
} from '$lib/organizationScope';

const org = 'a4f1e0aa-0000-4000-8000-000000000001';
const otherOrg = 'a4f1e0aa-0000-4000-8000-000000000002';
const unit = 'b4f1e0aa-0000-4000-8000-000000000001';

const context = { currentOrganization: { guid: org } };

describe('parseOrganizationScope', () => {
	it('parses the default for a filter without scope keys', () => {
		expect(parseOrganizationScope({})).toEqual(defaultOrganizationScope());
	});

	it('parses current scope including subordinate organizational units', () => {
		expect(parseOrganizationScope({ organization: 'current', organizationalUnit: [] })).toEqual({
			type: 'current',
			includeSubordinateOrganizationalUnits: true
		});
	});

	it('parses current scope excluding subordinate organizational units', () => {
		expect(parseOrganizationScope({ organization: 'current', organizationalUnit: [''] })).toEqual({
			type: 'current',
			includeSubordinateOrganizationalUnits: false
		});
	});

	it('parses explicit scope from arrays', () => {
		expect(parseOrganizationScope({ organization: [org], organizationalUnit: [unit] })).toEqual({
			type: 'explicit',
			organizations: [org],
			organizationalUnits: [unit]
		});
	});

	it('parses filters saved before the scope selector existed', () => {
		expect(parseOrganizationScope({ organization: [org] })).toEqual({
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
		{ type: 'explicit', organizations: [org], organizationalUnits: [unit] }
	];

	it.each(scopes)('roundtrips through parseOrganizationScope (%j)', (scope) => {
		expect(parseOrganizationScope(organizationScopeAsFilter(scope))).toEqual(scope);
	});
});

describe('resolveOrganizationScope', () => {
	it('resolves current scope to the whole current organization', () => {
		expect(
			resolveOrganizationScope(organizationScopeAsFilter(defaultOrganizationScope()), context)
		).toEqual([['organization', org]]);
	});

	it('resolves current scope without subordinate units to organization-level content', () => {
		expect(
			resolveOrganizationScope({ organization: 'current', organizationalUnit: [''] }, context)
		).toEqual([
			['organization', org],
			['organizationalUnit', '']
		]);
	});

	it('resolves explicit selections to plain organization and unit constraints', () => {
		expect(
			resolveOrganizationScope(
				{ organization: [org, otherOrg], organizationalUnit: [unit] },
				context
			)
		).toEqual([
			['organization', org],
			['organization', otherOrg],
			['organizationalUnit', unit]
		]);
	});
});

describe('hasConfiguredFilter', () => {
	it('counts the current sentinel and non-empty arrays', () => {
		expect(hasConfiguredFilter({ organization: 'current', organizationalUnit: [] })).toBe(true);
		expect(hasConfiguredFilter({ organization: [org] })).toBe(true);
		expect(hasConfiguredFilter({ status: ['status.in_implementation'] })).toBe(true);
		expect(hasConfiguredFilter({ topic: [] })).toBe(false);
		expect(hasConfiguredFilter({})).toBe(false);
	});
});

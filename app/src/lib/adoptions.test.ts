import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import {
	adoptableOrganizationalUnits,
	adopters,
	adoptionDiff,
	adoptionRelations,
	groupedByOrganization,
	isAdoptableProgram
} from '$lib/adoptions';
import { payloadTypes, predicates, programTypes, visibility } from '$lib/models';
import type { User } from '$lib/stores';

const organization = crypto.randomUUID();
const otherOrganization = crypto.randomUUID();
const owningUnit = crypto.randomUUID();
const siblingUnit = crypto.randomUUID();
const foreignUnit = crypto.randomUUID();
const program = crypto.randomUUID();

const testUser = z.object({
	adminOf: z.array(z.string()).default([]),
	collaboratorOf: z.array(z.string()).default([]),
	familyName: z.string().default('Muster'),
	givenName: z.string().default('Erika'),
	guid: z.string().default(crypto.randomUUID()),
	headOf: z.array(z.string()).default([]),
	isAuthenticated: z.boolean().default(true),
	memberOf: z.array(z.string()).default([]),
	roles: z.array(z.string()).default([]),
	settings: z.object({ features: z.array(z.string()).optional() }).default({})
});

function makeUser(overrides: z.input<typeof testUser> = {}): User {
	return testUser.parse(overrides);
}

function makeProgram(
	payloadOverrides: Record<string, unknown> = {},
	organizational_unit: string | null = null
) {
	return {
		guid: program,
		organization,
		organizational_unit,
		payload: {
			programType: programTypes.enum['program_type.set_of_rules'],
			title: 'Lorem ipsum',
			type: payloadTypes.enum.program,
			visibility: visibility.enum.public,
			...payloadOverrides
		}
	};
}

const units = [
	{ guid: owningUnit, organization },
	{ guid: siblingUnit, organization },
	{ guid: foreignUnit, organization: otherOrganization }
];

describe('isAdoptableProgram', () => {
	test('public rule-set programs are adoptable', () => {
		expect(isAdoptableProgram(makeProgram())).toBe(true);
	});

	test('other payload types are not adoptable', () => {
		expect(isAdoptableProgram(makeProgram({ type: payloadTypes.enum.rule }))).toBe(false);
	});

	test('other program types are not adoptable', () => {
		expect(
			isAdoptableProgram(makeProgram({ programType: programTypes.enum['program_type.strategy'] }))
		).toBe(false);
	});

	test('non-public programs are not adoptable', () => {
		expect(isAdoptableProgram(makeProgram({ visibility: visibility.enum.members }))).toBe(false);
		expect(isAdoptableProgram(makeProgram({ visibility: visibility.enum.organization }))).toBe(
			false
		);
	});
});

describe('adoptableOrganizationalUnits', () => {
	test('anonymous users have no adoptable units', () => {
		expect(
			adoptableOrganizationalUnits(makeUser({ isAuthenticated: false }), makeProgram(), units)
		).toEqual([]);
	});

	test('admins and heads see the units they are responsible for', () => {
		expect(
			adoptableOrganizationalUnits(makeUser({ adminOf: [foreignUnit] }), makeProgram(), units)
		).toEqual([{ guid: foreignUnit, organization: otherOrganization }]);
		expect(
			adoptableOrganizationalUnits(makeUser({ headOf: [foreignUnit] }), makeProgram(), units)
		).toEqual([{ guid: foreignUnit, organization: otherOrganization }]);
	});

	test('organization-level admins see all units of their organization', () => {
		expect(
			adoptableOrganizationalUnits(makeUser({ adminOf: [otherOrganization] }), makeProgram(), units)
		).toEqual([{ guid: foreignUnit, organization: otherOrganization }]);
	});

	test('sibling units of the owning organization are adoptable', () => {
		expect(
			adoptableOrganizationalUnits(
				makeUser({ adminOf: [organization] }),
				makeProgram({}, owningUnit),
				units
			)
		).toEqual([{ guid: siblingUnit, organization }]);
	});

	test('the owning organizational unit is excluded', () => {
		expect(
			adoptableOrganizationalUnits(
				makeUser({ adminOf: [owningUnit] }),
				makeProgram({}, owningUnit),
				units
			)
		).toEqual([]);
	});

	test('organization-level programs are adoptable by every unit', () => {
		expect(
			adoptableOrganizationalUnits(
				makeUser({ adminOf: [organization, otherOrganization] }),
				makeProgram(),
				units
			)
		).toEqual(units);
	});

	test('the sysadmin role alone yields no adoptable units', () => {
		expect(
			adoptableOrganizationalUnits(makeUser({ roles: ['sysadmin'] }), makeProgram(), units)
		).toEqual([]);
	});
});

describe('adopters', () => {
	test('extracts adopter guids from the relations of the container', () => {
		const container = {
			guid: program,
			relation: [
				{
					object: siblingUnit,
					position: 0,
					predicate: predicates.enum['is-adopted-by'],
					subject: program
				},
				{
					object: program,
					position: 0,
					predicate: predicates.enum['is-part-of'],
					subject: crypto.randomUUID()
				},
				{
					object: foreignUnit,
					position: 0,
					predicate: predicates.enum['is-adopted-by'],
					subject: crypto.randomUUID()
				}
			]
		};
		expect(adopters(container)).toEqual([siblingUnit]);
	});
});

describe('adoptionDiff', () => {
	test('computes added and removed guids', () => {
		expect(adoptionDiff([siblingUnit, owningUnit], [siblingUnit, foreignUnit])).toEqual({
			added: [foreignUnit],
			removed: [owningUnit]
		});
	});
});

describe('adoptionRelations', () => {
	test('creates is-adopted-by relations with the program as subject', () => {
		expect(adoptionRelations(program, [siblingUnit])).toEqual([
			{
				object: siblingUnit,
				position: 0,
				predicate: predicates.enum['is-adopted-by'],
				subject: program
			}
		]);
	});

	test('flags relations for deletion on request', () => {
		expect(adoptionRelations(program, [siblingUnit], true)).toEqual([
			{
				deleted: true,
				object: siblingUnit,
				position: 0,
				predicate: predicates.enum['is-adopted-by'],
				subject: program
			}
		]);
	});
});

describe('groupedByOrganization', () => {
	const organizations = [
		{ guid: organization, payload: { name: 'Stadt A' } },
		{ guid: otherOrganization, payload: { name: 'Stadt B' } }
	];

	test('groups units by organization and drops empty groups', () => {
		expect(
			groupedByOrganization([{ guid: foreignUnit, organization: otherOrganization }], organizations)
		).toEqual([
			{
				organization: { guid: otherOrganization, payload: { name: 'Stadt B' } },
				units: [{ guid: foreignUnit, organization: otherOrganization }]
			}
		]);
	});

	test('keeps the order of the organizations', () => {
		expect(
			groupedByOrganization(
				[
					{ guid: foreignUnit, organization: otherOrganization },
					{ guid: siblingUnit, organization }
				],
				organizations
			).map(({ organization: { guid } }) => guid)
		).toEqual([organization, otherOrganization]);
	});
});

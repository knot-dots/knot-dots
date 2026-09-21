import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import {
	organizationalUnitsManagedByUser,
	adopters,
	adopterScope,
	adoptionDiff,
	adoptionRelations,
	groupedByOrganization,
	isAdoptableProgram
} from '$lib/adoptions';
import {
	anyContainer,
	composeUserGrants,
	type Container,
	grantSetForRole,
	memberRoles,
	type OrganizationalUnitPayload,
	type OrganizationPayload,
	payloadTypes,
	predicates,
	type ProgramPayload,
	programTypes,
	type Relation,
	visibility
} from '$lib/models';

const organization = crypto.randomUUID();
const otherOrganization = crypto.randomUUID();
const owningUnit = crypto.randomUUID();
const siblingUnit = crypto.randomUUID();
const foreignUnit = crypto.randomUUID();
const program = crypto.randomUUID();

const testContainer = anyContainer.extend({
	guid: z.uuid().default(() => crypto.randomUUID()),
	managed_by: z.union([z.array(z.uuid()), z.uuid()]).default(organization),
	organization: z.uuid().default(organization),
	organizational_unit: z.uuid().nullable().default(null),
	realm: z.string().max(1024).default('test'),
	revision: z.number().int().positive().default(1),
	valid_currently: z.boolean().default(true),
	valid_from: z.coerce.date().default(() => new Date())
});

function makeProgram(
	payloadOverrides: Partial<ProgramPayload> = {},
	organizational_unit: string | null = null,
	relation: Relation[] = []
) {
	return testContainer.parse({
		guid: program,
		organizational_unit,
		payload: {
			programType: programTypes.enum['program_type.set_of_rules'],
			title: 'Lorem ipsum',
			type: payloadTypes.enum.program,
			visibility: visibility.enum.public,
			...payloadOverrides
		},
		relation
	}) as Container<ProgramPayload>;
}

function makeOrganization(guid: string, payloadOverrides: Partial<OrganizationPayload>) {
	return testContainer.parse({
		guid,
		payload: { name: 'Anytown', type: payloadTypes.enum.organization, ...payloadOverrides }
	}) as Container<OrganizationPayload>;
}

function makeOrganizationalUnit(guid: string, organization: string) {
	return testContainer.parse({
		guid,
		organization,
		payload: {
			name: 'Anytown school administration',
			type: payloadTypes.enum.organizational_unit
		}
	}) as Container<OrganizationalUnitPayload>;
}

const units = [
	makeOrganizationalUnit(owningUnit, organization),
	makeOrganizationalUnit(siblingUnit, organization),
	makeOrganizationalUnit(foreignUnit, otherOrganization)
];

// The units arrive enriched with the request user's grants; `governed` names
// the objects (units or their organizations) whose matrix grants the user the
// create kind — the head role's subordinate set stands in for it.
function enrichedUnits(...governed: string[]) {
	return units.map((unit) => ({
		...unit,
		user_grant: composeUserGrants({
			scopeSourced: true,
			governsItself: false,
			organizationSelf: [],
			organizationalUnitSelf: [],
			source: unit.organization,
			sourceSelf: [],
			sourceSubordinates:
				governed.includes(unit.guid) || governed.includes(unit.organization)
					? grantSetForRole(memberRoles.enum.head).subordinates
					: []
		})
	}));
}

function guids(result: Array<{ guid: string }>) {
	return result.map(({ guid }) => guid);
}

describe('isAdoptableProgram', () => {
	test('public rule-set programs are adoptable', () => {
		expect(isAdoptableProgram(makeProgram())).toBe(true);
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
	test('units without a create grant are not adoptable', () => {
		expect(organizationalUnitsManagedByUser(makeProgram(), units)).toEqual([]);
		expect(organizationalUnitsManagedByUser(makeProgram(), enrichedUnits())).toEqual([]);
	});

	test('admins and heads see the units they are responsible for', () => {
		expect(
			guids(organizationalUnitsManagedByUser(makeProgram(), enrichedUnits(foreignUnit)))
		).toEqual([foreignUnit]);
	});

	test('organization-level admins see all units of their organization', () => {
		expect(
			guids(organizationalUnitsManagedByUser(makeProgram(), enrichedUnits(otherOrganization)))
		).toEqual([foreignUnit]);
	});

	test('sibling units of the owning organization are adoptable', () => {
		expect(
			guids(
				organizationalUnitsManagedByUser(makeProgram({}, owningUnit), enrichedUnits(organization))
			)
		).toEqual([siblingUnit]);
	});

	test('the owning organizational unit is excluded', () => {
		expect(
			organizationalUnitsManagedByUser(makeProgram({}, owningUnit), enrichedUnits(owningUnit))
		).toEqual([]);
	});

	test('organization-level programs are adoptable by every unit', () => {
		expect(
			guids(
				organizationalUnitsManagedByUser(
					makeProgram(),
					enrichedUnits(organization, otherOrganization)
				)
			)
		).toEqual([owningUnit, siblingUnit, foreignUnit]);
	});
});

describe('adopterScope', () => {
	const currentOrganization = makeOrganization(organization, { name: 'City A' });

	test('an organizational unit context covers only that unit', () => {
		expect(
			adopterScope({
				currentOrganization,
				currentOrganizationalUnit: makeOrganizationalUnit(siblingUnit, organization),
				organizationalUnits: units
			})
		).toEqual([siblingUnit]);
	});

	test('an organization context covers the organization and its units', () => {
		expect(
			adopterScope({
				currentOrganization,
				currentOrganizationalUnit: undefined,
				organizationalUnits: units
			})
		).toEqual([organization, owningUnit, siblingUnit]);
	});

	test('an organization without units covers only itself', () => {
		expect(
			adopterScope({
				currentOrganization: makeOrganization(otherOrganization, { name: 'City B' }),
				currentOrganizationalUnit: undefined,
				organizationalUnits: [makeOrganizationalUnit(siblingUnit, organization)]
			})
		).toEqual([otherOrganization]);
	});
});

describe('adopters', () => {
	test('extracts adopter guids from the relations of the container', () => {
		const container = makeProgram({}, null, [
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
			}
		]);
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
		expect(adoptionRelations(program, [siblingUnit], false)).toEqual([
			{
				deleted: false,
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
		makeOrganization(organization, { name: 'City A' }),
		makeOrganization(otherOrganization, { name: 'City B' })
	];

	const organizationalUnit = makeOrganizationalUnit(foreignUnit, otherOrganization);

	test('groups units by organization and drops empty groups', () => {
		expect(groupedByOrganization([organizationalUnit], organizations)).toEqual([
			{
				organization: organizations[1],
				units: [organizationalUnit]
			}
		]);
	});

	test('keeps the order of the organizations', () => {
		expect(
			groupedByOrganization(
				[
					makeOrganizationalUnit(foreignUnit, otherOrganization),
					makeOrganizationalUnit(siblingUnit, organization)
				],
				organizations
			).map(({ organization: { guid } }) => guid)
		).toEqual([organization, otherOrganization]);
	});
});

import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import defineAbilityFor, {
	commonTypes,
	grantKindsForRoleOn,
	grantKindsForRoleOnSubordinates,
	specialTypes
} from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	type MemberRole,
	memberRoles,
	newContainer,
	type PayloadType,
	payloadTypes,
	predicates,
	visibility
} from '$lib/models';
import type { User } from '$lib/stores';

// These tests pin down the current behaviour of the CASL policies with
// plain-object users and containers. They focus on the rules conditioned on
// managed_by: those are the ones affected when the multi-valued
// computed_managed_by eventually replaces the stored managed_by column, so
// they must keep passing unchanged across that switch.

const organization = crypto.randomUUID();
const organizationalUnit = crypto.randomUUID();
const team = crypto.randomUUID();
const otherTeam = crypto.randomUUID();
const userGuid = crypto.randomUUID();
const anotherUserGuid = crypto.randomUUID();

// The session user (User in stores.ts) has no zod schema of its own, so the
// tests define one to derive complete users from partial input via parse.
const testUser = z.object({
	adminOf: z.array(z.string()).default([]),
	collaboratorOf: z.array(z.string()).default([]),
	familyName: z.string().default('Muster'),
	givenName: z.string().default('Erika'),
	guid: z.string().default(userGuid),
	headOf: z.array(z.string()).default([]),
	isAuthenticated: z.boolean().default(true),
	memberOf: z.array(z.string()).default([]),
	roles: z.array(z.string()).default([]),
	settings: z.object({ features: z.array(z.string()).optional() }).default({})
});

// The policies work with NewContainer<AnyInitialPayload>, so newContainer
// (which needs neither guid nor revision) serves as the base for test objects.
const testContainer = newContainer.extend({
	managed_by: z
		.union([z.uuid().transform((value) => [value]), z.array(z.uuid()).nonempty()])
		.default([team]),
	organization: z.uuid().default(organization),
	organizational_unit: z.uuid().nullable().default(null),
	realm: z.string().max(1024).default('test')
});

function makeUser(overrides: z.input<typeof testUser> = {}): User {
	return testUser.parse(overrides);
}

function makeContainer(
	type: AnyPayload['type'],
	overrides: Omit<z.input<typeof testContainer>, 'payload'> = {},
	payloadOverrides: Record<string, unknown> = {}
) {
	return testContainer.parse({
		...overrides,
		payload: {
			title: 'Lorem ipsum',
			type,
			visibility: visibility.enum.members,
			...payloadOverrides
		}
	});
}

describe('anonymous users', () => {
	const ability = defineAbilityFor(makeUser({ isAuthenticated: false }));

	test('may read public containers only', () => {
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.public })
			)
		).toBe(true);
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(false);
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.organization })
			)
		).toBe(false);
	});

	test('may not modify anything', () => {
		const container = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', container)).toBe(false);
		expect(ability.can('update', container)).toBe(false);
		expect(ability.can('delete', container)).toBe(false);
	});
});

describe('sysadmin', () => {
	const ability = defineAbilityFor(makeUser({ roles: ['sysadmin'] }));

	test('has unconditional access regardless of managed_by and membership', () => {
		const container = makeContainer(payloadTypes.enum.measure, { managed_by: otherTeam });
		expect(ability.can('create', container)).toBe(true);
		expect(ability.can('read', container)).toBe(true);
		expect(ability.can('update', container)).toBe(true);
		expect(ability.can('delete', container)).toBe(true);
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(true);
	});
});

describe('create, update and delete via managed_by', () => {
	test.for([
		['adminOf', makeUser({ adminOf: [team] })],
		['collaboratorOf', makeUser({ collaboratorOf: [team] })],
		['headOf', makeUser({ headOf: [team] })]
	] as const)('a user with the %s role on the managing team may modify', ([, user]) => {
		const ability = defineAbilityFor(user);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
		expect(ability.can('update', makeContainer(payloadTypes.enum.program))).toBe(true);
	});

	test('a user without a role on the managing team may not modify', () => {
		const ability = defineAbilityFor(makeUser({ adminOf: [otherTeam], memberOf: [team] }));
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(false);
		expect(ability.can('update', measure)).toBe(false);
		expect(ability.can('delete', measure)).toBe(false);
	});

	test('membership alone does not grant modification', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [team] }));
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure)).toBe(false);
	});

	test('containers managed by the organizational unit are modifiable by unit admins', () => {
		// Without a team of its own, managed_by defaults to the organizational
		// unit (or organization), so unit admins qualify via the managed_by rule.
		const ability = defineAbilityFor(makeUser({ adminOf: [organizationalUnit] }));
		const measure = makeContainer(payloadTypes.enum.measure, {
			managed_by: organizationalUnit,
			organizational_unit: organizationalUnit
		});
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
	});
});

describe('categories and terms via managed_by', () => {
	test('admins and heads may manage them', () => {
		for (const user of [makeUser({ adminOf: [team] }), makeUser({ headOf: [team] })]) {
			const ability = defineAbilityFor(user);
			const category = makeContainer(payloadTypes.enum.category);
			expect(ability.can('create', category)).toBe(true);
			expect(ability.can('update', category)).toBe(true);
			expect(ability.can('delete', category)).toBe(true);
			expect(ability.can('update', makeContainer(payloadTypes.enum.term))).toBe(true);
		}
	});

	test('collaborators may not manage them', () => {
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		const category = makeContainer(payloadTypes.enum.category);
		expect(ability.can('create', category)).toBe(false);
		expect(ability.can('update', category)).toBe(false);
		expect(ability.can('delete', category)).toBe(false);
	});
});

describe('manage-users via managed_by', () => {
	test('is granted to admins and heads for programs and measures', () => {
		for (const user of [makeUser({ adminOf: [team] }), makeUser({ headOf: [team] })]) {
			const ability = defineAbilityFor(user);
			expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(true);
			expect(ability.can('manage-users', makeContainer(payloadTypes.enum.measure))).toBe(true);
		}
	});

	test('is not granted to collaborators via managed_by', () => {
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(false);
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});
});

describe('task prioritization requires the update permission', () => {
	test('is granted to collaborators and denied to mere members', () => {
		expect(
			defineAbilityFor(makeUser({ collaboratorOf: [team] })).can(
				'update',
				makeContainer(payloadTypes.enum.task)
			)
		).toBe(true);
		expect(
			defineAbilityFor(makeUser({ memberOf: [team] })).can(
				'update',
				makeContainer(payloadTypes.enum.task)
			)
		).toBe(false);
	});
});

describe('read visibility via managed_by', () => {
	test('members of the managing team may read members-only containers', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [team] }));
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(true);
	});

	test('members of the managing team may read organization-visibility containers', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [team] }));
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.organization })
			)
		).toBe(true);
	});

	test('non-members may not read members-only containers', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [otherTeam] }));
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});

	test('organization members may read organization-visibility containers', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [organization] }));
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.organization })
			)
		).toBe(true);
	});

	test('creator-visibility containers are readable by their creator and org admins only', () => {
		const creatorRelation = [{ predicate: predicates.enum['is-creator-of'], subject: userGuid }];
		const container = makeContainer(
			payloadTypes.enum.measure,
			{ user: creatorRelation },
			{ visibility: visibility.enum.creator }
		);
		expect(defineAbilityFor(makeUser()).can('read', container)).toBe(true);
		expect(
			defineAbilityFor(makeUser({ guid: anotherUserGuid, adminOf: [organization] })).can(
				'read',
				container
			)
		).toBe(true);
		expect(
			defineAbilityFor(makeUser({ guid: anotherUserGuid, memberOf: [team, organization] })).can(
				'read',
				container
			)
		).toBe(false);
	});
});

describe('multi-valued managed_by', () => {
	// managed_by carries exactly one value for now, but its type allows several.
	// These cases pin down that one matching element suffices once multiple teams
	// are filled in, and that non-matching elements grant nothing.
	const container = makeContainer(payloadTypes.enum.measure, {
		managed_by: [otherTeam, team]
	});

	test('a role on one of the managing teams suffices to modify', () => {
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		expect(ability.can('create', container)).toBe(true);
		expect(ability.can('update', container)).toBe(true);
		expect(ability.can('delete', container)).toBe(true);
	});

	test('admins and heads of one of the managing teams may invite members', () => {
		expect(defineAbilityFor(makeUser({ adminOf: [team] })).can('manage-users', container)).toBe(
			true
		);
		expect(defineAbilityFor(makeUser({ headOf: [otherTeam] })).can('manage-users', container)).toBe(
			true
		);
	});

	test('roles on none of the managing teams grant nothing', () => {
		const ability = defineAbilityFor(makeUser({ adminOf: [organizationalUnit] }));
		expect(ability.can('create', container)).toBe(false);
		expect(ability.can('update', container)).toBe(false);
		expect(ability.can('delete', container)).toBe(false);
		expect(ability.can('read', container)).toBe(false);
	});

	test('membership in one of the managing teams suffices to read', () => {
		expect(defineAbilityFor(makeUser({ memberOf: [team] })).can('read', container)).toBe(true);
		expect(defineAbilityFor(makeUser({ memberOf: [otherTeam] })).can('read', container)).toBe(true);
		expect(
			defineAbilityFor(makeUser({ memberOf: [organizationalUnit] })).can('read', container)
		).toBe(false);
	});
});

describe('field-level rules', () => {
	test('roles on the managing team may update chapterType and editorialState', () => {
		// The general update rule conditioned on managed_by carries no field
		// restriction, so it also covers these fields for collaborators.
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		expect(ability.can('update', makeContainer(payloadTypes.enum.program), 'chapterType')).toBe(
			true
		);
		expect(
			ability.can('update', makeContainer(payloadTypes.enum.measure), 'payload.editorialState')
		).toBe(true);
	});

	test('members of the managing team may read the editorial state', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [team] }));
		expect(
			ability.can('read', makeContainer(payloadTypes.enum.measure), 'payload.editorialState')
		).toBe(true);
		expect(ability.can('read', makeContainer(payloadTypes.enum.task), 'assignee')).toBe(true);
	});

	test('the organization and organizational_unit fields are protected', () => {
		const ability = defineAbilityFor(makeUser({ adminOf: [organization] }));
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure, 'organization')).toBe(false);
		// Re-parenting into another organizational unit is explicitly allowed
		// for admins and heads of the organization.
		expect(ability.can('update', measure, 'organizational_unit')).toBe(true);
	});

	test('the indicator category of indicator templates is immutable', () => {
		const ability = defineAbilityFor(makeUser({ adminOf: [organization] }));
		const template = makeContainer(payloadTypes.enum.indicator_template, {}, { unit: '%' });
		expect(ability.can('update', template)).toBe(true);
		expect(ability.can('update', template, 'indicatorCategory')).toBe(false);
	});
});

describe('indicator types follow the common content rules', () => {
	const template = makeContainer(
		payloadTypes.enum.indicator_template,
		{ managed_by: organization, organization },
		{ unit: '%' }
	);

	test('admins and heads manage them organization-wide', () => {
		for (const user of [
			makeUser({ adminOf: [organization] }),
			makeUser({ headOf: [organization] })
		]) {
			const ability = defineAbilityFor(user);
			expect(ability.can('create', template)).toBe(true);
			expect(ability.can('update', template)).toBe(true);
			expect(ability.can('delete', template)).toBe(true);
		}
	});

	test('collaborators manage them through the managing team only', () => {
		const viaManagedBy = defineAbilityFor(makeUser({ collaboratorOf: [organization] }));
		expect(viaManagedBy.can('create', template)).toBe(true);
		expect(viaManagedBy.can('update', template)).toBe(true);
		expect(viaManagedBy.can('delete', template)).toBe(true);

		// a collaborator of the organization no longer reaches an indicator
		// template that is managed by a team they are not part of
		const foreign = makeContainer(
			payloadTypes.enum.indicator_template,
			{ managed_by: team, organization },
			{ unit: '%' }
		);
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [organization] }));
		expect(ability.can('update', foreign)).toBe(false);
	});
});

describe('grantKindsForRoleOn', () => {
	const viewer = {
		family_name: 'Muster',
		given_name: 'Erika',
		guid: anotherUserGuid,
		settings: {}
	};

	function withGuid(container: ReturnType<typeof makeContainer>, guid: string) {
		return { ...container, guid } as Container<AnyPayload>;
	}

	test('organization: nobody creates or deletes, head and admin coincide', () => {
		const orgGuid = crypto.randomUUID();
		const org = withGuid(
			testContainer.parse({
				managed_by: orgGuid,
				organization: orgGuid,
				payload: { name: 'Org', type: payloadTypes.enum.organization }
			}) as ReturnType<typeof makeContainer>,
			orgGuid
		);

		expect(grantKindsForRoleOn(org, viewer, null)).toEqual([]);
		expect(grantKindsForRoleOn(org, viewer, memberRoles.enum.observer)).toEqual(['read']);
		expect(grantKindsForRoleOn(org, viewer, memberRoles.enum.collaborator)).toEqual(['read']);
		expect(grantKindsForRoleOn(org, viewer, memberRoles.enum.head)).toEqual([
			'read',
			'update',
			'manage-members'
		]);
		expect(grantKindsForRoleOn(org, viewer, memberRoles.enum.administrator)).toEqual(
			grantKindsForRoleOn(org, viewer, memberRoles.enum.head)
		);
	});

	test('organizational unit: head and admin coincide', () => {
		const unitGuid = crypto.randomUUID();
		const unit = withGuid(
			testContainer.parse({
				managed_by: unitGuid,
				payload: { name: 'Unit', type: payloadTypes.enum.organizational_unit }
			}) as ReturnType<typeof makeContainer>,
			unitGuid
		);

		expect(grantKindsForRoleOn(unit, viewer, memberRoles.enum.head)).toEqual([
			'read',
			'update',
			'manage-members'
		]);
		expect(grantKindsForRoleOn(unit, viewer, memberRoles.enum.administrator)).toEqual(
			grantKindsForRoleOn(unit, viewer, memberRoles.enum.head)
		);
	});

	test('self-managed measure: collaborators may delete, heads also manage members', () => {
		const measureGuid = crypto.randomUUID();
		const measure = withGuid(
			makeContainer(payloadTypes.enum.measure, { managed_by: measureGuid }),
			measureGuid
		);

		expect(grantKindsForRoleOn(measure, viewer, memberRoles.enum.observer)).toEqual(['read']);
		expect(grantKindsForRoleOn(measure, viewer, memberRoles.enum.collaborator)).toEqual([
			'read',
			'update',
			'create',
			'delete'
		]);
		expect(grantKindsForRoleOn(measure, viewer, memberRoles.enum.head)).toEqual([
			'read',
			'update',
			'create',
			'delete',
			'manage-members'
		]);
	});

	test('public container: even without a role read stays granted', () => {
		const measureGuid = crypto.randomUUID();
		const measure = withGuid(
			makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.public }),
			measureGuid
		);

		expect(grantKindsForRoleOn(measure, viewer, null)).toEqual(['read']);
	});
});

describe('grantKindsForRoleOnSubordinates', () => {
	const viewer = {
		family_name: 'Muster',
		given_name: 'Erika',
		guid: anotherUserGuid,
		settings: {}
	};

	function withGuid(container: ReturnType<typeof makeContainer>, guid: string) {
		return { ...container, guid } as Container<AnyPayload>;
	}

	test('every member role of an organization may work on subordinate objects', () => {
		const orgGuid = crypto.randomUUID();
		const org = withGuid(
			testContainer.parse({
				managed_by: orgGuid,
				organization: orgGuid,
				payload: { name: 'Org', type: payloadTypes.enum.organization }
			}) as ReturnType<typeof makeContainer>,
			orgGuid
		);

		expect(grantKindsForRoleOnSubordinates(org, viewer, null)).toEqual([]);
		expect(grantKindsForRoleOnSubordinates(org, viewer, memberRoles.enum.observer)).toEqual([]);
		// collaborators reach subordinate objects through the managed_by fallback
		expect(grantKindsForRoleOnSubordinates(org, viewer, memberRoles.enum.collaborator)).toEqual([
			'create',
			'update',
			'delete'
		]);
		expect(grantKindsForRoleOnSubordinates(org, viewer, memberRoles.enum.head)).toEqual([
			'create',
			'update',
			'delete'
		]);
		expect(grantKindsForRoleOnSubordinates(org, viewer, memberRoles.enum.administrator)).toEqual(
			grantKindsForRoleOnSubordinates(org, viewer, memberRoles.enum.head)
		);
	});

	test('members of an organizational unit may work on subordinate objects', () => {
		const unitGuid = crypto.randomUUID();
		const unit = withGuid(
			testContainer.parse({
				managed_by: unitGuid,
				payload: { name: 'Unit', type: payloadTypes.enum.organizational_unit }
			}) as ReturnType<typeof makeContainer>,
			unitGuid
		);

		expect(grantKindsForRoleOnSubordinates(unit, viewer, memberRoles.enum.observer)).toEqual([]);
		expect(grantKindsForRoleOnSubordinates(unit, viewer, memberRoles.enum.collaborator)).toEqual([
			'create',
			'update',
			'delete'
		]);
		expect(grantKindsForRoleOnSubordinates(unit, viewer, memberRoles.enum.head)).toEqual([
			'create',
			'update',
			'delete'
		]);
	});

	test('collaborators of a self-managed measure may work on its subordinate objects', () => {
		const measureGuid = crypto.randomUUID();
		const measure = withGuid(
			makeContainer(payloadTypes.enum.measure, { managed_by: measureGuid }),
			measureGuid
		);

		expect(grantKindsForRoleOnSubordinates(measure, viewer, memberRoles.enum.observer)).toEqual([]);
		expect(grantKindsForRoleOnSubordinates(measure, viewer, memberRoles.enum.collaborator)).toEqual(
			['create', 'update', 'delete']
		);
	});
});

// The complete permission matrix of the role-based system: one test per member
// role × payload type × scope, pinning which of the four basic actions the
// role permits on an object belonging to that scope. This is the baseline for
// the migration to individually assignable grants — the migrated rules must
// reproduce exactly this matrix.
//
// The objects are modelled the way scope-owned content is stored: managed by
// the scope itself (content managed by a team of its own is covered by the
// managed_by suites above) with members-only visibility. The organization and
// the organizational unit appear both as scope and as payload type.

const basicActions = ['read', 'create', 'update', 'delete'] as const;

type BasicAction = (typeof basicActions)[number];

const allBasicActions: BasicAction[] = ['read', 'create', 'update', 'delete'];
const readAndUpdate: BasicAction[] = ['read', 'update'];
const readOnly: BasicAction[] = ['read'];

type Scope = 'organization' | 'organizational unit';

function scopeGuidOf(scope: Scope) {
	return scope === 'organization' ? organization : organizationalUnit;
}

function userWithRoleOn(role: MemberRole, scope: Scope): User {
	const guid = scopeGuidOf(scope);
	return makeUser({
		adminOf: role === memberRoles.enum.administrator ? [guid] : [],
		collaboratorOf: role === memberRoles.enum.collaborator ? [guid] : [],
		headOf: role === memberRoles.enum.head ? [guid] : [],
		memberOf: [guid]
	});
}

// some payload schemas require more than a title
const requiredPayloadFields: Partial<Record<PayloadType, Record<string, unknown>>> = {
	[payloadTypes.enum.actual_data]: { indicator: crypto.randomUUID() },
	[payloadTypes.enum.chapter]: { number: '1' },
	[payloadTypes.enum.indicator_template]: { unit: 'unit.euro' },
	[payloadTypes.enum.organization]: { name: 'Lorem ipsum' },
	[payloadTypes.enum.organizational_unit]: { name: 'Lorem ipsum' },
	[payloadTypes.enum.page]: { body: 'Lorem ipsum' },
	[payloadTypes.enum.resource_data]: {
		resource: crypto.randomUUID(),
		resourceDataType: 'resource_data_type.budget'
	},
	[payloadTypes.enum.resource_data_collection]: {
		resourceDataType: 'resource_data_type.budget'
	}
};

function scopedContainer(scope: Scope, type: PayloadType) {
	const namedByTitle =
		type !== payloadTypes.enum.organization && type !== payloadTypes.enum.organizational_unit;
	return testContainer.parse({
		// the organization and the organizational unit carry their own guid,
		// which some of the rules match on
		...(type === payloadTypes.enum.organization ? { guid: organization } : {}),
		...(type === payloadTypes.enum.organizational_unit ? { guid: organizationalUnit } : {}),
		managed_by: scopeGuidOf(scope),
		organization,
		organizational_unit: scope === 'organizational unit' ? organizationalUnit : null,
		payload: {
			...(namedByTitle ? { title: 'Lorem ipsum' } : {}),
			...requiredPayloadFields[type],
			type,
			visibility: visibility.enum.members
		}
	});
}

const permissionMatrix: Record<
	Scope,
	Array<{ types: PayloadType[]; permitted: Record<MemberRole, BasicAction[]> }>
> = {
	organization: [
		{
			types: commonTypes,
			permitted: {
				administrator: allBasicActions,
				head: allBasicActions,
				collaborator: allBasicActions,
				observer: readOnly
			}
		},
		{
			// collaborators may work on a program but neither add nor remove one
			types: [payloadTypes.enum.program],
			permitted: {
				administrator: allBasicActions,
				head: allBasicActions,
				collaborator: readAndUpdate,
				observer: readOnly
			}
		},
		{
			// managing these is reserved for admins and heads of the organization
			types: [
				payloadTypes.enum.category,
				payloadTypes.enum.term,
				payloadTypes.enum.help,
				payloadTypes.enum.organizational_unit
			],
			permitted: {
				administrator: allBasicActions,
				head: allBasicActions,
				collaborator: readOnly,
				observer: readOnly
			}
		},
		{
			// the organization itself may be updated but not created or deleted;
			// update on html merely stems from the field-level rule that lets
			// admins and heads move containers between organizational units
			types: [payloadTypes.enum.organization, payloadTypes.enum.html],
			permitted: {
				administrator: readAndUpdate,
				head: readAndUpdate,
				collaborator: readOnly,
				observer: readOnly
			}
		}
	],
	'organizational unit': [
		{
			types: commonTypes,
			permitted: {
				administrator: allBasicActions,
				head: allBasicActions,
				collaborator: allBasicActions,
				observer: readOnly
			}
		},
		{
			types: [payloadTypes.enum.program],
			permitted: {
				administrator: allBasicActions,
				head: allBasicActions,
				collaborator: readAndUpdate,
				observer: readOnly
			}
		},
		{
			types: [payloadTypes.enum.category, payloadTypes.enum.term],
			permitted: {
				administrator: allBasicActions,
				head: allBasicActions,
				collaborator: readOnly,
				observer: readOnly
			}
		},
		{
			// the unit itself may be renamed by its admins and heads; adding and
			// removing units stays with the organization
			types: [payloadTypes.enum.organizational_unit],
			permitted: {
				administrator: readAndUpdate,
				head: readAndUpdate,
				collaborator: readOnly,
				observer: readOnly
			}
		},
		{
			// these belong to the organization, so unit roles yield no rights
			types: [payloadTypes.enum.help, payloadTypes.enum.html, payloadTypes.enum.organization],
			permitted: {
				administrator: readOnly,
				head: readOnly,
				collaborator: readOnly,
				observer: readOnly
			}
		}
	]
};

function inWords(actions: BasicAction[]) {
	if (actions.length === basicActions.length) {
		return 'read, create, update and delete';
	}
	if (actions.length === 1) {
		return 'only read';
	}
	return `only ${actions.join(' and ')}`;
}

describe('the basic permission matrix by member role', () => {
	test('the matrix covers every payload type exactly once per scope', () => {
		for (const scope of Object.keys(permissionMatrix) as Scope[]) {
			const covered = permissionMatrix[scope].flatMap(({ types }) => types);
			expect([...covered].sort()).toEqual([...commonTypes, ...specialTypes].sort());
		}
	});

	for (const scope of Object.keys(permissionMatrix) as Scope[]) {
		describe(`objects belonging to an ${scope}`, () => {
			for (const { types, permitted } of permissionMatrix[scope]) {
				for (const role of memberRoles.options) {
					const ability = defineAbilityFor(userWithRoleOn(role, scope));
					test.for(types)(`a ${role} may ${inWords(permitted[role])}: %s`, (type) => {
						expect(
							basicActions.filter((action) => ability.can(action, scopedContainer(scope, type)))
						).toEqual(permitted[role]);
					});
				}
			}

			test('a registered user without a role in the scope has no access', () => {
				const ability = defineAbilityFor(makeUser());
				const measure = scopedContainer(scope, payloadTypes.enum.measure);
				expect(basicActions.filter((action) => ability.can(action, measure))).toEqual([]);
			});
		});
	}
});

describe('manage-users by member role', () => {
	// user management exists on these types only; anywhere else even admins may
	// not manage users
	const managedTypesByScope: Record<Scope, PayloadType[]> = {
		organization: [
			payloadTypes.enum.measure,
			payloadTypes.enum.organization,
			payloadTypes.enum.organizational_unit,
			payloadTypes.enum.program,
			payloadTypes.enum.simple_measure
		],
		'organizational unit': [
			payloadTypes.enum.measure,
			payloadTypes.enum.organizational_unit,
			payloadTypes.enum.program,
			payloadTypes.enum.simple_measure
		]
	};

	for (const scope of Object.keys(managedTypesByScope) as Scope[]) {
		for (const role of memberRoles.options) {
			const mayManage = role === memberRoles.enum.administrator || role === memberRoles.enum.head;
			const ability = defineAbilityFor(userWithRoleOn(role, scope));
			test.for(payloadTypes.options)(
				`a ${role} of an ${scope} may ${mayManage ? 'manage users of the supporting types' : 'never manage users'}: %s`,
				(type) => {
					expect(ability.can('manage-users', scopedContainer(scope, type))).toBe(
						mayManage && managedTypesByScope[scope].includes(type)
					);
				}
			);
		}
	}
});

describe('read access to team-managed content within the scope', () => {
	// content managed by a team of its own is readable through the scope roles
	// only as far as the visibility rules allow
	function teamManagedMeasure(scope: Scope, teamVisibility: string) {
		return makeContainer(
			payloadTypes.enum.measure,
			{
				managed_by: team,
				organizational_unit: scope === 'organizational unit' ? organizationalUnit : null
			},
			{ visibility: teamVisibility }
		);
	}

	for (const scope of ['organization', 'organizational unit'] as Scope[]) {
		test(`members-only content in an ${scope} is readable by admins and heads only`, () => {
			const container = teamManagedMeasure(scope, visibility.enum.members);
			expect(
				memberRoles.options.filter((role) =>
					defineAbilityFor(userWithRoleOn(role, scope)).can('read', container)
				)
			).toEqual([memberRoles.enum.head, memberRoles.enum.administrator]);
		});

		test(`organization-visibility content in an ${scope} is readable by every member`, () => {
			const container = teamManagedMeasure(scope, visibility.enum.organization);
			expect(
				memberRoles.options.filter((role) =>
					defineAbilityFor(userWithRoleOn(role, scope)).can('read', container)
				)
			).toEqual(memberRoles.options);
		});
	}

	test('creator-visibility content is readable by organization admins but not unit admins', () => {
		const container = teamManagedMeasure('organization', visibility.enum.creator);
		expect(
			memberRoles.options.filter((role) =>
				defineAbilityFor(userWithRoleOn(role, 'organization')).can('read', container)
			)
		).toEqual([memberRoles.enum.administrator]);

		const unitContainer = teamManagedMeasure('organizational unit', visibility.enum.creator);
		expect(
			memberRoles.options.filter((role) =>
				defineAbilityFor(userWithRoleOn(role, 'organizational unit')).can('read', unitContainer)
			)
		).toEqual([]);
	});
});

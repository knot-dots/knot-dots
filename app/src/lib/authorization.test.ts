import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import defineAbilityFor, { commonTypes, specialTypes } from '$lib/authorization';
import {
	type AnyPayload,
	emptyGrantRecords,
	grantKinds,
	grantRecordsForRoleOn,
	grantTargets,
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

// The tests keep building users with the former role arrays; makeUser
// translates them through the role mapping into the grant records the session
// carries now, so the original expectations keep running unchanged.
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
	const { adminOf, collaboratorOf, headOf, memberOf, ...user } = testUser.parse(overrides);
	const grants = emptyGrantRecords();
	for (const [role, objects] of [
		[memberRoles.enum.administrator, adminOf],
		[memberRoles.enum.head, headOf],
		[memberRoles.enum.collaborator, collaboratorOf],
		[memberRoles.enum.observer, memberOf]
	] as const) {
		for (const object of objects) {
			const forRole = grantRecordsForRoleOn(role, object);
			for (const target of grantTargets.options) {
				for (const kind of grantKinds.options) {
					grants[target][kind].push(...forRole[target][kind]);
				}
			}
		}
	}
	return { ...user, grants };
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

	test('containers belonging to the organizational unit are modifiable by unit admins', () => {
		// Unit admins qualify through the organizational_unit column alone, no
		// matter which team manages the container.
		const ability = defineAbilityFor(makeUser({ adminOf: [organizationalUnit] }));
		const measure = makeContainer(payloadTypes.enum.measure, {
			managed_by: otherTeam,
			organizational_unit: organizationalUnit
		});
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
	});
});

describe('categories and terms via managed_by', () => {
	test('admins keep full control while heads may only update them', () => {
		// creating and deleting categories requires the full self set on the
		// managing team, which only the admin role carries
		const admin = defineAbilityFor(makeUser({ adminOf: [team] }));
		const category = makeContainer(payloadTypes.enum.category);
		expect(admin.can('create', category)).toBe(true);
		expect(admin.can('update', category)).toBe(true);
		expect(admin.can('delete', category)).toBe(true);

		const head = defineAbilityFor(makeUser({ headOf: [team] }));
		expect(head.can('create', category)).toBe(false);
		expect(head.can('update', category)).toBe(true);
		expect(head.can('delete', category)).toBe(false);
		expect(head.can('update', makeContainer(payloadTypes.enum.term))).toBe(true);
	});

	test('collaborators may update but neither add nor remove them', () => {
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		const category = makeContainer(payloadTypes.enum.category);
		expect(ability.can('create', category)).toBe(false);
		expect(ability.can('update', category)).toBe(true);
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
		// the general read rule carries no field restriction
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure), 'payload.title')).toBe(
			true
		);
	});

	test('admins and heads may edit the organization except for its custom domain', () => {
		for (const user of [
			makeUser({ adminOf: [organization] }),
			makeUser({ headOf: [organization] })
		]) {
			const ability = defineAbilityFor(user);
			const org = testContainer.parse({
				guid: organization,
				managed_by: organization,
				payload: { name: 'Org', type: payloadTypes.enum.organization }
			});
			expect(ability.can('update', org, 'payload.name')).toBe(true);
			expect(ability.can('update', org, 'payload.customDomain')).toBe(false);
		}
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

describe('decoupled containers', () => {
	// containers with an own grant matrix (payload.inheritsGrants == false) no
	// longer follow the subordinate grants of their scope; scope administrators
	// retain full access either way
	const decoupled = makeContainer(
		payloadTypes.enum.measure,
		{ managed_by: team },
		{ inheritsGrants: false, visibility: visibility.enum.organization }
	);
	const inheriting = makeContainer(
		payloadTypes.enum.measure,
		{ managed_by: team },
		{ visibility: visibility.enum.organization }
	);

	test('scope grants no longer apply to decoupled containers', () => {
		const head = defineAbilityFor(makeUser({ headOf: [organization] }));
		expect(head.can('update', inheriting)).toBe(true);
		expect(head.can('update', decoupled)).toBe(false);
		expect(head.can('create', decoupled)).toBe(false);
		expect(head.can('delete', decoupled)).toBe(false);
		expect(head.can('manage-users', decoupled)).toBe(false);
		expect(head.can('read', decoupled)).toBe(false);
	});

	test('scope administrators retain full access to decoupled containers', () => {
		const admin = defineAbilityFor(makeUser({ adminOf: [organization] }));
		expect(admin.can('update', decoupled)).toBe(true);
		expect(admin.can('create', decoupled)).toBe(true);
		expect(admin.can('delete', decoupled)).toBe(true);
		expect(admin.can('manage-users', decoupled)).toBe(true);
		expect(admin.can('read', decoupled)).toBe(true);
	});

	test('the own matrix of a decoupled container keeps working', () => {
		const collaborator = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		expect(collaborator.can('update', decoupled)).toBe(true);
		expect(collaborator.can('create', decoupled)).toBe(true);
	});

	test('contents managed by the decoupled container stay reachable through it', () => {
		// the flag lives on the decoupled container itself; its contents follow
		// the own matrix through managed_by, while content matched through the
		// organization column is a documented limitation of the live inheritance
		const content = makeContainer(payloadTypes.enum.goal, { managed_by: team });
		const collaborator = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		expect(collaborator.can('update', content)).toBe(true);
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

// The matrix pins the grant-based rules as derived from the member roles:
// heads and collaborators update special content types but only admins (the
// full self set on the scope) add or remove them; html stays with sysadmins.
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
			// adding and removing these requires the full self set on the
			// organization object, which only admins carry
			types: [
				payloadTypes.enum.category,
				payloadTypes.enum.term,
				payloadTypes.enum.help,
				payloadTypes.enum.organizational_unit
			],
			permitted: {
				administrator: allBasicActions,
				head: readAndUpdate,
				collaborator: readAndUpdate,
				observer: readOnly
			}
		},
		{
			// the organization itself may be updated but not created or deleted
			types: [payloadTypes.enum.organization],
			permitted: {
				administrator: readAndUpdate,
				head: readAndUpdate,
				collaborator: readAndUpdate,
				observer: readOnly
			}
		},
		{
			// html sections are reserved for sysadmins
			types: [payloadTypes.enum.html],
			permitted: {
				administrator: readOnly,
				head: readOnly,
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
			types: [payloadTypes.enum.category, payloadTypes.enum.term],
			permitted: {
				administrator: allBasicActions,
				head: readAndUpdate,
				collaborator: readAndUpdate,
				observer: readOnly
			}
		},
		{
			// the unit itself may be renamed; adding and removing units stays with
			// the organization
			types: [payloadTypes.enum.organizational_unit],
			permitted: {
				administrator: readAndUpdate,
				head: readAndUpdate,
				collaborator: readAndUpdate,
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

describe('scope rules apply regardless of managed_by', () => {
	// Admins and heads reach content through the organization and
	// organizational_unit columns alone; collaborators depend on managed_by.
	for (const scope of ['organization', 'organizational unit'] as Scope[]) {
		const measure = makeContainer(payloadTypes.enum.measure, {
			managed_by: otherTeam,
			organizational_unit: scope === 'organizational unit' ? organizationalUnit : null
		});

		test.for([memberRoles.enum.administrator, memberRoles.enum.head] as MemberRole[])(
			`a %s modifies content of the ${scope} managed by another team`,
			(role) => {
				const ability = defineAbilityFor(userWithRoleOn(role, scope));
				expect(ability.can('create', measure)).toBe(true);
				expect(ability.can('update', measure)).toBe(true);
				expect(ability.can('delete', measure)).toBe(true);
			}
		);

		test(`a collaborator of the ${scope} reaches content managed by another team as well`, () => {
			// subordinate grants attach to the scope, so they cover its content
			// regardless of managed_by
			const ability = defineAbilityFor(userWithRoleOn(memberRoles.enum.collaborator, scope));
			expect(ability.can('create', measure)).toBe(true);
			expect(ability.can('update', measure)).toBe(true);
			expect(ability.can('delete', measure)).toBe(true);
		});

		test.for([memberRoles.enum.administrator, memberRoles.enum.head] as MemberRole[])(
			`a %s manages users of measures in the ${scope} managed by another team`,
			(role) => {
				const ability = defineAbilityFor(userWithRoleOn(role, scope));
				expect(ability.can('manage-users', measure)).toBe(true);
			}
		);
	}

	test('members read the organizational unit itself regardless of managed_by', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [organizationalUnit] }));
		for (const unitVisibility of [visibility.enum.members, visibility.enum.organization]) {
			const unit = testContainer.parse({
				guid: organizationalUnit,
				managed_by: otherTeam,
				payload: {
					name: 'Unit',
					type: payloadTypes.enum.organizational_unit,
					visibility: unitVisibility
				}
			});
			expect(ability.can('read', unit)).toBe(true);
		}
	});
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
					// managing the users of the organization object itself requires
					// the self grant, which only admins carry
					const requiresSelfGrant =
						scope === 'organization' && type === payloadTypes.enum.organization;
					expect(ability.can('manage-users', scopedContainer(scope, type))).toBe(
						mayManage &&
							managedTypesByScope[scope].includes(type) &&
							(!requiresSelfGrant || role === memberRoles.enum.administrator)
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

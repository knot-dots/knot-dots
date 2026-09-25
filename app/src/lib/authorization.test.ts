import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import defineAbilityFor, { commonTypes, specialTypes } from '$lib/authorization';
import {
	type AnyPayload,
	composeUserGrants,
	emptyGrantRecords,
	type GrantKind,
	grantKinds,
	grantRecordsForRoleOn,
	type GrantTarget,
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

// These tests pin down the behaviour of the CASL policies with plain-object
// users and containers. The rules read the effective grants the server
// computes per container (user_grant); `enrich` mirrors that computation for
// test objects, so the pinned outcomes cover the rule side while the
// computeUserGrants tests cover the derivation against the database.

const organization = crypto.randomUUID();
const organizationalUnit = crypto.randomUUID();
const team = crypto.randomUUID();
const otherTeam = crypto.randomUUID();
const userGuid = crypto.randomUUID();
const anotherUserGuid = crypto.randomUUID();

// The tests keep building users with the former role arrays; makeUser
// translates them through the role mapping into grant rows, so the original
// expectations keep running unchanged.
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
	guid: z.uuid().optional(),
	managed_by: z
		.union([z.uuid().transform((value) => [value]), z.array(z.uuid()).nonempty()])
		.default([team]),
	organization: z.uuid().default(organization),
	organizational_unit: z.uuid().nullable().default(null),
	realm: z.string().max(1024).default('test')
});

type TestContainer = z.infer<typeof testContainer>;

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
		payload: Object.fromEntries(
			Object.entries({
				title: 'Lorem ipsum',
				type,
				visibility: visibility.enum.members,
				...payloadOverrides
			}).filter(([, value]) => value !== undefined)
		)
	});
}

function kindsAt(user: User, object: string, target: GrantTarget): GrantKind[] {
	return grantKinds.options.filter((kind) => user.grants[target][kind].includes(object));
}

// Mirrors computeUserGrants for plain test objects. The governing matrix
// defaults to the container's area; organizations always govern themselves,
// and an organizational unit the user holds rows on counts as decoupled. The
// suites covering matrices of teams, programs and measures pass the source
// explicitly.
function enrich<T extends TestContainer>(container: T, user: User, source?: string): T {
	const guid = container.guid;
	const holdsRowsOn = (object: string) =>
		grantTargets.options.some((target) => kindsAt(user, object, target).length > 0);
	const ownMatrix =
		guid !== undefined &&
		(container.payload.type === payloadTypes.enum.organization ||
			(container.payload.type === payloadTypes.enum.organizational_unit && holdsRowsOn(guid)));
	const src =
		source ??
		(ownMatrix && guid !== undefined
			? guid
			: (container.organizational_unit ?? container.organization));

	return {
		...container,
		user_grant: composeUserGrants({
			scopeSourced: src === container.organization || src === container.organizational_unit,
			governsItself: src === guid,
			organizationSelf: kindsAt(user, container.organization, 'self'),
			organizationalUnitSelf: container.organizational_unit
				? kindsAt(user, container.organizational_unit, 'self')
				: [],
			source: src,
			sourceSelf: kindsAt(user, src, 'self'),
			sourceSubordinates: kindsAt(user, src, 'subordinates')
		})
	};
}

// Mirrors computeUserGrantsFromRoles for plain test objects: while the
// permission matrix is off, the member roles govern additively — the roles on
// the container itself (its team) and on the surrounding areas apply side by
// side. Test containers carry no relations, so the ancestry walk reduces to
// the container itself.
function enrichFromRoles<T extends TestContainer>(container: T, user: User): T {
	const guid = container.guid;
	const setAt = (object: string | null | undefined) => ({
		self: object ? kindsAt(user, object, 'self') : [],
		subordinates: object ? kindsAt(user, object, 'subordinates') : []
	});
	const holdsRowsOn = (object: string) =>
		grantTargets.options.some((target) => kindsAt(user, object, target).length > 0);
	const team = guid !== undefined && holdsRowsOn(guid) ? guid : undefined;
	const teamSet = setAt(team);
	const organizationSet = setAt(container.organization);
	const unitSet = setAt(container.organizational_unit);

	const union = (target: 'self' | 'subordinates') =>
		grantKinds.options.filter((kind) =>
			[teamSet, organizationSet, unitSet].some((set) => set[target].includes(kind))
		);

	const subordinates = union('subordinates');
	return {
		...container,
		user_grant: {
			admin: [teamSet, organizationSet, unitSet].some((set) =>
				['read', 'update', 'manage-users'].every((kind) => (set.self as string[]).includes(kind))
			),
			scope_sourced:
				[organizationSet, unitSet].some((set) => set.self.length + set.subordinates.length > 0) ||
				team === undefined,
			member: team
				? teamSet.subordinates.includes(grantKinds.enum.read)
				: subordinates.includes(grantKinds.enum.read),
			organization_manager: organizationSet.self.includes(grantKinds.enum['manage-users']),
			own: team === guid && team !== undefined ? teamSet.self : [],
			self: subordinates.filter((kind) => kind !== grantKinds.enum.create),
			source: team ?? container.organizational_unit ?? container.organization,
			subordinates
		}
	};
}

type GrantMode = 'matrix' | 'roles';

// Facade combining a user's ability with the per-container enrichment: checks
// run against the container as the server would hand it out — grants composed
// from the stored matrix rows, or derived from member roles while the
// permission matrix feature is off.
function abilityOn(
	overrides: z.input<typeof testUser> = {},
	source?: string,
	mode: GrantMode = 'matrix'
) {
	const user = makeUser(overrides);
	const ability = defineAbilityFor(user);
	return {
		can: (
			action: 'create' | 'read' | 'update' | 'delete' | 'manage-users',
			container: TestContainer,
			field?: string
		) =>
			ability.can(
				action,
				mode === 'matrix' ? enrich(container, user, source) : enrichFromRoles(container, user),
				field
			)
	};
}

describe('anonymous users', () => {
	const ability = abilityOn({ isAuthenticated: false });

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
	const ability = abilityOn({ roles: ['sysadmin'] });

	test('has unconditional access regardless of matrix and membership', () => {
		const container = makeContainer(payloadTypes.enum.measure, { managed_by: otherTeam });
		expect(ability.can('create', container)).toBe(true);
		expect(ability.can('read', container)).toBe(true);
		expect(ability.can('update', container)).toBe(true);
		expect(ability.can('delete', container)).toBe(true);
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(true);
	});
});

describe('create, update and delete via the governing matrix', () => {
	// the container is governed by the matrix of its managing team
	test.for([
		['adminOf', { adminOf: [team] }],
		['collaboratorOf', { collaboratorOf: [team] }],
		['headOf', { headOf: [team] }]
	] as [string, z.input<typeof testUser>][])(
		'a user with the %s role on the governing matrix may modify',
		([, overrides]) => {
			const ability = abilityOn(overrides, team);
			const measure = makeContainer(payloadTypes.enum.measure);
			expect(ability.can('create', measure)).toBe(true);
			expect(ability.can('update', measure)).toBe(true);
			expect(ability.can('delete', measure)).toBe(true);
			expect(ability.can('update', makeContainer(payloadTypes.enum.program))).toBe(true);
		}
	);

	test('a user without a role on the governing matrix may not modify', () => {
		const ability = abilityOn({ adminOf: [otherTeam], memberOf: [team] }, team);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(false);
		expect(ability.can('update', measure)).toBe(false);
		expect(ability.can('delete', measure)).toBe(false);
	});

	test('membership alone does not grant modification', () => {
		const ability = abilityOn({ memberOf: [team] }, team);
		expect(ability.can('update', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});

	test('rows on another matrix grant nothing — the governing one decides', () => {
		// the derivation resolves to the nearest decoupled matrix; rows the user
		// holds elsewhere, even on an ancestor, do not act
		const ability = abilityOn({ adminOf: [otherTeam] }, team);
		const measure = makeContainer(payloadTypes.enum.measure, { managed_by: [otherTeam, team] });
		expect(ability.can('create', measure)).toBe(false);
		expect(ability.can('update', measure)).toBe(false);
		expect(ability.can('delete', measure)).toBe(false);
		expect(ability.can('read', measure)).toBe(false);
	});

	test('containers belonging to the organizational unit are modifiable by unit admins', () => {
		// Unit admins qualify through the area overlay, no matter which matrix
		// governs the container.
		const ability = abilityOn({ adminOf: [organizationalUnit] }, team);
		const measure = makeContainer(payloadTypes.enum.measure, {
			managed_by: otherTeam,
			organizational_unit: organizationalUnit
		});
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
	});
});

describe('categories and terms via the governing matrix', () => {
	test('admins keep full control while heads may only update them', () => {
		// creating and deleting categories requires the full self set on the
		// governing matrix, which only the admin role carries
		const admin = abilityOn({ adminOf: [team] }, team);
		const category = makeContainer(payloadTypes.enum.category);
		expect(admin.can('create', category)).toBe(true);
		expect(admin.can('update', category)).toBe(true);
		expect(admin.can('delete', category)).toBe(true);

		const head = abilityOn({ headOf: [team] }, team);
		expect(head.can('create', category)).toBe(false);
		expect(head.can('update', category)).toBe(true);
		expect(head.can('delete', category)).toBe(false);
		expect(head.can('update', makeContainer(payloadTypes.enum.term))).toBe(true);
	});

	test('collaborators may update but neither add nor remove them', () => {
		const ability = abilityOn({ collaboratorOf: [team] }, team);
		const category = makeContainer(payloadTypes.enum.category);
		expect(ability.can('create', category)).toBe(false);
		expect(ability.can('update', category)).toBe(true);
		expect(ability.can('delete', category)).toBe(false);
	});
});

describe('manage-users via the governing matrix', () => {
	test('is granted to admins and heads for programs and measures', () => {
		for (const overrides of [{ adminOf: [team] }, { headOf: [team] }]) {
			const ability = abilityOn(overrides, team);
			expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(true);
			expect(ability.can('manage-users', makeContainer(payloadTypes.enum.measure))).toBe(true);
		}
	});

	test('is not granted to collaborators', () => {
		const ability = abilityOn({ collaboratorOf: [team] }, team);
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(false);
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});
});

describe('task prioritization requires the update permission', () => {
	test('is granted to collaborators and denied to mere members', () => {
		expect(
			abilityOn({ collaboratorOf: [team] }, team).can(
				'update',
				makeContainer(payloadTypes.enum.task)
			)
		).toBe(true);
		expect(
			abilityOn({ memberOf: [team] }, team).can('update', makeContainer(payloadTypes.enum.task))
		).toBe(false);
	});
});

describe('read visibility via the governing matrix', () => {
	test('members of the governing matrix may read members-only containers', () => {
		const ability = abilityOn({ memberOf: [team] }, team);
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(true);
	});

	test('members of the governing matrix may read organization-visibility containers', () => {
		const ability = abilityOn({ memberOf: [team] }, team);
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.organization })
			)
		).toBe(true);
	});

	test('non-members may not read members-only containers', () => {
		const ability = abilityOn({ memberOf: [otherTeam] }, team);
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});

	test('organization members may read organization-visibility containers', () => {
		const ability = abilityOn({ memberOf: [organization] });
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
		expect(abilityOn({}).can('read', container)).toBe(true);
		expect(
			abilityOn({ guid: anotherUserGuid, adminOf: [organization] }).can('read', container)
		).toBe(true);
		expect(
			abilityOn({ guid: anotherUserGuid, memberOf: [team, organization] }, team).can(
				'read',
				container
			)
		).toBe(false);
	});
});

describe('field-level rules', () => {
	test('roles on the governing matrix may update chapterType and editorialState', () => {
		// The general update rule carries no field restriction, so it also
		// covers these fields for collaborators.
		const ability = abilityOn({ collaboratorOf: [team] }, team);
		expect(ability.can('update', makeContainer(payloadTypes.enum.program), 'chapterType')).toBe(
			true
		);
		expect(
			ability.can('update', makeContainer(payloadTypes.enum.measure), 'payload.editorialState')
		).toBe(true);
	});

	test('members of the governing matrix may read the editorial state', () => {
		const ability = abilityOn({ memberOf: [team] }, team);
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
		for (const overrides of [{ adminOf: [organization] }, { headOf: [organization] }]) {
			const ability = abilityOn(overrides);
			const org = makeContainer(
				payloadTypes.enum.organization,
				{ guid: organization, managed_by: organization },
				{ name: 'Org', title: undefined }
			);
			expect(ability.can('update', org, 'payload.name')).toBe(true);
			expect(ability.can('update', org, 'payload.customDomain')).toBe(false);
		}
	});

	test('the organization and organizational_unit fields are protected', () => {
		const ability = abilityOn({ adminOf: [organization] });
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure, 'organization')).toBe(false);
		// Re-parenting into another organizational unit is explicitly allowed
		// for those the area grants update.
		expect(ability.can('update', measure, 'organizational_unit')).toBe(true);
	});

	test('members of a governing matrix may not move content between units', () => {
		const ability = abilityOn({ collaboratorOf: [team] }, team);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('update', measure, 'organizational_unit')).toBe(false);
	});

	test('while the matrix is off, organization roles stay scope-sourced beside a team', () => {
		// the pre-matrix rules let organization-wide roles move content between
		// units even when the container carries a team of its own
		const teamed = makeContainer(payloadTypes.enum.measure, { guid: team });
		// with the matrix on, the team's own matrix governs and is not scope-sourced
		const organizationHead = abilityOn({ headOf: [organization], collaboratorOf: [team] }, team);
		expect(organizationHead.can('update', teamed, 'organizational_unit')).toBe(false);
		const roleMode = abilityOn(
			{ headOf: [organization], collaboratorOf: [team] },
			undefined,
			'roles'
		);
		expect(roleMode.can('update', teamed, 'organizational_unit')).toBe(true);
		const teamOnly = abilityOn({ collaboratorOf: [team] }, undefined, 'roles');
		expect(teamOnly.can('update', teamed, 'organizational_unit')).toBe(false);
	});

	test('the indicator category follows the update grant', () => {
		const ability = abilityOn({ adminOf: [organization] });
		const template = makeContainer(payloadTypes.enum.indicator_template, {}, { unit: '%' });
		expect(ability.can('update', template, 'indicatorCategory')).toBe(true);
	});
});

// The complete permission matrix of the role-based system: one test per member
// role × payload type × scope, pinning which of the four basic actions the
// role permits on an object belonging to that scope. This is the baseline
// carried over from the role-based system through the session-grant rules to
// the computed per-container grants — it must reproduce exactly this matrix.
//
// The objects are modelled the way scope-owned content is stored: governed by
// the scope itself with members-only visibility. Creating is checked against
// the scope object as the parent, with the payload type as the field.

const basicActions = ['read', 'create', 'update', 'delete'] as const;

type BasicAction = (typeof basicActions)[number];

const allBasicActions: BasicAction[] = ['read', 'create', 'update', 'delete'];
const readAndUpdate: BasicAction[] = ['read', 'update'];
const readOnly: BasicAction[] = ['read'];

type Scope = 'organization' | 'organizational unit';

function scopeGuidOf(scope: Scope) {
	return scope === 'organization' ? organization : organizationalUnit;
}

function userWithRoleOn(role: MemberRole, scope: Scope) {
	const guid = scopeGuidOf(scope);
	return {
		adminOf: role === memberRoles.enum.administrator ? [guid] : [],
		collaboratorOf: role === memberRoles.enum.collaborator ? [guid] : [],
		headOf: role === memberRoles.enum.head ? [guid] : [],
		memberOf: [guid]
	};
}

// some payload schemas require more than a title
const requiredPayloadFields: Partial<Record<PayloadType, Record<string, unknown>>> = {
	[payloadTypes.enum.actual_data]: { indicator: crypto.randomUUID() },
	[payloadTypes.enum.chapter]: { number: '1' },
	[payloadTypes.enum.indicator_template]: { unit: 'unit.euro' },
	[payloadTypes.enum.object_collection]: { objectType: payloadTypes.enum.goal },
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

// help sections, html sections and the organization itself belong to the
// organization no matter the scope at hand
const organizationOwnedTypes: PayloadType[] = [
	payloadTypes.enum.help,
	payloadTypes.enum.html,
	payloadTypes.enum.organization
];

function scopedContainer(scope: Scope, type: PayloadType) {
	const namedByTitle =
		type !== payloadTypes.enum.organization && type !== payloadTypes.enum.organizational_unit;
	return testContainer.parse({
		// the organization and the organizational unit carry their own guid,
		// which the enrichment resolves to their own matrix
		...(type === payloadTypes.enum.organization ? { guid: organization } : {}),
		...(type === payloadTypes.enum.organizational_unit ? { guid: organizationalUnit } : {}),
		managed_by: scopeGuidOf(scope),
		organization,
		organizational_unit:
			scope === 'organizational unit' && !organizationOwnedTypes.includes(type)
				? organizationalUnit
				: null,
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
			// these belong to the organization, so unit roles yield no rights;
			// with members-only visibility they are the organization's members'
			// business, so unit roles alone no longer read them either
			types: [payloadTypes.enum.help, payloadTypes.enum.html, payloadTypes.enum.organization],
			permitted: {
				administrator: [],
				head: [],
				collaborator: [],
				observer: []
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
	if (actions.length === 0) {
		return 'do nothing with';
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

	// The same cells must hold in both modes of the feature switch: with the
	// permission matrix on (grants composed from stored rows) and off (grants
	// derived from the member roles, the pre-matrix behavior).
	for (const mode of ['matrix', 'roles'] as GrantMode[]) {
		for (const scope of Object.keys(permissionMatrix) as Scope[]) {
			describe(`objects belonging to an ${scope} (${mode} mode)`, () => {
				for (const { types, permitted } of permissionMatrix[scope]) {
					for (const role of memberRoles.options) {
						const ability = abilityOn(userWithRoleOn(role, scope), undefined, mode);
						test.for(types)(`a ${role} may ${inWords(permitted[role])}: %s`, (type) => {
							expect(
								basicActions.filter((action) => ability.can(action, scopedContainer(scope, type)))
							).toEqual(permitted[role]);
						});
					}
				}

				test('a registered user without a role in the scope has no access', () => {
					const ability = abilityOn({}, undefined, mode);
					const measure = scopedContainer(scope, payloadTypes.enum.measure);
					expect(basicActions.filter((action) => ability.can(action, measure))).toEqual([]);
				});
			});
		}
	}
});

describe('scope rules apply while content inherits', () => {
	// Content managed by a team that has no matrix of its own follows the
	// scope: all scope roles reach it according to their grants.
	for (const scope of ['organization', 'organizational unit'] as Scope[]) {
		const measure = makeContainer(payloadTypes.enum.measure, {
			managed_by: otherTeam,
			organizational_unit: scope === 'organizational unit' ? organizationalUnit : null
		});

		test.for([memberRoles.enum.administrator, memberRoles.enum.head] as MemberRole[])(
			`a %s modifies content of the ${scope} managed by another team`,
			(role) => {
				const ability = abilityOn(userWithRoleOn(role, scope));
				expect(ability.can('create', measure)).toBe(true);
				expect(ability.can('update', measure)).toBe(true);
				expect(ability.can('delete', measure)).toBe(true);
			}
		);

		test(`a collaborator of the ${scope} reaches content managed by another team as well`, () => {
			const ability = abilityOn(userWithRoleOn(memberRoles.enum.collaborator, scope));
			expect(ability.can('create', measure)).toBe(true);
			expect(ability.can('update', measure)).toBe(true);
			expect(ability.can('delete', measure)).toBe(true);
		});

		test.for([memberRoles.enum.administrator, memberRoles.enum.head] as MemberRole[])(
			`a %s manages users of measures in the ${scope} managed by another team`,
			(role) => {
				const ability = abilityOn(userWithRoleOn(role, scope));
				expect(ability.can('manage-users', measure)).toBe(true);
			}
		);
	}

	test('members read the organizational unit itself regardless of managed_by', () => {
		const ability = abilityOn({ memberOf: [organizationalUnit] });
		for (const unitVisibility of [visibility.enum.members, visibility.enum.organization]) {
			const unit = makeContainer(
				payloadTypes.enum.organizational_unit,
				{ guid: organizationalUnit, managed_by: otherTeam },
				{ name: 'Unit', title: undefined, visibility: unitVisibility }
			);
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
			const ability = abilityOn(userWithRoleOn(role, scope));
			test.for(payloadTypes.options)(
				`a ${role} of an ${scope} may ${mayManage ? 'manage users of the supporting types' : 'never manage users'}: %s`,
				(type) => {
					// managing the users of the organization object itself requires
					// rows on its own matrix, which only admins carry
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

describe('read access to matrix-governed content within the scope', () => {
	// content whose team has decoupled its matrix is readable only as far as
	// that matrix or the area administrators allow; while the team inherits,
	// the scope governs the visibility
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
		test(`members-only content behind a decoupled matrix in an ${scope} is readable by its admins only`, () => {
			const container = teamManagedMeasure(scope, visibility.enum.members);
			expect(
				memberRoles.options.filter((role) =>
					abilityOn(userWithRoleOn(role, scope), team).can('read', container)
				)
			).toEqual([memberRoles.enum.administrator]);
		});

		test(`members-only content of an inheriting team in an ${scope} is readable by every member`, () => {
			const container = teamManagedMeasure(scope, visibility.enum.members);
			expect(
				memberRoles.options.filter((role) =>
					abilityOn(userWithRoleOn(role, scope)).can('read', container)
				)
			).toEqual(memberRoles.options);
		});

		test(`organization-visibility content of an inheriting team in an ${scope} is readable by every member`, () => {
			const container = teamManagedMeasure(scope, visibility.enum.organization);
			expect(
				memberRoles.options.filter((role) =>
					abilityOn(userWithRoleOn(role, scope)).can('read', container)
				)
			).toEqual(memberRoles.options);
		});
	}

	test('creator-visibility content is readable by organization admins but not unit admins', () => {
		const container = teamManagedMeasure('organization', visibility.enum.creator);
		expect(
			memberRoles.options.filter((role) =>
				abilityOn(userWithRoleOn(role, 'organization'), team).can('read', container)
			)
		).toEqual([memberRoles.enum.administrator]);

		const unitContainer = teamManagedMeasure('organizational unit', visibility.enum.creator);
		expect(
			memberRoles.options.filter((role) =>
				abilityOn(userWithRoleOn(role, 'organizational unit'), team).can('read', unitContainer)
			)
		).toEqual([]);
	});
});

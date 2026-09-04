import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import defineAbilityFor, {
	grantKindsForRoleOn,
	grantKindsForRoleOnSubordinates
} from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	emptyGrantRecords,
	type GrantKind,
	grantKinds,
	type GrantRecords,
	grantRecordsForRoleOn,
	grantTargets,
	type MemberRole,
	memberRoles,
	newContainer,
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
	familyName: z.string().default('Muster'),
	givenName: z.string().default('Erika'),
	grants: z.custom<GrantRecords>().default(emptyGrantRecords),
	guid: z.string().default(userGuid),
	isAuthenticated: z.boolean().default(true),
	roles: z.array(z.string()).default([]),
	settings: z.object({ features: z.array(z.string()).optional() }).default({})
});

// Merges the grants the given member roles map to on the given containers into
// one session-shaped record, mirroring what the migration backfill produces.
function grantsForRoles(...assignments: Array<[MemberRole, string]>): GrantRecords {
	const records = emptyGrantRecords();
	for (const [role, object] of assignments) {
		const forRole = grantRecordsForRoleOn(role, object);
		for (const target of grantTargets.options) {
			for (const kind of grantKinds.options) {
				records[target][kind].push(...forRole[target][kind]);
			}
		}
	}
	return records;
}

// An individually edited set of grants on a single container, as the editable
// permission matrix stores it.
function grantsOn(
	object: string,
	set: { self?: GrantKind[]; subordinates?: GrantKind[] }
): GrantRecords {
	const records = emptyGrantRecords();
	for (const kind of set.self ?? []) {
		records.self[kind].push(object);
	}
	for (const kind of set.subordinates ?? []) {
		records.subordinates[kind].push(object);
	}
	return records;
}

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

	test('has unconditional access regardless of managed_by and grants', () => {
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
		['administrator', makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, team]) })],
		['collaborator', makeUser({ grants: grantsForRoles([memberRoles.enum.collaborator, team]) })],
		['head', makeUser({ grants: grantsForRoles([memberRoles.enum.head, team]) })]
	] as const)('a user with the %s role on the managing team may modify', ([, user]) => {
		const ability = defineAbilityFor(user);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
		expect(ability.can('update', makeContainer(payloadTypes.enum.program))).toBe(true);
	});

	test('a user without modifying grants on the managing team may not modify', () => {
		const ability = defineAbilityFor(
			makeUser({
				grants: grantsForRoles(
					[memberRoles.enum.administrator, otherTeam],
					[memberRoles.enum.observer, team]
				)
			})
		);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(false);
		expect(ability.can('update', measure)).toBe(false);
		expect(ability.can('delete', measure)).toBe(false);
	});

	test('the read grant alone does not allow modification', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.observer, team]) })
		);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure)).toBe(false);
	});

	test('containers managed by the organizational unit are modifiable by unit admins', () => {
		// Without a team of its own, managed_by defaults to the organizational
		// unit (or organization), so unit admins qualify via the managed_by rule.
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, organizationalUnit]) })
		);
		const measure = makeContainer(payloadTypes.enum.measure, {
			managed_by: organizationalUnit,
			organizational_unit: organizationalUnit
		});
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
	});

	test('individual grants take effect kind by kind', () => {
		const measure = makeContainer(payloadTypes.enum.measure);
		const updateOnly = defineAbilityFor(
			makeUser({ grants: grantsOn(team, { subordinates: ['read', 'update'] }) })
		);
		expect(updateOnly.can('update', measure)).toBe(true);
		expect(updateOnly.can('create', measure)).toBe(false);
		expect(updateOnly.can('delete', measure)).toBe(false);

		const createOnly = defineAbilityFor(
			makeUser({ grants: grantsOn(team, { subordinates: ['create'] }) })
		);
		expect(createOnly.can('create', measure)).toBe(true);
		expect(createOnly.can('update', measure)).toBe(false);
	});

	test('grants on the object itself do not extend to subordinate objects', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsOn(team, { self: ['read', 'update'] }) })
		);
		expect(ability.can('update', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});
});

describe('categories and terms', () => {
	test('fully self-managed subjects may create, update and delete them', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, organization]) })
		);
		const category = makeContainer(payloadTypes.enum.category, { managed_by: organization });
		expect(ability.can('create', category)).toBe(true);
		expect(ability.can('update', category)).toBe(true);
		expect(ability.can('delete', category)).toBe(true);
		expect(
			ability.can('update', makeContainer(payloadTypes.enum.term, { managed_by: organization }))
		).toBe(true);
	});

	test('heads may update but no longer create or delete them', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.head, organization]) })
		);
		const category = makeContainer(payloadTypes.enum.category, { managed_by: organization });
		expect(ability.can('update', category)).toBe(true);
		expect(ability.can('create', category)).toBe(false);
		expect(ability.can('delete', category)).toBe(false);
	});

	test('collaborators may update but not create or delete them', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.collaborator, organization]) })
		);
		const category = makeContainer(payloadTypes.enum.category, { managed_by: organization });
		expect(ability.can('update', category)).toBe(true);
		expect(ability.can('create', category)).toBe(false);
		expect(ability.can('delete', category)).toBe(false);
	});
});

describe('help sections and organizational units follow the organization rules', () => {
	const admin = defineAbilityFor(
		makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, organization]) })
	);
	const head = defineAbilityFor(
		makeUser({ grants: grantsForRoles([memberRoles.enum.head, organization]) })
	);

	const unit = testContainer.parse({
		payload: { name: 'Unit', type: payloadTypes.enum.organizational_unit }
	});

	test('creating and deleting requires full rights on the organization object', () => {
		const help = makeContainer(payloadTypes.enum.help);
		expect(admin.can('create', help)).toBe(true);
		expect(admin.can('delete', help)).toBe(true);
		expect(admin.can('create', unit)).toBe(true);
		expect(admin.can('delete', unit)).toBe(true);
		expect(head.can('create', help)).toBe(false);
		expect(head.can('delete', unit)).toBe(false);
	});

	test('updating follows the subordinate update grant', () => {
		expect(head.can('update', makeContainer(payloadTypes.enum.help))).toBe(true);
		expect(head.can('update', unit)).toBe(true);
	});

	test('html sections stay reserved for sysadmins', () => {
		const html = makeContainer(payloadTypes.enum.html);
		expect(admin.can('create', html)).toBe(false);
		expect(admin.can('update', html)).toBe(false);
		expect(admin.can('delete', html)).toBe(false);
		expect(defineAbilityFor(makeUser({ roles: ['sysadmin'] })).can('create', html)).toBe(true);
	});
});

describe('manage-users via managed_by', () => {
	test('is granted to admins and heads for programs and measures', () => {
		for (const role of [memberRoles.enum.administrator, memberRoles.enum.head]) {
			const ability = defineAbilityFor(makeUser({ grants: grantsForRoles([role, team]) }));
			expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(true);
			expect(ability.can('manage-users', makeContainer(payloadTypes.enum.measure))).toBe(true);
		}
	});

	test('is not granted to collaborators via managed_by', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.collaborator, team]) })
		);
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.program))).toBe(false);
		expect(ability.can('manage-users', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});
});

describe('task prioritization requires the update permission', () => {
	test('is granted to collaborators and denied to mere observers', () => {
		expect(
			defineAbilityFor(
				makeUser({ grants: grantsForRoles([memberRoles.enum.collaborator, team]) })
			).can('update', makeContainer(payloadTypes.enum.task))
		).toBe(true);
		expect(
			defineAbilityFor(makeUser({ grants: grantsForRoles([memberRoles.enum.observer, team]) })).can(
				'update',
				makeContainer(payloadTypes.enum.task)
			)
		).toBe(false);
	});
});

describe('read visibility via managed_by', () => {
	test('members of the managing team may read members-only containers', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.observer, team]) })
		);
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(true);
	});

	test('members of the managing team may read organization-visibility containers', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.observer, team]) })
		);
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.organization })
			)
		).toBe(true);
	});

	test('non-members may not read members-only containers', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.observer, otherTeam]) })
		);
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});

	test('organization members may read organization-visibility containers', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.observer, organization]) })
		);
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
			defineAbilityFor(
				makeUser({
					guid: anotherUserGuid,
					grants: grantsForRoles([memberRoles.enum.administrator, organization])
				})
			).can('read', container)
		).toBe(true);
		expect(
			defineAbilityFor(
				makeUser({
					guid: anotherUserGuid,
					grants: grantsForRoles(
						[memberRoles.enum.observer, team],
						[memberRoles.enum.observer, organization]
					)
				})
			).can('read', container)
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

	test('modifying grants on one of the managing teams suffice', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.collaborator, team]) })
		);
		expect(ability.can('create', container)).toBe(true);
		expect(ability.can('update', container)).toBe(true);
		expect(ability.can('delete', container)).toBe(true);
	});

	test('admins and heads of one of the managing teams may invite members', () => {
		expect(
			defineAbilityFor(
				makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, team]) })
			).can('manage-users', container)
		).toBe(true);
		expect(
			defineAbilityFor(
				makeUser({ grants: grantsForRoles([memberRoles.enum.head, otherTeam]) })
			).can('manage-users', container)
		).toBe(true);
	});

	test('grants on none of the managing teams yield nothing', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, organizationalUnit]) })
		);
		expect(ability.can('create', container)).toBe(false);
		expect(ability.can('update', container)).toBe(false);
		expect(ability.can('delete', container)).toBe(false);
		expect(ability.can('read', container)).toBe(false);
	});

	test('membership in one of the managing teams suffices to read', () => {
		expect(
			defineAbilityFor(makeUser({ grants: grantsForRoles([memberRoles.enum.observer, team]) })).can(
				'read',
				container
			)
		).toBe(true);
		expect(
			defineAbilityFor(
				makeUser({ grants: grantsForRoles([memberRoles.enum.observer, otherTeam]) })
			).can('read', container)
		).toBe(true);
		expect(
			defineAbilityFor(
				makeUser({ grants: grantsForRoles([memberRoles.enum.observer, organizationalUnit]) })
			).can('read', container)
		).toBe(false);
	});
});

describe('field-level rules', () => {
	test('modifying grants on the managing team allow updating chapterType and editorialState', () => {
		// The general update rule conditioned on managed_by carries no field
		// restriction, so it also covers these fields for collaborators.
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.collaborator, team]) })
		);
		expect(ability.can('update', makeContainer(payloadTypes.enum.program), 'chapterType')).toBe(
			true
		);
		expect(
			ability.can('update', makeContainer(payloadTypes.enum.measure), 'payload.editorialState')
		).toBe(true);
	});

	test('members of the managing team may read the editorial state', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.observer, team]) })
		);
		expect(
			ability.can('read', makeContainer(payloadTypes.enum.measure), 'payload.editorialState')
		).toBe(true);
		expect(ability.can('read', makeContainer(payloadTypes.enum.task), 'assignee')).toBe(true);
	});

	test('the organization and organizational_unit fields are protected', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, organization]) })
		);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure, 'organization')).toBe(false);
		// Re-parenting into another organizational unit is explicitly allowed
		// with the subordinate update grant on the organization.
		expect(ability.can('update', measure, 'organizational_unit')).toBe(true);
	});

	test('the indicator category of indicator templates is immutable', () => {
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.administrator, organization]) })
		);
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
		for (const role of [memberRoles.enum.administrator, memberRoles.enum.head]) {
			const ability = defineAbilityFor(makeUser({ grants: grantsForRoles([role, organization]) }));
			expect(ability.can('create', template)).toBe(true);
			expect(ability.can('update', template)).toBe(true);
			expect(ability.can('delete', template)).toBe(true);
		}
	});

	test('collaborators of the organization manage them organization-wide as well', () => {
		// The subordinate grants of the organization apply to everything within
		// its scope, so a collaborator now also reaches an indicator template
		// that is managed by a team they are not part of.
		const ability = defineAbilityFor(
			makeUser({ grants: grantsForRoles([memberRoles.enum.collaborator, organization]) })
		);
		expect(ability.can('create', template)).toBe(true);
		expect(ability.can('update', template)).toBe(true);
		expect(ability.can('delete', template)).toBe(true);

		const foreign = makeContainer(
			payloadTypes.enum.indicator_template,
			{ managed_by: team, organization },
			{ unit: '%' }
		);
		expect(ability.can('update', foreign)).toBe(true);
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

	test('organization: nobody creates or deletes, only admins manage members', () => {
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
		expect(grantKindsForRoleOn(org, viewer, memberRoles.enum.collaborator)).toEqual([
			'read',
			'update'
		]);
		expect(grantKindsForRoleOn(org, viewer, memberRoles.enum.head)).toEqual(['read', 'update']);
		expect(grantKindsForRoleOn(org, viewer, memberRoles.enum.administrator)).toEqual([
			'read',
			'update',
			'manage-users'
		]);
	});

	test('organizational unit: only admins manage members', () => {
		const unitGuid = crypto.randomUUID();
		const unit = withGuid(
			testContainer.parse({
				managed_by: unitGuid,
				payload: { name: 'Unit', type: payloadTypes.enum.organizational_unit }
			}) as ReturnType<typeof makeContainer>,
			unitGuid
		);

		expect(grantKindsForRoleOn(unit, viewer, memberRoles.enum.head)).toEqual(['read', 'update']);
		expect(grantKindsForRoleOn(unit, viewer, memberRoles.enum.administrator)).toEqual([
			'read',
			'update',
			'manage-users'
		]);
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
			'manage-users'
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

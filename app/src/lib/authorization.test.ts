import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import defineAbilityFor, { grantKindsForKindsOn, grantKindsForRoleOn } from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	grantKindsForRole,
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
	creatableOf: z.array(z.string()).default([]),
	deletableOf: z.array(z.string()).default([]),
	familyName: z.string().default('Muster'),
	givenName: z.string().default('Erika'),
	guid: z.string().default(userGuid),
	isAuthenticated: z.boolean().default(true),
	manageMembersOf: z.array(z.string()).default([]),
	readableOf: z.array(z.string()).default([]),
	roles: z.array(z.string()).default([]),
	settings: z.object({ features: z.array(z.string()).optional() }).default({}),
	updatableOf: z.array(z.string()).default([])
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

const kindFields = {
	create: 'creatableOf',
	delete: 'deletableOf',
	'manage-members': 'manageMembersOf',
	read: 'readableOf',
	update: 'updatableOf'
} as const;

// Most assertions read as "role X may do Y": the helper grants the kinds of
// the member role on the given containers, mirroring what syncContainerGrants
// writes for that role.
function makeUserWithRole(
	role: MemberRole,
	guids: string[],
	overrides: z.input<typeof testUser> = {}
): User {
	return makeUser({
		...Object.fromEntries(grantKindsForRole(role).map((kind) => [kindFields[kind], guids])),
		...overrides
	});
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
		expect(ability.can('relate', container)).toBe(true);
		expect(ability.can('delete-recursively', container)).toBe(true);
		expect(ability.can('invite-members', makeContainer(payloadTypes.enum.program))).toBe(true);
		expect(ability.can('prioritize', makeContainer(payloadTypes.enum.task))).toBe(true);
	});
});

describe('create, update and delete via managed_by', () => {
	test.for([
		['administrator', makeUserWithRole(memberRoles.enum.administrator, [team])],
		['collaborator', makeUserWithRole(memberRoles.enum.collaborator, [team])],
		['head', makeUserWithRole(memberRoles.enum.head, [team])]
	] as const)('a user with the %s role on the managing team may modify', ([, user]) => {
		const ability = defineAbilityFor(user);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
		expect(ability.can('update', makeContainer(payloadTypes.enum.program))).toBe(true);
		expect(ability.can('relate', measure)).toBe(true);
	});

	test('a user without grants on the managing team may not modify', () => {
		const ability = defineAbilityFor(
			makeUserWithRole(memberRoles.enum.administrator, [otherTeam], { readableOf: [team] })
		);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(false);
		expect(ability.can('update', measure)).toBe(false);
		expect(ability.can('delete', measure)).toBe(false);
		expect(ability.can('relate', measure)).toBe(false);
	});

	test('the read kind alone does not grant modification', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team]));
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure)).toBe(false);
	});

	test('each kind grants exactly its own action', () => {
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(defineAbilityFor(makeUser({ creatableOf: [team] })).can('create', measure)).toBe(true);
		expect(defineAbilityFor(makeUser({ creatableOf: [team] })).can('update', measure)).toBe(false);
		expect(defineAbilityFor(makeUser({ deletableOf: [team] })).can('delete', measure)).toBe(true);
		expect(defineAbilityFor(makeUser({ deletableOf: [team] })).can('update', measure)).toBe(false);
		expect(defineAbilityFor(makeUser({ deletableOf: [team] })).can('read', measure)).toBe(false);
		expect(defineAbilityFor(makeUser({ updatableOf: [team] })).can('update', measure)).toBe(true);
		expect(defineAbilityFor(makeUser({ updatableOf: [team] })).can('delete', measure)).toBe(false);
	});

	test('containers managed by the organizational unit are modifiable by unit admins', () => {
		// Without a team of its own, managed_by defaults to the organizational
		// unit (or organization), so unit admins qualify via the managed_by rule.
		const ability = defineAbilityFor(
			makeUserWithRole(memberRoles.enum.administrator, [organizationalUnit])
		);
		const measure = makeContainer(payloadTypes.enum.measure, {
			managed_by: organizationalUnit,
			organizational_unit: organizationalUnit
		});
		expect(ability.can('create', measure)).toBe(true);
		expect(ability.can('update', measure)).toBe(true);
		expect(ability.can('delete', measure)).toBe(true);
	});
});

describe('delete-recursively via managed_by', () => {
	test('is granted with the delete kind for goals, programs and measures', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.collaborator, [team]));
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.goal))).toBe(true);
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.program))).toBe(true);
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.measure))).toBe(true);
	});

	test('is not granted with the read kind alone', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team]));
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.goal))).toBe(false);
	});
});

describe('categories and terms via managed_by', () => {
	test('roles with the respective kinds may manage them', () => {
		for (const user of [
			makeUserWithRole(memberRoles.enum.administrator, [team]),
			makeUserWithRole(memberRoles.enum.head, [team]),
			makeUserWithRole(memberRoles.enum.collaborator, [team])
		]) {
			const ability = defineAbilityFor(user);
			const category = makeContainer(payloadTypes.enum.category);
			expect(ability.can('create', category)).toBe(true);
			expect(ability.can('update', category)).toBe(true);
			expect(ability.can('delete', category)).toBe(true);
			expect(ability.can('delete-recursively', category)).toBe(true);
			expect(ability.can('update', makeContainer(payloadTypes.enum.term))).toBe(true);
		}
	});

	test('the read kind alone does not manage them', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team]));
		const category = makeContainer(payloadTypes.enum.category);
		expect(ability.can('create', category)).toBe(false);
		expect(ability.can('update', category)).toBe(false);
		expect(ability.can('delete', category)).toBe(false);
	});
});

describe('invite-members via managed_by', () => {
	test('is granted with the manage-members kind for programs and measures', () => {
		for (const user of [
			makeUserWithRole(memberRoles.enum.administrator, [team]),
			makeUserWithRole(memberRoles.enum.head, [team])
		]) {
			const ability = defineAbilityFor(user);
			expect(ability.can('invite-members', makeContainer(payloadTypes.enum.program))).toBe(true);
			expect(ability.can('invite-members', makeContainer(payloadTypes.enum.measure))).toBe(true);
		}
	});

	test('is not granted to collaborators via managed_by', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.collaborator, [team]));
		expect(ability.can('invite-members', makeContainer(payloadTypes.enum.program))).toBe(false);
		expect(ability.can('invite-members', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});
});

describe('task prioritization via managed_by', () => {
	test('is granted with the update kind and denied with read alone', () => {
		expect(
			defineAbilityFor(makeUserWithRole(memberRoles.enum.collaborator, [team])).can(
				'prioritize',
				makeContainer(payloadTypes.enum.task)
			)
		).toBe(true);
		expect(
			defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team])).can(
				'prioritize',
				makeContainer(payloadTypes.enum.task)
			)
		).toBe(false);
	});
});

describe('exceptions kept with the manage-members kind', () => {
	test('the organization profile is not updatable via the update kind', () => {
		const org = testContainer.parse({
			managed_by: organization,
			organization,
			payload: { name: 'Org', type: payloadTypes.enum.organization }
		});
		expect(defineAbilityFor(makeUser({ updatableOf: [organization] })).can('update', org)).toBe(
			false
		);
		expect(defineAbilityFor(makeUser({ manageMembersOf: [organization] })).can('update', org)).toBe(
			true
		);
	});

	test('organizational units are created and deleted via the manage-members kind', () => {
		const unit = testContainer.parse({
			managed_by: organization,
			payload: { name: 'Unit', type: payloadTypes.enum.organizational_unit }
		});
		const creator = defineAbilityFor(makeUser({ creatableOf: [organization] }));
		expect(creator.can('create', unit)).toBe(false);
		expect(creator.can('delete', unit)).toBe(false);
		const manager = defineAbilityFor(makeUser({ manageMembersOf: [organization] }));
		expect(manager.can('create', unit)).toBe(true);
		expect(manager.can('delete', unit)).toBe(true);
		// updating the unit profile follows the update kind
		expect(defineAbilityFor(makeUser({ updatableOf: [organization] })).can('update', unit)).toBe(
			true
		);
	});

	test('organization-wide members-visible content stays with the manage-members kind', () => {
		const measure = makeContainer(payloadTypes.enum.measure, { managed_by: otherTeam });
		expect(defineAbilityFor(makeUser({ readableOf: [organization] })).can('read', measure)).toBe(
			false
		);
		expect(
			defineAbilityFor(makeUser({ manageMembersOf: [organization] })).can('read', measure)
		).toBe(true);
	});
});

describe('read visibility via managed_by', () => {
	test('the read kind on the managing team grants reading members-only containers', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team]));
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(true);
	});

	test('the read kind on the managing team grants reading organization-visibility containers', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team]));
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.organization })
			)
		).toBe(true);
	});

	test('without the read kind members-only containers stay hidden', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [otherTeam]));
		expect(ability.can('read', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});

	test('the read kind on the organization grants reading organization-visibility containers', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [organization]));
		expect(
			ability.can(
				'read',
				makeContainer(payloadTypes.enum.measure, {}, { visibility: visibility.enum.organization })
			)
		).toBe(true);
	});

	test('creator-visibility containers are readable by their creator and member managers only', () => {
		const creatorRelation = [{ predicate: predicates.enum['is-creator-of'], subject: userGuid }];
		const container = makeContainer(
			payloadTypes.enum.measure,
			{ user: creatorRelation },
			{ visibility: visibility.enum.creator }
		);
		expect(defineAbilityFor(makeUser()).can('read', container)).toBe(true);
		expect(
			defineAbilityFor(
				makeUserWithRole(memberRoles.enum.administrator, [organization], {
					guid: anotherUserGuid
				})
			).can('read', container)
		).toBe(true);
		// heads carry the manage-members kind and therefore read as well
		expect(
			defineAbilityFor(
				makeUserWithRole(memberRoles.enum.head, [organization], { guid: anotherUserGuid })
			).can('read', container)
		).toBe(true);
		expect(
			defineAbilityFor(
				makeUserWithRole(memberRoles.enum.observer, [team, organization], {
					guid: anotherUserGuid
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

	test('grants on one of the managing teams suffice to modify', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.collaborator, [team]));
		expect(ability.can('create', container)).toBe(true);
		expect(ability.can('update', container)).toBe(true);
		expect(ability.can('delete', container)).toBe(true);
		expect(ability.can('relate', container)).toBe(true);
		expect(ability.can('delete-recursively', container)).toBe(true);
	});

	test('the manage-members kind on one of the managing teams grants inviting', () => {
		expect(
			defineAbilityFor(makeUserWithRole(memberRoles.enum.administrator, [team])).can(
				'invite-members',
				container
			)
		).toBe(true);
		expect(
			defineAbilityFor(makeUserWithRole(memberRoles.enum.head, [otherTeam])).can(
				'invite-members',
				container
			)
		).toBe(true);
	});

	test('grants on none of the managing teams grant nothing', () => {
		const ability = defineAbilityFor(
			makeUserWithRole(memberRoles.enum.administrator, [organizationalUnit])
		);
		expect(ability.can('create', container)).toBe(false);
		expect(ability.can('update', container)).toBe(false);
		expect(ability.can('delete', container)).toBe(false);
		expect(ability.can('read', container)).toBe(false);
	});

	test('the read kind on one of the managing teams suffices to read', () => {
		expect(
			defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team])).can('read', container)
		).toBe(true);
		expect(
			defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [otherTeam])).can(
				'read',
				container
			)
		).toBe(true);
		expect(
			defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [organizationalUnit])).can(
				'read',
				container
			)
		).toBe(false);
	});
});

describe('field-level rules', () => {
	test('the update kind on the managing team covers chapterType and editorialState', () => {
		// The general update rule conditioned on managed_by carries no field
		// restriction, so it also covers these fields for collaborators.
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.collaborator, [team]));
		expect(ability.can('update', makeContainer(payloadTypes.enum.program), 'chapterType')).toBe(
			true
		);
		expect(
			ability.can('update', makeContainer(payloadTypes.enum.measure), 'payload.editorialState')
		).toBe(true);
	});

	test('the read kind on the managing team covers the editorial state', () => {
		const ability = defineAbilityFor(makeUserWithRole(memberRoles.enum.observer, [team]));
		expect(
			ability.can('read', makeContainer(payloadTypes.enum.measure), 'payload.editorialState')
		).toBe(true);
		expect(ability.can('read', makeContainer(payloadTypes.enum.task), 'assignee')).toBe(true);
	});

	test('the organization and organizational_unit fields are protected', () => {
		const ability = defineAbilityFor(
			makeUserWithRole(memberRoles.enum.administrator, [organization])
		);
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('update', measure, 'organization')).toBe(false);
		// Re-parenting into another organizational unit is explicitly allowed
		// with the update kind on the organization.
		expect(ability.can('update', measure, 'organizational_unit')).toBe(true);
	});

	test('the indicator category of indicator templates is immutable', () => {
		const ability = defineAbilityFor(
			makeUserWithRole(memberRoles.enum.administrator, [organization])
		);
		const template = makeContainer(payloadTypes.enum.indicator_template, {}, { unit: '%' });
		expect(ability.can('update', template)).toBe(true);
		expect(ability.can('update', template, 'indicatorCategory')).toBe(false);
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

	test('grantKindsForKindsOn reflects individual kinds per container type', () => {
		const measureGuid = crypto.randomUUID();
		const measure = withGuid(
			makeContainer(payloadTypes.enum.measure, { managed_by: measureGuid }),
			measureGuid
		);

		expect(grantKindsForKindsOn(measure, viewer, ['read', 'delete'])).toEqual(['read', 'delete']);
		expect(grantKindsForKindsOn(measure, viewer, ['update'])).toEqual(['update']);

		const orgGuid = crypto.randomUUID();
		const org = withGuid(
			testContainer.parse({
				managed_by: orgGuid,
				organization: orgGuid,
				payload: { name: 'Org', type: payloadTypes.enum.organization }
			}) as ReturnType<typeof makeContainer>,
			orgGuid
		);

		// create and delete have no effect on the organization container itself
		expect(grantKindsForKindsOn(org, viewer, ['read', 'create', 'delete'])).toEqual(['read']);
	});
});

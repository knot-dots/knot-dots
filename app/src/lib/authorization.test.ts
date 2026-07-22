import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import { type AnyPayload, newContainer, payloadTypes, predicates, visibility } from '$lib/models';
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
	managed_by: z.uuid().default(team),
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
		expect(ability.can('relate', container)).toBe(true);
		expect(ability.can('delete-recursively', container)).toBe(true);
		expect(ability.can('invite-members', makeContainer(payloadTypes.enum.program))).toBe(true);
		expect(ability.can('prioritize', makeContainer(payloadTypes.enum.task))).toBe(true);
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
		expect(ability.can('relate', measure)).toBe(true);
	});

	test('a user without a role on the managing team may not modify', () => {
		const ability = defineAbilityFor(makeUser({ adminOf: [otherTeam], memberOf: [team] }));
		const measure = makeContainer(payloadTypes.enum.measure);
		expect(ability.can('create', measure)).toBe(false);
		expect(ability.can('update', measure)).toBe(false);
		expect(ability.can('delete', measure)).toBe(false);
		expect(ability.can('relate', measure)).toBe(false);
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

describe('delete-recursively via managed_by', () => {
	test('is granted to collaborators for goals, programs and measures', () => {
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.goal))).toBe(true);
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.program))).toBe(true);
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.measure))).toBe(true);
	});

	test('is not granted without a role on the managing team', () => {
		const ability = defineAbilityFor(makeUser({ memberOf: [team] }));
		expect(ability.can('delete-recursively', makeContainer(payloadTypes.enum.goal))).toBe(false);
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
			expect(ability.can('delete-recursively', category)).toBe(true);
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

describe('invite-members via managed_by', () => {
	test('is granted to admins and heads for programs and measures', () => {
		for (const user of [makeUser({ adminOf: [team] }), makeUser({ headOf: [team] })]) {
			const ability = defineAbilityFor(user);
			expect(ability.can('invite-members', makeContainer(payloadTypes.enum.program))).toBe(true);
			expect(ability.can('invite-members', makeContainer(payloadTypes.enum.measure))).toBe(true);
		}
	});

	test('is not granted to collaborators via managed_by', () => {
		const ability = defineAbilityFor(makeUser({ collaboratorOf: [team] }));
		expect(ability.can('invite-members', makeContainer(payloadTypes.enum.program))).toBe(false);
		expect(ability.can('invite-members', makeContainer(payloadTypes.enum.measure))).toBe(false);
	});
});

describe('task prioritization via managed_by', () => {
	test('is granted to collaborators and denied to mere members', () => {
		expect(
			defineAbilityFor(makeUser({ collaboratorOf: [team] })).can(
				'prioritize',
				makeContainer(payloadTypes.enum.task)
			)
		).toBe(true);
		expect(
			defineAbilityFor(makeUser({ memberOf: [team] })).can(
				'prioritize',
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

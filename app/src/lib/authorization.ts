import type { MongoAbility } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { AnyPayload, Container, PayloadType, User as ModelUser } from '$lib/models';
import {
	type AnyInitialPayload,
	type GrantKind,
	grantKinds,
	type MemberRole,
	memberRoles,
	type NewContainer,
	payloadTypes,
	predicates,
	visibility
} from '$lib/models';
import type { User } from '$lib/stores';

type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage-users';
type Subjects = Container<AnyPayload> | NewContainer<AnyInitialPayload> | PayloadType;

const specialTypes: PayloadType[] = [
	payloadTypes.enum.category,
	payloadTypes.enum.help,
	payloadTypes.enum.html,
	payloadTypes.enum.organization,
	payloadTypes.enum.organizational_unit,
	payloadTypes.enum.program,
	payloadTypes.enum.term
];

const commonTypes = payloadTypes.options.filter((t) => !specialTypes.includes(t));

export default function defineAbilityFor(user: User) {
	const { can, cannot, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
		createMongoAbility
	);

	can('read', payloadTypes.options, { 'payload.visibility': visibility.enum.public });

	if (user.isAuthenticated && user.roles.includes('sysadmin')) {
		can(['create', 'update', 'read', 'delete'], payloadTypes.options);
		can('manage-users', [
			payloadTypes.enum.measure,
			payloadTypes.enum.organization,
			payloadTypes.enum.organizational_unit,
			payloadTypes.enum.program,
			payloadTypes.enum.simple_measure
		]);
		can('read', payloadTypes.enum.task, ['assignee']);
		can(
			'update',
			[payloadTypes.enum.program, ...commonTypes],
			['organization', 'organizational_unit']
		);
		can('update', payloadTypes.enum.program, ['chapterType']);
	} else if (user.isAuthenticated) {
		can(['create', 'update', 'delete'], payloadTypes.enum.help, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.enum.organization, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], payloadTypes.enum.organizational_unit, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.enum.organizational_unit, {
			guid: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], [payloadTypes.enum.program, ...commonTypes], {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], [payloadTypes.enum.program, ...commonTypes], {
			organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(
			'manage-users',
			[
				payloadTypes.enum.measure,
				payloadTypes.enum.organization,
				payloadTypes.enum.organizational_unit,
				payloadTypes.enum.program,
				payloadTypes.enum.simple_measure
			],
			{
				organization: { $in: [...user.adminOf, ...user.headOf] }
			}
		);
		can(
			'manage-users',
			[
				payloadTypes.enum.measure,
				payloadTypes.enum.organizational_unit,
				payloadTypes.enum.program,
				payloadTypes.enum.simple_measure
			],
			{
				organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
			}
		);
		can('manage-users', [payloadTypes.enum.organizational_unit], {
			guid: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('create', commonTypes, {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can(['delete'], commonTypes, {
			managed_by: { $in: [...user.adminOf, ...user.headOf, ...user.collaboratorOf] }
		});
		can(['create', 'update', 'delete'], [payloadTypes.enum.category, payloadTypes.enum.term], {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.enum.program, ['chapterType'], {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(
			'manage-users',
			[payloadTypes.enum.program, payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
			{
				managed_by: { $in: [...user.adminOf, ...user.headOf] }
			}
		);
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			user: { $elemMatch: { predicate: predicates.enum['is-creator-of'], subject: user.guid } }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			organization: { $in: user.adminOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: user.memberOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			organization: { $in: user.memberOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			organizational_unit: { $in: user.memberOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			managed_by: { $in: user.memberOf }
		});
		can('read', payloadTypes.enum.organizational_unit, {
			'payload.visibility': visibility.enum.members,
			guid: { $in: user.memberOf }
		});
		can('read', payloadTypes.enum.organizational_unit, {
			'payload.visibility': visibility.enum.organization,
			guid: { $in: [...user.memberOf] }
		});
		can('read', payloadTypes.options, ['payload.editorialState'], {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: user.memberOf }
		});
		can('read', payloadTypes.enum.task, ['assignee'], {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: user.memberOf }
		});
		cannot('update', payloadTypes.enum.indicator_template, ['indicatorCategory']);
		cannot('update', payloadTypes.options, ['organization', 'organizational_unit']);
		cannot('update', payloadTypes.enum.organization, ['payload.customDomain']);
		can('update', payloadTypes.options, ['organizational_unit'], {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], ['payload.editorialState'], {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
	}

	return build({
		detectSubjectType: (object) => object.payload.type
	});
}

const actionsByGrantKind: Record<GrantKind, Actions> = {
	read: 'read',
	update: 'update',
	create: 'create',
	delete: 'delete',
	'manage-members': 'manage-users'
};

// The effective rights a member role would have on this container, derived
// from the actual authorization rules: what a role permits depends on the
// container type. Serves both the permission matrix display and its snapping
// candidates.
export function grantKindsForRoleOn(
	container: Container<AnyPayload>,
	user: Pick<ModelUser, 'family_name' | 'given_name' | 'guid' | 'settings'>,
	role: MemberRole | null
): GrantKind[] {
	const ability = defineAbilityFor({
		adminOf: role === memberRoles.enum.administrator ? [container.guid] : [],
		collaboratorOf: role === memberRoles.enum.collaborator ? [container.guid] : [],
		familyName: user.family_name,
		givenName: user.given_name,
		guid: user.guid,
		headOf: role === memberRoles.enum.head ? [container.guid] : [],
		isAuthenticated: true,
		memberOf: role !== null ? [container.guid] : [],
		roles: [],
		settings: user.settings
	});
	return grantKinds.options.filter((kind) => ability.can(actionsByGrantKind[kind], container));
}

export function filterVisible<T extends Container<AnyPayload>>(
	containers: Array<T>,
	user: User
): Array<T> {
	const ability = defineAbilityFor(user);
	return containers.filter((c) => ability.can('read', c));
}

export function mayImportFromCSV(user: User) {
	return defineAbilityFor(user).can('create', payloadTypes.enum.program);
}

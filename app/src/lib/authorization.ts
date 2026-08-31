import type { MongoAbility } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { AnyPayload, Container, PayloadType, User as ModelUser } from '$lib/models';
import {
	type AnyInitialPayload,
	type GrantKind,
	grantKinds,
	type NewContainer,
	payloadTypes,
	predicates,
	visibility
} from '$lib/models';
import type { User } from '$lib/stores';

type Actions =
	| 'create'
	| 'read'
	| 'update'
	| 'delete'
	| 'delete-recursively'
	| 'invite-members'
	| 'relate'
	| 'prioritize';
type Subjects = Container<AnyPayload> | NewContainer<AnyInitialPayload> | PayloadType;

const specialTypes: PayloadType[] = [
	payloadTypes.enum.binary_indicator,
	payloadTypes.enum.category,
	payloadTypes.enum.help,
	payloadTypes.enum.html,
	payloadTypes.enum.indicator_template,
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
		can('relate', payloadTypes.options);
		can('delete-recursively', [
			payloadTypes.enum.measure,
			payloadTypes.enum.program,
			payloadTypes.enum.goal,
			payloadTypes.enum.category,
			payloadTypes.enum.term
		]);
		can('invite-members', [
			payloadTypes.enum.measure,
			payloadTypes.enum.organization,
			payloadTypes.enum.organizational_unit,
			payloadTypes.enum.program,
			payloadTypes.enum.simple_measure
		]);
		can('prioritize', payloadTypes.enum.task);
		can('read', payloadTypes.enum.task, ['assignee']);
		can(
			'update',
			[payloadTypes.enum.program, ...commonTypes],
			['organization', 'organizational_unit']
		);
		can('update', payloadTypes.enum.program, ['chapterType']);
	} else if (user.isAuthenticated) {
		can('create', payloadTypes.enum.help, { organization: { $in: user.creatableOf } });
		can('update', payloadTypes.enum.help, { organization: { $in: user.updatableOf } });
		can('delete', payloadTypes.enum.help, { organization: { $in: user.deletableOf } });

		// Documented exceptions from the kind-per-action principle: the
		// organization profile, the set of organizational units and the
		// organization-wide view of members-visible content remain with those
		// who manage the members.
		can('update', payloadTypes.enum.organization, {
			organization: { $in: user.manageMembersOf }
		});
		can(['create', 'delete'], payloadTypes.enum.organizational_unit, {
			organization: { $in: user.manageMembersOf }
		});

		can('update', payloadTypes.enum.organizational_unit, {
			organization: { $in: user.updatableOf }
		});
		can('update', payloadTypes.enum.organizational_unit, {
			guid: { $in: user.updatableOf }
		});

		const contentTypes = [
			payloadTypes.enum.program,
			...commonTypes,
			payloadTypes.enum.binary_indicator,
			payloadTypes.enum.indicator_template
		];
		can('create', contentTypes, { organization: { $in: user.creatableOf } });
		can('create', contentTypes, { organizational_unit: { $in: user.creatableOf } });
		can('update', contentTypes, { organization: { $in: user.updatableOf } });
		can('update', contentTypes, { organizational_unit: { $in: user.updatableOf } });
		can('delete', contentTypes, { organization: { $in: user.deletableOf } });
		can('delete', contentTypes, { organizational_unit: { $in: user.deletableOf } });

		can(
			'invite-members',
			[
				payloadTypes.enum.measure,
				payloadTypes.enum.organization,
				payloadTypes.enum.organizational_unit,
				payloadTypes.enum.program,
				payloadTypes.enum.simple_measure
			],
			{
				organization: { $in: user.manageMembersOf }
			}
		);
		can(
			'invite-members',
			[
				payloadTypes.enum.measure,
				payloadTypes.enum.organizational_unit,
				payloadTypes.enum.program,
				payloadTypes.enum.simple_measure
			],
			{
				organizational_unit: { $in: user.manageMembersOf }
			}
		);
		can('invite-members', [payloadTypes.enum.organizational_unit], {
			guid: { $in: user.manageMembersOf }
		});
		can(
			'invite-members',
			[payloadTypes.enum.program, payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
			{
				managed_by: { $in: user.manageMembersOf }
			}
		);

		can('create', commonTypes, { managed_by: { $in: user.creatableOf } });
		can('update', [payloadTypes.enum.program, ...commonTypes], {
			managed_by: { $in: user.updatableOf }
		});
		can('delete', commonTypes, { managed_by: { $in: user.deletableOf } });
		can(
			'delete-recursively',
			[payloadTypes.enum.goal, payloadTypes.enum.program, payloadTypes.enum.measure],
			{
				managed_by: { $in: user.deletableOf }
			}
		);
		can('create', [payloadTypes.enum.category, payloadTypes.enum.term], {
			managed_by: { $in: user.creatableOf }
		});
		can('update', [payloadTypes.enum.category, payloadTypes.enum.term], {
			managed_by: { $in: user.updatableOf }
		});
		can(['delete', 'delete-recursively'], [payloadTypes.enum.category, payloadTypes.enum.term], {
			managed_by: { $in: user.deletableOf }
		});
		can('update', payloadTypes.enum.program, ['chapterType'], {
			managed_by: { $in: user.updatableOf }
		});

		can('relate', payloadTypes.options, { managed_by: { $in: user.updatableOf } });
		can('relate', payloadTypes.options, { organization: { $in: user.updatableOf } });
		can('relate', payloadTypes.options, { organizational_unit: { $in: user.updatableOf } });
		can('prioritize', payloadTypes.enum.task, { managed_by: { $in: user.updatableOf } });

		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			user: { $elemMatch: { predicate: predicates.enum['is-creator-of'], subject: user.guid } }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			organization: { $in: user.manageMembersOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			organization: { $in: user.manageMembersOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			organizational_unit: { $in: user.manageMembersOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: user.readableOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			organization: { $in: user.readableOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			organizational_unit: { $in: user.readableOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			managed_by: { $in: user.readableOf }
		});
		can('read', payloadTypes.enum.organizational_unit, {
			'payload.visibility': visibility.enum.members,
			guid: { $in: user.readableOf }
		});
		can('read', payloadTypes.enum.organizational_unit, {
			'payload.visibility': visibility.enum.organization,
			guid: { $in: user.readableOf }
		});
		can('read', payloadTypes.options, ['payload.editorialState'], {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: user.readableOf }
		});
		can('read', payloadTypes.enum.task, ['assignee'], {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: user.readableOf }
		});
		cannot('update', payloadTypes.enum.indicator_template, ['indicatorCategory']);
		cannot('update', payloadTypes.options, ['organization', 'organizational_unit']);
		cannot('update', payloadTypes.enum.organization, ['payload.customDomain']);
		can('update', contentTypes, ['organizational_unit'], {
			organization: { $in: user.updatableOf }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], ['payload.editorialState'], {
			managed_by: { $in: user.updatableOf }
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
	'manage-members': 'invite-members'
};

// The effective rights a member role would have on this container, derived
// from the actual authorization rules: what a role permits depends on the
// container type. Serves both the permission matrix display and its snapping
// candidates.
// The effective rights a set of granted kinds yields on this container,
// derived from the actual authorization rules: what a kind permits depends on
// the container type.
export function grantKindsForKindsOn(
	container: Container<AnyPayload>,
	user: Pick<ModelUser, 'family_name' | 'given_name' | 'guid' | 'settings'>,
	kinds: ReadonlyArray<GrantKind>
): GrantKind[] {
	const scoped = (kind: GrantKind) => (kinds.includes(kind) ? [container.guid] : []);
	const ability = defineAbilityFor({
		creatableOf: scoped(grantKinds.enum.create),
		deletableOf: scoped(grantKinds.enum.delete),
		familyName: user.family_name,
		givenName: user.given_name,
		guid: user.guid,
		isAuthenticated: true,
		manageMembersOf: scoped(grantKinds.enum['manage-members']),
		readableOf: scoped(grantKinds.enum.read),
		roles: [],
		settings: user.settings,
		updatableOf: scoped(grantKinds.enum.update)
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

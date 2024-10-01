import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';
import { payloadTypes, predicates, visibility } from '$lib/models';
import type { AnyContainer, EmptyContainer, PayloadType } from '$lib/models';
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
type Subjects = AnyContainer | EmptyContainer | PayloadType;

const strategyChapterTypes = [
	payloadTypes.enum.measure,
	payloadTypes.enum.model,
	payloadTypes.enum.objective,
	payloadTypes.enum.operational_goal,
	payloadTypes.enum.resolution,
	payloadTypes.enum.simple_measure,
	payloadTypes.enum.strategic_goal,
	payloadTypes.enum.text,
	payloadTypes.enum.undefined,
	payloadTypes.enum.vision
];

const measureMonitoringTypes = [
	payloadTypes.enum.effect,
	payloadTypes.enum.measure_result,
	payloadTypes.enum.milestone,
	payloadTypes.enum.resource,
	payloadTypes.enum.task
];

export default function defineAbilityFor(user: User) {
	const { can, cannot, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
		createMongoAbility
	);

	can('read', payloadTypes.options, { 'payload.visibility': visibility.enum.public });

	if (user.isAuthenticated && user.roles.includes('sysadmin')) {
		can(['create', 'update', 'read', 'delete'], payloadTypes.options);
		can('relate', [payloadTypes.enum.strategy, ...strategyChapterTypes]);
		can(['delete-recursively', 'relate'], measureMonitoringTypes);
		can('delete-recursively', payloadTypes.enum.measure);
		can('invite-members', payloadTypes.options);
		can('prioritize', payloadTypes.enum.task);
		can('read', payloadTypes.enum.task, ['assignee']);
		can(
			'update',
			[payloadTypes.enum.strategy, ...strategyChapterTypes, ...measureMonitoringTypes],
			['organization', 'organizational_unit']
		);
		can('update', payloadTypes.enum.strategy, ['chapterType']);
	} else if (user.isAuthenticated) {
		can('update', payloadTypes.enum.organization, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update'], payloadTypes.enum.organizational_unit, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.enum.organizational_unit, {
			organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(
			['create', 'update', 'delete'],
			[payloadTypes.enum.strategy, ...strategyChapterTypes, ...measureMonitoringTypes],
			{ organization: { $in: [...user.adminOf, ...user.headOf] } }
		);
		can(
			['create', 'update', 'delete'],
			[payloadTypes.enum.strategy, ...strategyChapterTypes, ...measureMonitoringTypes],
			{ organizational_unit: { $in: [...user.adminOf, ...user.headOf] } }
		);
		can('invite-members', payloadTypes.options, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('invite-members', payloadTypes.options, {
			organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('create', [...strategyChapterTypes, ...measureMonitoringTypes], {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can(
			'update',
			[payloadTypes.enum.strategy, ...strategyChapterTypes, ...measureMonitoringTypes],
			{ managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] } }
		);
		can(['delete'], [...strategyChapterTypes, ...measureMonitoringTypes], {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], payloadTypes.enum.indicator, {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.enum.strategy, ['chapterType'], {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('invite-members', payloadTypes.options, {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(
			'relate',
			[payloadTypes.enum.strategy, ...strategyChapterTypes, ...measureMonitoringTypes],
			{ managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] } }
		);
		can('prioritize', payloadTypes.enum.task, {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			user: { $elemMatch: { predicate: predicates.enum['is-creator-of'], subject: user.guid } }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			organization: { $in: user.adminOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			organizational_unit: { $in: user.adminOf }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			managed_by: { $in: user.adminOf }
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
			organization: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			organizational_unit: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('read', payloadTypes.enum.organizational_unit, {
			'payload.visibility': visibility.enum.members,
			guid: { $in: user.memberOf }
		});
		can('read', payloadTypes.enum.organizational_unit, {
			'payload.visibility': visibility.enum.organization,
			guid: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('read', payloadTypes.enum.organizational_unit, {
			'payload.visibility': visibility.enum.creator,
			guid: { $in: user.adminOf }
		});
		can('read', payloadTypes.enum.task, ['assignee'], {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: user.memberOf }
		});
		cannot('update', payloadTypes.enum.indicator, ['indicatorCategory']);
		cannot('update', payloadTypes.options, ['organization', 'organizational_unit']);
		can('update', payloadTypes.options, ['organizational_unit'], {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
	}

	return build({
		detectSubjectType: (object) => object.payload.type
	});
}

export function filterVisible<T extends AnyContainer>(containers: Array<T>, user: User): Array<T> {
	const ability = defineAbilityFor(user);
	return containers.filter((c) => ability.can('read', c));
}

export function mayImportFromCSV(user: User) {
	return defineAbilityFor(user).can('create', payloadTypes.enum.strategy);
}

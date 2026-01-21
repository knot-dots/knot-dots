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

const specialTypes: PayloadType[] = [
	payloadTypes.enum.organization,
	payloadTypes.enum.organizational_unit,
	payloadTypes.enum.program,
	payloadTypes.enum.indicator,
	payloadTypes.enum.indicator_template
];

const commonTypes = payloadTypes.options.filter((t) => !specialTypes.includes(t));

const taxonomyTypes: PayloadType[] = [payloadTypes.enum.category, payloadTypes.enum.term];

export default function defineAbilityFor(user: User) {
	const { can, cannot, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
		createMongoAbility
	);

	can('read', payloadTypes.options, { 'payload.visibility': visibility.enum.public });

	if (user.isAuthenticated && user.roles.includes('sysadmin')) {
		can(['create', 'update', 'read', 'delete'], payloadTypes.options);
		can('relate', [payloadTypes.enum.indicator, payloadTypes.enum.program, ...commonTypes]);
		can('delete-recursively', [
			payloadTypes.enum.measure,
			payloadTypes.enum.program,
			payloadTypes.enum.goal
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
		can('update', payloadTypes.enum.organization, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], payloadTypes.enum.organizational_unit, {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.enum.organizational_unit, {
			organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], [payloadTypes.enum.program, ...commonTypes], {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], [payloadTypes.enum.program, ...commonTypes], {
			organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
		});
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
				organization: { $in: [...user.adminOf, ...user.headOf] }
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
				organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
			}
		);
		can('create', commonTypes, {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can(['delete'], commonTypes, {
			managed_by: { $in: [...user.adminOf, ...user.headOf, ...user.collaboratorOf] }
		});
		can(
			'delete-recursively',
			[payloadTypes.enum.goal, payloadTypes.enum.program, payloadTypes.enum.measure],
			{
				managed_by: { $in: [...user.adminOf, ...user.headOf, ...user.collaboratorOf] }
			}
		);
		can(['create', 'update', 'delete'], payloadTypes.enum.indicator, {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.enum.program, ['chapterType'], {
			managed_by: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(
			'invite-members',
			[payloadTypes.enum.program, payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
			{
				managed_by: { $in: [...user.adminOf, ...user.headOf] }
			}
		);
		can('relate', [payloadTypes.enum.indicator, payloadTypes.enum.program, ...commonTypes], {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('relate', [payloadTypes.enum.indicator, payloadTypes.enum.program, ...commonTypes], {
			organization: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('relate', [payloadTypes.enum.indicator, payloadTypes.enum.program, ...commonTypes], {
			organizational_unit: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
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
		cannot('update', payloadTypes.enum.indicator, ['indicatorCategory']);
		cannot(['create', 'update', 'delete'], taxonomyTypes);
		cannot('update', payloadTypes.options, ['organization', 'organizational_unit']);
		can('update', payloadTypes.options, ['organizational_unit'], {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can('update', payloadTypes.options, ['payload.editorialState'], {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
	}

	return build({
		detectSubjectType: (object) => object.payload.type ?? payloadTypes.enum.undefined
	});
}

export function filterVisible<T extends AnyContainer>(containers: Array<T>, user: User): Array<T> {
	const ability = defineAbilityFor(user);
	return containers.filter((c) => ability.can('read', c));
}

export function mayImportFromCSV(user: User) {
	return defineAbilityFor(user).can('create', payloadTypes.enum.program);
}

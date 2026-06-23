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
	| 'download-csv'
	| 'invite-members'
	| 'relate'
	| 'prioritize';
type Subjects = AnyContainer | EmptyContainer | PayloadType;

const specialTypes: PayloadType[] = [
	payloadTypes.enum.binary_indicator,
	payloadTypes.enum.category,
	payloadTypes.enum.help,
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
		can('download-csv', [payloadTypes.enum.binary_indicator, payloadTypes.enum.indicator_template]);
		can('relate', [
			payloadTypes.enum.binary_indicator,
			payloadTypes.enum.category,
			payloadTypes.enum.program,
			payloadTypes.enum.term,
			...commonTypes
		]);
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
		// Grant read access based on pre-computed visible container GUIDs
		// (server-side recursive CTE over container_permission + container_relation).
		// This runs alongside the existing visibility-based rules until the
		// big-bang migration seeds grants for all existing containers.
		if (user.visibleContainerGuids.length > 0) {
			can('read', payloadTypes.options, { guid: { $in: user.visibleContainerGuids } });
		}

		// Per-container write grants from container_permission.
		// Mirrors the existing org-level rules but scoped to specific container GUIDs.
		const permAdminGuids = user.permissionGrants
			.filter(
				(g) =>
					g.predicate === predicates.enum['is-admin-of'] ||
					g.predicate === predicates.enum['is-head-of']
			)
			.map((g) => g.guid);
		const permCollaboratorGuids = user.permissionGrants
			.filter((g) => g.predicate === predicates.enum['is-collaborator-of'])
			.map((g) => g.guid);

		if (permAdminGuids.length > 0) {
			can(['update', 'delete', 'relate', 'invite-members'], payloadTypes.options, {
				guid: { $in: permAdminGuids }
			});
		}
		if (permCollaboratorGuids.length > 0) {
			can(['update', 'delete', 'relate'], payloadTypes.options, {
				guid: { $in: permCollaboratorGuids }
			});
		}
		can(['create', 'update', 'delete'], [payloadTypes.enum.program, ...commonTypes], {
			organization: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(['create', 'update', 'delete'], [payloadTypes.enum.program, ...commonTypes], {
			organizational_unit: { $in: [...user.adminOf, ...user.headOf] }
		});
		can(
			['create', 'update', 'delete'],
			[payloadTypes.enum.binary_indicator, payloadTypes.enum.indicator_template],
			{
				organization: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
			}
		);
		can(
			['create', 'update', 'delete'],
			[payloadTypes.enum.binary_indicator, payloadTypes.enum.indicator_template],
			{
				organizational_unit: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
			}
		);
		can(
			'download-csv',
			[payloadTypes.enum.binary_indicator, payloadTypes.enum.indicator_template],
			{
				organization: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
			}
		);
		can(
			'download-csv',
			[payloadTypes.enum.binary_indicator, payloadTypes.enum.indicator_template],
			{
				organizational_unit: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
			}
		);
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
		can('invite-members', [payloadTypes.enum.organizational_unit], {
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
		can(
			'delete-recursively',
			[payloadTypes.enum.goal, payloadTypes.enum.program, payloadTypes.enum.measure],
			{
				managed_by: { $in: [...user.adminOf, ...user.headOf, ...user.collaboratorOf] }
			}
		);
		can(
			['create', 'update', 'delete', 'delete-recursively'],
			[payloadTypes.enum.category, payloadTypes.enum.term],
			{
				managed_by: { $in: [...user.adminOf, ...user.headOf] }
			}
		);
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
		can('relate', [payloadTypes.enum.program, payloadTypes.enum.term, ...commonTypes], {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('relate', [payloadTypes.enum.program, payloadTypes.enum.term, ...commonTypes], {
			organization: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('relate', [payloadTypes.enum.program, payloadTypes.enum.term, ...commonTypes], {
			organizational_unit: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
		});
		can('prioritize', payloadTypes.enum.task, {
			managed_by: { $in: [...user.adminOf, ...user.collaboratorOf, ...user.headOf] }
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
		detectSubjectType: (object) => object.payload.type ?? payloadTypes.enum.undefined
	});
}

export function filterVisible<T extends AnyContainer>(containers: Array<T>, user: User): Array<T> {
	if (user.isAuthenticated && !user.roles.includes('sysadmin')) {
		const visibleGuids = new Set(user.visibleContainerGuids);
		return containers.filter((c) => visibleGuids.has(c.guid));
	}

	const ability = defineAbilityFor(user);
	return containers.filter((c) => ability.can('read', c));
}

export function mayImportFromCSV(user: User) {
	return defineAbilityFor(user).can('create', payloadTypes.enum.program);
}

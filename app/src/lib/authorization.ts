import type { MongoAbility } from '@casl/ability';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { AnyPayload, Container, PayloadType } from '$lib/models';
import {
	type AnyInitialPayload,
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

// Categories, help sections, terms and organizational units follow the
// organization's subordinate rules for updating, but creating and deleting
// them additionally requires read, update and manage-users on the
// organization object itself. HTML sections stay reserved for sysadmins.
const specialContentTypes: PayloadType[] = [
	payloadTypes.enum.category,
	payloadTypes.enum.help,
	payloadTypes.enum.term
];

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
		const { self, subordinates } = user.grants;
		const fullySelfManagedOf = self.read
			.filter((guid) => self.update.includes(guid))
			.filter((guid) => self['manage-users'].includes(guid));

		can('update', payloadTypes.options, { guid: { $in: self.update } });
		can('update', payloadTypes.enum.organization, {
			organization: { $in: self.update }
		});
		can('update', specialContentTypes, {
			organization: { $in: subordinates.update }
		});
		can(['create', 'delete'], specialContentTypes, {
			organization: { $in: fullySelfManagedOf }
		});
		can('update', payloadTypes.enum.organizational_unit, {
			organization: { $in: subordinates.update }
		});
		can(['create', 'delete'], payloadTypes.enum.organizational_unit, {
			organization: { $in: fullySelfManagedOf }
		});
		can('create', [payloadTypes.enum.program, ...commonTypes], {
			organization: { $in: subordinates.create }
		});
		can('create', [payloadTypes.enum.program, ...commonTypes], {
			organizational_unit: { $in: subordinates.create }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], {
			organization: { $in: subordinates.update }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], {
			organizational_unit: { $in: subordinates.update }
		});
		can('delete', [payloadTypes.enum.program, ...commonTypes], {
			organization: { $in: subordinates.delete }
		});
		can('delete', [payloadTypes.enum.program, ...commonTypes], {
			organizational_unit: { $in: subordinates.delete }
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
				guid: { $in: self['manage-users'] }
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
				organization: { $in: subordinates['manage-users'] }
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
				organizational_unit: { $in: subordinates['manage-users'] }
			}
		);
		can('create', commonTypes, {
			managed_by: { $in: subordinates.create }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], {
			managed_by: { $in: subordinates.update }
		});
		can('delete', commonTypes, {
			managed_by: { $in: subordinates.delete }
		});
		can('update', [payloadTypes.enum.category, payloadTypes.enum.term], {
			managed_by: { $in: subordinates.update }
		});
		can(['create', 'delete'], [payloadTypes.enum.category, payloadTypes.enum.term], {
			managed_by: { $in: fullySelfManagedOf }
		});
		can('update', payloadTypes.enum.program, ['chapterType'], {
			managed_by: { $in: subordinates['manage-users'] }
		});
		can(
			'manage-users',
			[payloadTypes.enum.program, payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
			{
				managed_by: { $in: subordinates['manage-users'] }
			}
		);
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			user: { $elemMatch: { predicate: predicates.enum['is-creator-of'], subject: user.guid } }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			organization: { $in: self['manage-users'] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			organization: { $in: subordinates['manage-users'] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			organizational_unit: { $in: subordinates['manage-users'] }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: subordinates.read }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			organization: { $in: subordinates.read }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			organizational_unit: { $in: subordinates.read }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			managed_by: { $in: subordinates.read }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			guid: { $in: self.read }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			guid: { $in: self.read }
		});
		can('read', payloadTypes.options, ['payload.editorialState'], {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: subordinates.read }
		});
		can('read', payloadTypes.enum.task, ['assignee'], {
			'payload.visibility': visibility.enum.members,
			managed_by: { $in: subordinates.read }
		});
		cannot('update', payloadTypes.enum.indicator_template, ['indicatorCategory']);
		cannot('update', payloadTypes.options, ['organization', 'organizational_unit']);
		cannot('update', payloadTypes.enum.organization, ['payload.customDomain']);
		can('update', payloadTypes.options, ['organizational_unit'], {
			organization: { $in: subordinates.update }
		});
		can('update', [payloadTypes.enum.program, ...commonTypes], ['payload.editorialState'], {
			managed_by: { $in: subordinates.update }
		});
		cannot(['create', 'update', 'delete'], payloadTypes.enum.html);
	}

	return build({
		detectSubjectType: (object) => object.payload.type
	});
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

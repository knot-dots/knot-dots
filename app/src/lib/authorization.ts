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

export const specialTypes: PayloadType[] = [
	payloadTypes.enum.category,
	payloadTypes.enum.help,
	payloadTypes.enum.html,
	payloadTypes.enum.organization,
	payloadTypes.enum.organizational_unit,
	payloadTypes.enum.term
];

export const commonTypes = payloadTypes.options.filter((t) => !specialTypes.includes(t));

// Categories, help sections, terms and organizational units follow the
// governing matrix for updating, but creating and deleting them is reserved
// for its administrators. HTML sections stay reserved for sysadmins.
const specialContentTypes: PayloadType[] = [
	payloadTypes.enum.category,
	payloadTypes.enum.help,
	payloadTypes.enum.term
];

const userManagedTypes: PayloadType[] = [
	payloadTypes.enum.measure,
	payloadTypes.enum.organization,
	payloadTypes.enum.organizational_unit,
	payloadTypes.enum.program,
	payloadTypes.enum.simple_measure
];

// The rules read the effective grants the server computed for the request
// user on each container (grant, see computeUserGrants): `self` and
// `subordinates` carry the kinds of the governing matrix, `own` the kinds of
// the container's own rows, `admin` and `member` the subject's standing with
// the governing matrix. Creating is checked against a stub of the container
// to create that inherits the grants of its parent (containerOfType).
export default function defineAbilityFor(user: User) {
	const { can, cannot, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
		createMongoAbility
	);

	can('read', payloadTypes.options, { 'payload.visibility': visibility.enum.public });

	if (user.isAuthenticated && user.roles.includes('sysadmin')) {
		can(['create', 'update', 'read', 'delete'], payloadTypes.options);
		can('manage-users', userManagedTypes);
	} else if (user.isAuthenticated) {
		// —— contents follow the kinds of their governing matrix ——
		can('update', [...commonTypes, ...specialContentTypes, payloadTypes.enum.organizational_unit], {
			'grant.self': 'update'
		});
		can('delete', commonTypes, { 'grant.self': 'delete' });
		can(
			'manage-users',
			[
				payloadTypes.enum.measure,
				payloadTypes.enum.organizational_unit,
				payloadTypes.enum.program,
				payloadTypes.enum.simple_measure
			],
			{ 'grant.self': 'manage-users' }
		);
		can('create', commonTypes, {
			'grant.subordinates': 'create'
		});
		can('update', payloadTypes.enum.program, ['chapterType'], {
			'grant.self': 'manage-users'
		});

		// —— rows on the container's own matrix ——
		can('update', payloadTypes.options, { 'grant.own': 'update' });
		can('manage-users', userManagedTypes, { 'grant.own': 'manage-users' });

		// —— administrators of the governing matrix or an area ——
		can('create', [payloadTypes.enum.category, payloadTypes.enum.term], {
			'grant.admin': true
		});
		// help sections and organizational units belong to the organization
		can('create', [payloadTypes.enum.help, payloadTypes.enum.organizational_unit], {
			'grant.organization_manager': true
		});
		can('delete', [payloadTypes.enum.category, payloadTypes.enum.term], {
			'grant.admin': true
		});
		can('delete', [payloadTypes.enum.help, payloadTypes.enum.organizational_unit], {
			'grant.organization_manager': true
		});

		// —— visibility ——
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			user: { $elemMatch: { predicate: predicates.enum['is-creator-of'], subject: user.guid } }
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.creator,
			'grant.organization_manager': true
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			'grant.member': true
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.members,
			'grant.self': 'manage-users'
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			'grant.self': 'read'
		});
		can('read', payloadTypes.options, {
			'payload.visibility': visibility.enum.organization,
			'grant.own': 'read'
		});

		// —— field-level restrictions ——
		cannot('update', payloadTypes.enum.indicator_template, ['indicatorCategory']);
		cannot('update', payloadTypes.options, ['organization', 'organizational_unit']);
		cannot('update', payloadTypes.enum.organization, ['payload.customDomain']);
		// moving content between units takes an update grant of the area itself
		can('update', payloadTypes.options, ['organizational_unit'], {
			'grant.self': 'update',
			'grant.area_sourced': true
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

export function mayImportFromCSV(user: User, scope: Container<AnyPayload>) {
	return defineAbilityFor(user).can('create', scope, payloadTypes.enum.program);
}

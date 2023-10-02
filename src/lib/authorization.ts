import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';
import { payloadTypes } from '$lib/models';
import type { AnyContainer, EmptyContainer, PayloadType } from '$lib/models';
import type { User } from '$lib/stores';

type Actions = 'create' | 'read' | 'update' | 'delete';
type Subjects = AnyContainer | EmptyContainer | PayloadType;

export default function defineAbilityFor(user: User) {
	const { can, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(createMongoAbility);

	if (user.isAuthenticated && user.roles.includes('sysadmin')) {
		can('create', payloadTypes.enum.organization);

		for (const payloadType of payloadTypes.options) {
			if (
				payloadType != payloadTypes.enum.organization &&
				payloadType != payloadTypes.enum.organizational_unit
			) {
				can('update', payloadType, ['organization']);
				can('update', payloadType, ['organizational_unit']);
			}
		}
	}

	return build({
		detectSubjectType: (object) => object.payload.type
	});
}

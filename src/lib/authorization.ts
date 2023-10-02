import { defineAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';
import { payloadTypes } from '$lib/models';
import type { AnyContainer, EmptyContainer, PayloadType } from '$lib/models';
import type { User } from '$lib/stores';

type Actions = 'create' | 'read' | 'update' | 'delete';
type Subjects = AnyContainer | EmptyContainer | PayloadType;

export default (user: User) =>
	defineAbility<MongoAbility<[Actions, Subjects]>>(
		(can) => {
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

			if (user.isAuthenticated && user.roles.includes('admin')) {
				can('create', payloadTypes.enum.organizational_unit);
			}
		},
		{
			detectSubjectType: (subject) => subject.payload.type
		}
	);

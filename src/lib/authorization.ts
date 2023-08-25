import { defineAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';
import { payloadTypes } from '$lib/models';
import type { PayloadType } from '$lib/models';
import type { User } from '$lib/stores';

type Actions = 'create' | 'read' | 'update' | 'delete';
type Subjects = PayloadType;

export default (user: User) =>
	defineAbility<MongoAbility<[Actions, Subjects]>>((can) => {
		if (user.isAuthenticated && user.roles.includes('sysadmin')) {
			can('create', payloadTypes.enum.organization);

			for (const payloadType of payloadTypes.options) {
				can('update', payloadType, ['organization']);
			}
		}
	});

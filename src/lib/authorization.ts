import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';
import { payloadTypes } from '$lib/models';
import type { AnyContainer, EmptyContainer, PayloadType } from '$lib/models';
import type { User } from '$lib/stores';

type Actions = 'create' | 'read' | 'update' | 'delete' | 'relate' | 'prioritize';
type Subjects = AnyContainer | EmptyContainer | PayloadType;

const objectiveTypes = [
	payloadTypes.enum.measure,
	payloadTypes.enum.model,
	payloadTypes.enum.operational_goal,
	payloadTypes.enum.strategic_goal,
	payloadTypes.enum.strategy
];

const internalObjectiveTypes = [
	payloadTypes.enum['internal_objective.internal_strategy'],
	payloadTypes.enum['internal_objective.milestone'],
	payloadTypes.enum['internal_objective.strategic_goal'],
	payloadTypes.enum['internal_objective.task'],
	payloadTypes.enum['internal_objective.vision']
];

export default function defineAbilityFor(user: User) {
	const { can, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(createMongoAbility);

	if (user.isAuthenticated && user.roles.includes('sysadmin')) {
		can(['create', 'update'], payloadTypes.options);

		for (const payloadType of payloadTypes.options) {
			if (
				payloadType != payloadTypes.enum.organization &&
				payloadType != payloadTypes.enum.organizational_unit
			) {
				can('update', payloadType, ['organization']);
				can('update', payloadType, ['organizational_unit']);
			}
		}
	} else if (user.isAuthenticated) {
		can('update', payloadTypes.enum.organization, { organization: { $in: user.adminOf } });
		can(['create', 'update'], payloadTypes.enum.organizational_unit, {
			organization: { $in: user.adminOf }
		});
		can(['create', 'update'], objectiveTypes, { organization: { $in: user.adminOf } });
		can(['create', 'update'], internalObjectiveTypes, { organization: { $in: user.adminOf } });
		can(['create', 'update'], objectiveTypes, { organizational_unit: { $in: user.adminOf } });
		can(['create', 'update'], internalObjectiveTypes, {
			organizational_unit: { $in: user.adminOf }
		});
		can('relate', objectiveTypes, { organization: { $in: user.memberOf } });
		can('relate', internalObjectiveTypes, { organization: { $in: user.memberOf } });
		can('relate', objectiveTypes, { organizational_unit: { $in: user.memberOf } });
		can('relate', internalObjectiveTypes, {
			organizational_unit: { $in: user.memberOf }
		});
		can('prioritize', payloadTypes.enum['internal_objective.task'], {
			organization: { $in: user.memberOf }
		});
		can('prioritize', payloadTypes.enum['internal_objective.task'], {
			organizational_unit: { $in: user.memberOf }
		});
	}

	return build({
		detectSubjectType: (object) => object.payload.type
	});
}

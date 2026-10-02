import { isAdoptableProgram } from '$lib/adoptions';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	predicates,
	type AnyPayload,
	type Container,
	type Relation
} from '$lib/models';
import type { User } from '$lib/stores';

export type ContainerRelationChange = Relation & { deleted: boolean };

// Splits relation changes made through the container identified by guid into
// authorized and rejected ones. A change must have the container as subject or
// object; both of its containers must be readable, and the container itself
// must be updatable. containers holds the current containers of both sides.
export function authorizeContainerRelationChanges<T extends ContainerRelationChange>({
	changes,
	containers,
	features,
	guid,
	user
}: {
	changes: T[];
	containers: Container<AnyPayload>[];
	features: string[];
	guid: string;
	user: User;
}): { authorized: T[]; rejected: T[] } {
	const ability = defineAbilityFor(user);

	const isAuthorized = ({ deleted, object, predicate, subject }: T) => {
		if (object != guid && subject != guid) {
			return false;
		}
		const objectContainer = containers.find((c) => ability.can('read', c) && c.guid === object);
		const subjectContainer = containers.find((c) => ability.can('read', c) && c.guid === subject);
		if (!objectContainer || !subjectContainer) {
			return false;
		}
		// Adopting a public rule-set program deliberately does not require
		// permission on the (foreign) program itself: the user must be
		// allowed to update the adopting organization or organizational
		// unit, the program must be adoptable, and the owning
		// organizational unit may not adopt its own program. Removal is
		// exempt from the latter rules: taking away a relation that should
		// not exist must always be possible for those responsible for the
		// adopting unit.
		if (predicate == predicates.enum['is-adopted-by']) {
			return (
				createFeatureDecisions(features).useAdoptions() &&
				subject == guid &&
				ability.can('update', objectContainer) &&
				(deleted ||
					(isAdoptableProgram(subjectContainer) &&
						(isOrganizationContainer(objectContainer) ||
							isOrganizationalUnitContainer(objectContainer)) &&
						objectContainer.guid != subjectContainer.organizational_unit))
			);
		}
		return ability.can(
			'update',
			[subjectContainer, objectContainer].find((c) => c.guid == guid) as Container<AnyPayload>
		);
	};

	return {
		authorized: changes.filter(isAuthorized),
		rejected: changes.filter((change) => !isAuthorized(change))
	};
}

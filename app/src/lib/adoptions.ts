import { payloadTypes, predicates, programTypes, visibility, type Relation } from '$lib/models';
import type { User } from '$lib/stores';

// The types in this module are deliberately structural so that both full
// containers and the plain objects assembled in tests or route handlers fit.

export function isAdoptableProgram(container: {
	payload: { type: string; programType?: string; visibility?: string };
}): boolean {
	return (
		container.payload.type === payloadTypes.enum.program &&
		container.payload.programType === programTypes.enum['program_type.set_of_rules'] &&
		container.payload.visibility === visibility.enum.public
	);
}

export function adoptableOrganizationalUnits<T extends { guid: string; organization: string }>(
	user: User,
	program: { organizational_unit: string | null },
	organizationalUnits: T[]
): T[] {
	if (!user.isAuthenticated) {
		return [];
	}

	// Deliberately ignores the sysadmin role: adoptable are only the
	// organizational units that follow from the regular admin and head roles.
	return organizationalUnits.filter(
		(unit) =>
			unit.guid !== program.organizational_unit &&
			[...user.adminOf, ...user.headOf].some(
				(guid) => guid === unit.guid || guid === unit.organization
			)
	);
}

export function groupedByOrganization<
	T extends { organization: string },
	O extends { guid: string }
>(units: T[], organizations: O[]): Array<{ organization: O; units: T[] }> {
	return organizations
		.map((organization) => ({
			organization,
			units: units.filter(({ organization: guid }) => guid === organization.guid)
		}))
		.filter(({ units }) => units.length > 0);
}

export function adopters(container: { guid: string; relation: Relation[] }): string[] {
	return container.relation
		.filter(
			({ predicate, subject }) =>
				predicate === predicates.enum['is-adopted-by'] && subject === container.guid
		)
		.map(({ object }) => object);
}

export function adoptionDiff(
	before: string[],
	after: string[]
): { added: string[]; removed: string[] } {
	return {
		added: after.filter((guid) => !before.includes(guid)),
		removed: before.filter((guid) => !after.includes(guid))
	};
}

export function adoptionRelations(programGuid: string, targets: string[]): Relation[] {
	return targets.map((target) => ({
		object: target,
		position: 0,
		predicate: predicates.enum['is-adopted-by'],
		subject: programGuid
	}));
}

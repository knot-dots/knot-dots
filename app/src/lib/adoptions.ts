import {
	type AnyPayload,
	type Container,
	type OrganizationalUnitPayload,
	type OrganizationPayload,
	payloadTypes,
	predicates,
	type ProgramPayload,
	programTypes,
	type Relation,
	visibility
} from '$lib/models';
import type { User } from '$lib/stores';

export function isAdoptableProgram(container: Container<AnyPayload>): boolean {
	return (
		container.payload.type === payloadTypes.enum.program &&
		container.payload.programType === programTypes.enum['program_type.set_of_rules'] &&
		container.payload.visibility === visibility.enum.public
	);
}

export function adoptableOrganizationalUnits(
	user: User,
	program: { organizational_unit: string | null },
	organizationalUnits: Array<Container<OrganizationalUnitPayload>>
): Array<Container<OrganizationalUnitPayload>> {
	if (!user.isAuthenticated) {
		return [];
	}

	return organizationalUnits.filter(
		(unit) =>
			unit.guid !== program.organizational_unit &&
			[...user.adminOf, ...user.headOf].some(
				(guid) => guid === unit.guid || guid === unit.organization
			)
	);
}

export function groupedByOrganization(
	units: Array<Container<OrganizationalUnitPayload>>,
	organizations: Array<Container<OrganizationPayload>>
): Array<{
	organization: Container<OrganizationPayload>;
	units: Array<Container<OrganizationalUnitPayload>>;
}> {
	return organizations
		.map((organization) => ({
			organization,
			units: units.filter(({ organization: guid }) => guid === organization.guid)
		}))
		.filter(({ units }) => units.length > 0);
}

export function adopters(container: Container<ProgramPayload>): string[] {
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

export function adoptionRelations(
	programGuid: string,
	targets: string[],
	deleted: boolean
): Array<Relation & { deleted: boolean }> {
	return targets.map((target) => ({
		object: target,
		position: 0,
		predicate: predicates.enum['is-adopted-by'],
		subject: programGuid,
		deleted
	}));
}

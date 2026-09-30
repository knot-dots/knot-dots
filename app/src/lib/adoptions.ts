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

export function isAdoptableProgram(container: Container<AnyPayload>): boolean {
	return (
		container.payload.type === payloadTypes.enum.program &&
		container.payload.programType === programTypes.enum['program_type.set_of_rules'] &&
		container.payload.visibility === visibility.enum.public
	);
}

// The units the user may create objects in: a create grant on the
// subordinates of a unit is what the create rule reads for a program placed
// within it (containerOfType), and the relation route applies that very rule
// when the adoption is stored. Inheritance is already folded into user_grant.
export function organizationalUnitsManagedByUser(
	program: { organizational_unit: string | null },
	organizationalUnits: Array<Container<OrganizationalUnitPayload>>
): Array<Container<OrganizationalUnitPayload>> {
	return organizationalUnits.filter(
		(unit) =>
			unit.guid !== program.organizational_unit && unit.user_grant?.subordinates.includes('create')
	);
}

// The organizations the user may create objects in, by the same rule as for
// units; an organization never adopts its own program.
export function organizationsManagedByUser(
	program: { organization: string },
	organizations: Array<Container<OrganizationPayload>>
): Array<Container<OrganizationPayload>> {
	return organizations.filter(
		(organization) =>
			organization.guid !== program.organization &&
			organization.user_grant?.subordinates.includes('create')
	);
}

export type AdopterGroup = {
	organization: Container<OrganizationPayload>;
	adoptable: boolean;
	units: Array<Container<OrganizationalUnitPayload>>;
};

// One group per organization that is adoptable itself or has adoptable
// units, in the order of the organizations.
export function groupedByOrganization(
	units: Array<Container<OrganizationalUnitPayload>>,
	organizations: Array<Container<OrganizationPayload>>,
	adoptableOrganizations: Array<Container<OrganizationPayload>>
): AdopterGroup[] {
	return organizations
		.map((organization) => ({
			organization,
			adoptable: adoptableOrganizations.some(({ guid }) => guid === organization.guid),
			units: units.filter(({ organization: guid }) => guid === organization.guid)
		}))
		.filter(({ adoptable, units }) => adoptable || units.length > 0);
}

// The scope whose adoptions are visible in a given context: an organizational
// unit sees only its own adoptions, an organization sees the adoptions of all
// of its units and its own.
export function adopterScope(context: {
	currentOrganization: Container<OrganizationPayload>;
	currentOrganizationalUnit: Container<OrganizationalUnitPayload> | undefined;
	organizationalUnits: Container<OrganizationalUnitPayload>[];
}): string[] {
	if (context.currentOrganizationalUnit) {
		return [context.currentOrganizationalUnit.guid];
	}

	return [
		context.currentOrganization.guid,
		...context.organizationalUnits
			.filter(({ organization }) => organization === context.currentOrganization.guid)
			.map(({ guid }) => guid)
	];
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

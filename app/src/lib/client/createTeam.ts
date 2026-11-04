import saveContainer from '$lib/client/saveContainer';
import {
	type Container,
	containerOfType,
	type NewContainer,
	type OrganizationalUnitPayload,
	organizationalUnitType,
	type OrganizationPayload,
	payloadTypes,
	predicates
} from '$lib/models';

// A team is a unit of its own kind that belongs to an area: the organization
// itself or one of its units, which the team is then part of.
export default async function createTeam(
	name: string,
	organization: Container<OrganizationPayload>,
	parent?: Container<OrganizationalUnitPayload>
) {
	const team = containerOfType(
		payloadTypes.enum.organizational_unit,
		organization
	) as NewContainer<OrganizationalUnitPayload>;
	team.payload.name = name;
	team.payload.organizationalUnitType =
		organizationalUnitType.enum['organizational_unit_type.team'];
	team.payload.level = parent ? parent.payload.level + 1 : 1;
	team.relation = parent
		? [{ object: parent.guid, position: 0, predicate: predicates.enum['is-part-of'] }]
		: [];
	return await saveContainer(team);
}

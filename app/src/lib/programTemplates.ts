import {
	type AnyPayload,
	type Container,
	getAvailableInProgramGuids,
	getDirectProgramGuids,
	isTemplateContainer,
	isTemplateRoot,
	type PartialRelation,
	type PayloadType,
	payloadTypes,
	predicates,
	type Relation
} from '$lib/models';

type SubmittedRelation = Relation & { deleted?: boolean };

export function requiresProgramTemplate(container: {
	guid?: string;
	payload: { type: PayloadType };
	relation: readonly PartialRelation[];
}) {
	// A section may live below an object that belongs to a program, but it is not itself a
	// program object. Only a direct is-part-of-program placement triggers the requirement.
	return (
		container.payload.type !== payloadTypes.enum.text && getDirectProgramGuids(container).length > 0
	);
}

export function isProgramScopedTemplateRoot(
	container: Container<AnyPayload>,
	{
		organizationGuid,
		payloadType,
		programGuid
	}: {
		organizationGuid: string;
		payloadType?: PayloadType;
		programGuid: string;
	}
) {
	const availableIn = getAvailableInProgramGuids(container);
	return (
		container.organization === organizationGuid &&
		(payloadType === undefined || container.payload.type === payloadType) &&
		isTemplateContainer(container) &&
		isTemplateRoot(container) &&
		availableIn.length === 1 &&
		availableIn[0] === programGuid
	);
}

function sameRelation(left: Relation, right: Relation) {
	return (
		left.object === right.object &&
		left.predicate === right.predicate &&
		left.subject === right.subject
	);
}

export function newProgramPlacements(
	submitted: readonly SubmittedRelation[],
	current: readonly Relation[]
) {
	return submitted.filter(
		(relation) =>
			!relation.deleted &&
			relation.predicate === predicates.enum['is-part-of-program'] &&
			!current.some((existing) => sameRelation(existing, relation))
	);
}

export function programPlacementsRequireTemplate(
	placements: readonly Relation[],
	containers: readonly Container<AnyPayload>[]
) {
	return placements.some(({ subject }) => {
		const container = containers.find(({ guid }) => guid === subject);
		return !container || requiresProgramTemplate({ ...container, relation: placements });
	});
}

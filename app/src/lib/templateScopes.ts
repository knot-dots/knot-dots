import {
	type AnyPayload,
	type Container,
	getAvailableInScopeGuids,
	getDirectProgramGuids,
	isMeasureContainer,
	isProgramContainer,
	isSimpleMeasureContainer,
	type MeasurePayload,
	type ProgramPayload,
	type SimpleMeasurePayload,
	isTemplateContainer,
	isTemplateRoot,
	type NewContainer,
	type PayloadType,
	predicates,
	type Relation,
	templatablePayloadTypes
} from '$lib/models';

type SubmittedRelation = Relation & { deleted?: boolean };

const templatableTypes = new Set<string>(templatablePayloadTypes);

export function isTemplateScope(
	container: Container<AnyPayload>
): container is Container<ProgramPayload | MeasurePayload | SimpleMeasurePayload> {
	return isProgramContainer(container) || isMeasureTemplateScope(container);
}

export function isMeasureTemplateScope(
	container: Container<AnyPayload>
): container is Container<MeasurePayload | SimpleMeasurePayload> {
	return isMeasureContainer(container) || isSimpleMeasureContainer(container);
}

export function getDirectMeasureGuids(container: NewContainer) {
	return [
		...new Set(
			container.relation.flatMap(({ object, predicate, subject }) =>
				predicate === predicates.enum['is-part-of-measure'] &&
				object !== undefined &&
				(subject === undefined || subject === container.guid)
					? [object]
					: []
			)
		)
	];
}

export function getTemplateScopeGuids(container: NewContainer) {
	return [...new Set([...getDirectProgramGuids(container), ...getDirectMeasureGuids(container)])];
}

export function requiresScopedTemplate(container: NewContainer) {
	// Section-only placement does not require a template, even inside a scoped hierarchy.
	return (
		templatableTypes.has(container.payload.type) && getTemplateScopeGuids(container).length > 0
	);
}

export function isScopedTemplateRoot(
	container: Container<AnyPayload>,
	{
		organizationGuid,
		payloadType,
		scopeGuid
	}: {
		organizationGuid: string;
		payloadType?: PayloadType;
		scopeGuid: string;
	}
) {
	const availableIn = getAvailableInScopeGuids(container);
	return (
		container.organization === organizationGuid &&
		(payloadType === undefined || container.payload.type === payloadType) &&
		isTemplateContainer(container) &&
		isTemplateRoot(container) &&
		availableIn.length === 1 &&
		availableIn[0] === scopeGuid
	);
}

function sameRelation(left: Relation, right: Relation) {
	return (
		left.object === right.object &&
		left.predicate === right.predicate &&
		left.subject === right.subject
	);
}

export function newTemplateScopePlacements(
	submitted: readonly SubmittedRelation[],
	current: readonly Relation[]
) {
	return submitted.filter(
		(relation) =>
			!relation.deleted &&
			(relation.predicate === predicates.enum['is-part-of-program'] ||
				relation.predicate === predicates.enum['is-part-of-measure']) &&
			!current.some((existing) => sameRelation(existing, relation))
	);
}

export function scopePlacementsRequireTemplate(
	placements: readonly Relation[],
	containers: readonly Container<AnyPayload>[]
) {
	return placements.some((placement) => {
		const { subject } = placement;
		const container = containers.find(({ guid }) => guid === subject);
		return !container || requiresScopedTemplate({ ...container, relation: [placement] });
	});
}

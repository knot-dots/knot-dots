import { error, json } from '@sveltejs/kit';
import type { DatabaseConnection } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	audience,
	type Container,
	createCopyOf,
	type GoalContainer,
	indicatorCategories,
	type IndicatorContainer,
	indicatorTypes,
	isEffectContainer,
	isGoalContainer,
	isIndicatorContainer,
	isMeasureContainer,
	isTaskContainer,
	type MeasureContainer,
	measureTypes,
	type NewContainer,
	newContainer,
	payloadTypes,
	policyFieldBNK,
	predicates,
	programTypes,
	sustainableDevelopmentGoals,
	taskCategories,
	topics
} from '$lib/models';
import {
	createContainer,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getManyContainers,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { RequestHandler } from './$types';

function findCopiedTargetGuid(
	originalTargetGuid: string,
	copied: Array<GoalContainer | MeasureContainer | IndicatorContainer>
): string {
	return copied.find(({ relation }) =>
		relation.some(
			({ predicate, object }) =>
				predicate === predicates.enum['is-copy-of'] && object === originalTargetGuid
		)
	)?.guid as string;
}

function mapRelationsByPredicate<T extends { relation: any[]; guid: string }>(
	copyFrom: T,
	opts: {
		predicate: string;
		subjectMustBeSelf?: boolean;
		resolveObject: (originalObjectGuid: string) => string;
	}
) {
	const { predicate, subjectMustBeSelf = true, resolveObject } = opts;

	return copyFrom.relation
		.filter(
			({ predicate: p, subject }: { predicate: string; subject?: string }) =>
				p === predicate && (!subjectMustBeSelf || subject === copyFrom.guid)
		)
		.map(
			({
				position,
				predicate: p,
				object: originalObjectGuid
			}: {
				position: number;
				predicate: string;
				object: string;
			}) => ({
				position,
				predicate: p,
				object: resolveObject(originalObjectGuid)
			})
		)
		.filter(({ object }) => object !== undefined);
}

async function copyGoalsFromOriginal(
	createdMeasure: MeasureContainer,
	originalGoals: GoalContainer[],
	userGuid: string,
	txConnection: any
) {
	const isPartOfObjects: Array<MeasureContainer | GoalContainer> = [createdMeasure];

	const originalGoalsSorted = originalGoals.toSorted(
		(a, b) => a.payload.hierarchyLevel - b.payload.hierarchyLevel
	);

	for (const copyFrom of originalGoalsSorted) {
		const copy = createCopyOf(
			copyFrom,
			createdMeasure.organization,
			createdMeasure.organizational_unit
		);

		copy.relation.push({
			object: createdMeasure.guid,
			predicate: predicates.enum['is-part-of'],
			position: 0
		});

		copy.relation.push({
			object: createdMeasure.guid,
			predicate: predicates.enum['is-part-of-measure'],
			position: 0
		});

		copy.relation.push(
			...mapRelationsByPredicate(copyFrom, {
				predicate: predicates.enum['is-part-of'],
				resolveObject: (origObj) => findCopiedTargetGuid(origObj, isPartOfObjects)
			})
		);

		copy.user.push({
			predicate: predicates.enum['is-creator-of'],
			subject: userGuid
		});

		isPartOfObjects.push(
			(await createContainer(copy as NewContainer)(txConnection)) as GoalContainer
		);
	}

	return isPartOfObjects;
}

async function copyTasksFromOriginal(
	createdMeasure: MeasureContainer,
	originals: Container[],
	isPartOfObjects: Array<MeasureContainer | GoalContainer>,
	userGuid: string,
	txConnection: any
) {
	for (const copyFrom of originals.filter(isTaskContainer)) {
		const copy = createCopyOf(
			copyFrom,
			createdMeasure.organization,
			createdMeasure.organizational_unit
		);

		copy.relation.push({
			object: createdMeasure.guid,
			predicate: predicates.enum['is-part-of-measure'],
			position: 0
		});

		copy.relation.push(
			...mapRelationsByPredicate(copyFrom, {
				predicate: predicates.enum['is-part-of'],
				resolveObject: (origObj) => findCopiedTargetGuid(origObj, isPartOfObjects)
			})
		);

		copy.user.push({
			predicate: predicates.enum['is-creator-of'],
			subject: userGuid
		});

		await createContainer(copy as NewContainer)(txConnection);
	}
}

async function copyIndicatorsFromOriginal(
	createdMeasure: MeasureContainer,
	originals: Container[],
	userGuid: string,
	txConnection: any
) {
	const measuredByObjects: IndicatorContainer[] = [];

	const organizationIndicators = (await getManyContainers(
		[createdMeasure.organization],
		{ type: [payloadTypes.enum.indicator] },
		''
	)(txConnection)) as IndicatorContainer[];

	for (const copyFrom of originals.filter(isIndicatorContainer)) {
		const match = organizationIndicators.find(
			({ payload }) => payload.quantity === copyFrom.payload.quantity
		);
		if (match) {
			measuredByObjects.push({
				...match,
				relation: [
					...match.relation,
					{
						object: copyFrom.guid,
						position: 0,
						predicate: predicates.enum['is-copy-of'],
						subject: match.guid
					}
				]
			});
		} else {
			const copy = createCopyOf(copyFrom, createdMeasure.organization, null);

			copy.user.push({
				predicate: predicates.enum['is-creator-of'],
				subject: userGuid
			});

			measuredByObjects.push(
				(await createContainer(copy as NewContainer)(txConnection)) as IndicatorContainer
			);
		}
	}

	return measuredByObjects;
}

async function copyEffectsFromOriginal(
	createdMeasure: MeasureContainer,
	originals: Container[],
	isPartOfObjects: Array<MeasureContainer | GoalContainer>,
	indicators: IndicatorContainer[],
	userGuid: string,
	txConnection: any
) {
	for (const copyFrom of originals.filter(isEffectContainer)) {
		const copy = createCopyOf(
			copyFrom,
			createdMeasure.organization,
			createdMeasure.organizational_unit
		);

		copy.relation.push(
			...mapRelationsByPredicate(copyFrom, {
				predicate: predicates.enum['is-part-of'],
				resolveObject: (origObj) => findCopiedTargetGuid(origObj, isPartOfObjects)
			})
		);

		copy.relation.push(
			...mapRelationsByPredicate(copyFrom, {
				predicate: predicates.enum['is-measured-by'],
				resolveObject: (origIndicatorGuid) => findCopiedTargetGuid(origIndicatorGuid, indicators)
			})
		);

		copy.user.push({
			predicate: predicates.enum['is-creator-of'],
			subject: userGuid
		});

		await createContainer(copy as NewContainer)(txConnection);
	}
}

async function copySectionsFromOriginal(
	createdMeasure: MeasureContainer,
	originals: Container[],
	isPartOfObjects: Array<MeasureContainer | GoalContainer>,
	userGuid: string,
	txConnection: any
) {
	for (const copyFrom of originals.filter(({ guid, relation }) =>
		relation.some(
			({ predicate, subject }) => predicate === predicates.enum['is-section-of'] && subject === guid
		)
	)) {
		const copy = createCopyOf(
			copyFrom,
			createdMeasure.organization,
			createdMeasure.organizational_unit
		);

		copy.relation.push(
			...mapRelationsByPredicate(copyFrom, {
				predicate: predicates.enum['is-section-of'],
				resolveObject: (origObj) => findCopiedTargetGuid(origObj, isPartOfObjects)
			})
		);

		copy.user.push({
			predicate: predicates.enum['is-creator-of'],
			subject: userGuid
		});

		await createContainer(copy as NewContainer)(txConnection);
	}
}

export const GET = (async ({ locals, url }) => {
	const expectedParams = z.object({
		assignee: z.array(z.string().uuid()).default([]),
		audience: z.array(audience).default([]),
		category: z.array(sustainableDevelopmentGoals).default([]),
		indicatorCategory: z.array(indicatorCategories).default([]),
		indicatorType: z.array(indicatorTypes).default([]),
		isPartOfMeasure: z.array(z.string().uuid()).default([]),
		isPartOfProgram: z.array(z.string().uuid()).default([]),
		measureType: z.array(measureTypes).default([]),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z.array(z.string().uuid()).default([]),
		payloadType: z.array(payloadTypes).default([]),
		policyFieldBNK: z.array(policyFieldBNK).default([]),
		programType: z.array(programTypes).default([]),
		relatedTo: z.array(z.string().uuid()).default([]),
		relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
		sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
		taskCategory: z.array(taskCategories).default([]),
		terms: z.array(z.string()).default([]),
		topic: z.array(topics).default([])
	});
	const parseResult = expectedParams.safeParse(
		Object.fromEntries(
			Object.keys(expectedParams.shape).map((key) => [
				key,
				url.searchParams.has(key) ? url.searchParams.getAll(key) : undefined
			])
		)
	);

	if (!parseResult.success) {
		error(400, { message: parseResult.error.message });
	}

	let containers: AnyContainer[];

	if (parseResult.data.isPartOfProgram.length > 0) {
		containers = await locals.pool.connect(
			getAllContainersRelatedToProgram(parseResult.data.isPartOfProgram[0], {
				audience: parseResult.data.audience,
				categories: parseResult.data.category,
				policyFieldsBNK: parseResult.data.policyFieldBNK,
				terms: parseResult.data.terms[0],
				topics: parseResult.data.topic,
				type: parseResult.data.payloadType
			})
		);
	} else if (parseResult.data.isPartOfMeasure.length > 0) {
		if (parseResult.data.relatedTo.length > 0) {
			containers = await locals.pool.connect(
				getAllRelatedContainers(
					parseResult.data.organization,
					parseResult.data.relatedTo[0],
					parseResult.data.relationType,
					{ type: parseResult.data.payloadType },
					parseResult.data.sort[0]
				)
			);
		} else {
			containers = await locals.pool.connect(
				getAllContainersRelatedToMeasure(
					parseResult.data.isPartOfMeasure[0],
					{
						terms: parseResult.data.terms[0],
						type: parseResult.data.payloadType
					},
					parseResult.data.sort[0]
				)
			);
		}
	} else if (parseResult.data.payloadType.includes(payloadTypes.enum.organizational_unit)) {
		containers = await locals.pool.connect(
			getManyOrganizationalUnitContainers(
				parseResult.data.organization.length > 0
					? { organization: parseResult.data.organization[0] }
					: {}
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				parseResult.data.organization,
				{
					audience: parseResult.data.audience,
					categories: parseResult.data.category,
					indicatorCategories: parseResult.data.indicatorCategory,
					indicatorTypes: parseResult.data.indicatorType,
					measureTypes: parseResult.data.measureType,
					organizationalUnits: parseResult.data.organizationalUnit,
					policyFieldsBNK: parseResult.data.policyFieldBNK,
					programTypes: parseResult.data.programType,
					terms: parseResult.data.terms[0],
					topics: parseResult.data.topic,
					type: parseResult.data.payloadType
				},
				parseResult.data.sort[0]
			)
		);
	}

	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});
	const parseResult = newContainer.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	} else {
		const result = await locals.pool.connect(async (connection: DatabaseConnection) =>
			connection.transaction(async (txConnection) => {
				const createdContainer = await createContainer({
					...parseResult.data,
					user: [
						{
							predicate: predicates.enum['is-creator-of'],
							subject: locals.user.guid
						}
					]
				})(txConnection);

				const isCopyOfRelation = parseResult.data.relation.find(
					({ object, predicate }) =>
						predicate === predicates.enum['is-copy-of'] && object !== undefined
				);

				if (isCopyOfRelation && isMeasureContainer(createdContainer)) {
					const containersRelatedToOriginal = filterVisible(
						await getAllContainersRelatedToMeasure(
							isCopyOfRelation.object as string,
							{},
							''
						)(txConnection),
						locals.user
					);

					const isPartOfObjects = await copyGoalsFromOriginal(
						createdContainer,
						containersRelatedToOriginal
							.filter(isGoalContainer)
							.filter(({ relation }) =>
								relation.some(
									({ predicate, object }) =>
										predicate == predicates.enum['is-part-of'] && object == isCopyOfRelation.object
								)
							),
						locals.user.guid,
						txConnection
					);

					await copyTasksFromOriginal(
						createdContainer,
						containersRelatedToOriginal,
						isPartOfObjects,
						locals.user.guid,
						txConnection
					);

					const indicators = await copyIndicatorsFromOriginal(
						createdContainer,
						containersRelatedToOriginal,
						locals.user.guid,
						txConnection
					);

					await copyEffectsFromOriginal(
						createdContainer,
						containersRelatedToOriginal,
						isPartOfObjects,
						indicators,
						locals.user.guid,
						txConnection
					);

					await copySectionsFromOriginal(
						createdContainer,
						containersRelatedToOriginal,
						isPartOfObjects,
						locals.user.guid,
						txConnection
					);
				}

				return createdContainer;
			})
		);

		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;

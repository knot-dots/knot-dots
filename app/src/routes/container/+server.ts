import { error, json } from '@sveltejs/kit';
import type { DatabaseConnection } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	type Container,
	createCopyOf,
	indicatorCategories,
	type IndicatorContainer,
	indicatorTypes,
	isEffectContainer,
	isIndicatorContainer,
	isMeasureContainer,
	isMeasureResultContainer,
	isMilestoneContainer,
	isTaskContainer,
	type MeasureContainer,
	type MeasureResultContainer,
	measureTypes,
	type MilestoneContainer,
	type NewContainer,
	newContainer,
	payloadTypes,
	predicates,
	strategyTypes,
	sustainableDevelopmentGoals,
	taskCategories,
	topics
} from '$lib/models';
import {
	createContainer,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToStrategy,
	getAllRelatedContainers,
	getManyContainers
} from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const expectedParams = z.object({
		assignee: z.array(z.string().uuid()).default([]),
		audience: z.array(audience).default([]),
		category: z.array(sustainableDevelopmentGoals).default([]),
		indicatorCategory: z.array(indicatorCategories).default([]),
		indicatorType: z.array(indicatorTypes).default([]),
		isPartOfMeasure: z.array(z.string().uuid()).default([]),
		isPartOfStrategy: z.array(z.string().uuid()).default([]),
		measureType: z.array(measureTypes).default([]),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z.array(z.string().uuid()).default([]),
		payloadType: z.array(payloadTypes).default([]),
		relatedTo: z.array(z.string().uuid()).default([]),
		relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
		sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
		strategyType: z.array(strategyTypes).default([]),
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

	let containers: Container[];

	if (parseResult.data.isPartOfStrategy.length > 0) {
		containers = await locals.pool.connect(
			getAllContainersRelatedToStrategy(parseResult.data.isPartOfStrategy[0], {
				categories: parseResult.data.category,
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
					strategyTypes: parseResult.data.strategyType,
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

					const isPartOfObjects: Array<
						MeasureContainer | MeasureResultContainer | MilestoneContainer
					> = [createdContainer];

					for (const copyFrom of containersRelatedToOriginal.filter(isMeasureResultContainer)) {
						const copyContainer = createCopyOf(
							copyFrom,
							createdContainer.organization,
							createdContainer.organizational_unit
						);

						copyContainer.relation.push({
							object: createdContainer.guid,
							predicate: predicates.enum['is-part-of'],
							position: 0
						});
						copyContainer.relation.push({
							object: createdContainer.guid,
							predicate: predicates.enum['is-part-of-measure'],
							position: 0
						});
						copyContainer.user.push({
							predicate: predicates.enum['is-creator-of'],
							subject: locals.user.guid
						});

						isPartOfObjects.push(
							(await createContainer(copyContainer as NewContainer)(
								txConnection
							)) as MeasureResultContainer
						);
					}

					for (const copyFrom of containersRelatedToOriginal.filter(isMilestoneContainer)) {
						const copyContainer = createCopyOf(
							copyFrom,
							createdContainer.organization,
							createdContainer.organizational_unit
						);

						copyContainer.relation.push({
							object: createdContainer.guid,
							predicate: predicates.enum['is-part-of-measure'],
							position: 0
						});
						copyContainer.relation.push(
							...copyFrom.relation
								.filter(
									({ predicate, subject }) =>
										predicate == predicates.enum['is-part-of'] && subject == copyFrom.guid
								)
								.map(({ position, predicate, object: originalIsPartOfObject }) => ({
									position,
									predicate,
									object: isPartOfObjects.find(({ relation }) =>
										relation.find(
											({ predicate, object }) =>
												predicate == predicates.enum['is-copy-of'] &&
												originalIsPartOfObject == object
										)
									)?.guid as string
								}))
								.filter(({ object }) => object !== undefined)
						);

						copyContainer.user.push({
							predicate: predicates.enum['is-creator-of'],
							subject: locals.user.guid
						});

						isPartOfObjects.push(
							(await createContainer(copyContainer as NewContainer)(
								txConnection
							)) as MilestoneContainer
						);
					}

					for (const copyFrom of containersRelatedToOriginal.filter(isTaskContainer)) {
						const copyContainer = createCopyOf(
							copyFrom,
							createdContainer.organization,
							createdContainer.organizational_unit
						);

						copyContainer.relation.push({
							object: createdContainer.guid,
							predicate: predicates.enum['is-part-of-measure'],
							position: 0
						});
						copyContainer.relation.push(
							...copyFrom.relation
								.filter(
									({ predicate, subject }) =>
										predicate == predicates.enum['is-part-of'] && subject == copyFrom.guid
								)
								.map(({ position, predicate, object: originalIsPartOfObject }) => ({
									position,
									predicate,
									object: isPartOfObjects.find(({ relation }) =>
										relation.find(
											({ predicate, object }) =>
												predicate == predicates.enum['is-copy-of'] &&
												originalIsPartOfObject == object
										)
									)?.guid as string
								}))
								.filter(({ object }) => object !== undefined)
						);

						copyContainer.user.push({
							predicate: predicates.enum['is-creator-of'],
							subject: locals.user.guid
						});

						await createContainer(copyContainer as NewContainer)(txConnection);
					}

					const measuredByObjects = [] as IndicatorContainer[];

					const organizationIndicators = (await getManyContainers(
						[createdContainer.organization],
						{ type: [payloadTypes.enum.indicator] },
						''
					)(txConnection)) as IndicatorContainer[];

					for (const copyFrom of containersRelatedToOriginal.filter(isIndicatorContainer)) {
						const match = organizationIndicators.find(
							({ payload }) => payload.quantity == copyFrom.payload.quantity
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
							const copyContainer = createCopyOf(copyFrom, createdContainer.organization, null);
							copyContainer.user.push({
								predicate: predicates.enum['is-creator-of'],
								subject: locals.user.guid
							});
							measuredByObjects.push(
								(await createContainer(copyContainer as NewContainer)(
									txConnection
								)) as IndicatorContainer
							);
						}
					}

					for (const copyFrom of containersRelatedToOriginal.filter(isEffectContainer)) {
						const copyContainer = createCopyOf(
							copyFrom,
							createdContainer.organization,
							createdContainer.organizational_unit
						);

						copyContainer.relation.push({
							object: createdContainer.guid,
							predicate: predicates.enum['is-part-of'],
							position: 0
						});
						copyContainer.relation.push(
							...copyFrom.relation
								.filter(
									({ predicate, subject }) =>
										predicate == predicates.enum['is-measured-by'] && subject == copyFrom.guid
								)
								.map(({ position, predicate, object: originalIsMeasuredByObject }) => ({
									position,
									predicate,
									object: measuredByObjects.find(({ relation }) =>
										relation.find(
											({ predicate, object }) =>
												predicate == predicates.enum['is-copy-of'] &&
												originalIsMeasuredByObject == object
										)
									)?.guid as string
								}))
								.filter(({ object }) => object !== undefined)
						);

						copyContainer.user.push({
							predicate: predicates.enum['is-creator-of'],
							subject: locals.user.guid
						});

						await createContainer(copyContainer as NewContainer)(txConnection);
					}
				}

				return createdContainer;
			})
		);

		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;

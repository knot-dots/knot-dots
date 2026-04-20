import { error, json } from '@sveltejs/kit';
import type { CommonQueryMethods, DatabaseConnection } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import {
	administrativeTypes,
	type AnyContainer,
	audience,
	type Container,
	createCopyOf,
	type GoalContainer,
	indicatorCategories,
	indicatorTypes,
	isEffectContainer,
	isGoalContainer,
	isMeasureContainer,
	isOrganizationalUnitContainer,
	isProgramContainer,
	isReportContainer,
	isTaskContainer,
	type MeasureContainer,
	type NewContainer,
	newContainer,
	type OrganizationalUnitContainer,
	type PartialRelation,
	payloadTypes,
	policyFieldBNK,
	predicates,
	type ProgramContainer,
	programTypes,
	type Relation,
	type ReportContainer,
	sustainableDevelopmentGoals,
	taskCategories,
	topics
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	createContainer,
	createManyContainerRelations,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getManyContainers,
	getManyOrganizationContainers
} from '$lib/server/db';
import type { User } from '$lib/stores';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { RequestHandler } from './$types';

function findCopiedTargetGuid<T extends AnyContainer>(
	originalTargetGuid: string,
	copied: Array<GoalContainer | T>
): string {
	return copied.find(({ relation }) =>
		relation.some(
			({ predicate, object }) =>
				predicate === predicates.enum['is-copy-of'] && object === originalTargetGuid
		)
	)?.guid as string;
}

function mapRelationsByPredicate<T extends { relation: Relation[]; guid: string }>(
	copyFrom: T,
	opts: {
		predicate: string;
		subjectMustBeSelf?: boolean;
		resolveObject: (originalObjectGuid: string) => string;
		resolveSubject?: (originalSubjectGuid: string) => string;
	}
) {
	const { predicate, subjectMustBeSelf = true, resolveObject, resolveSubject } = opts;

	return copyFrom.relation
		.filter(
			({ predicate: p, subject }: { predicate: string; subject?: string }) =>
				p === predicate && (!subjectMustBeSelf || subject === copyFrom.guid)
		)
		.map(({ position, predicate, object: originalObjectGuid, subject: originalSubjectGuid }) => ({
			position,
			predicate,
			object: resolveObject(originalObjectGuid),
			...(resolveSubject ? { subject: resolveSubject(originalSubjectGuid) } : undefined)
		}))
		.filter(({ object }) => object !== undefined);
}

async function copyMeasureFromOriginal<T extends AnyContainer>(
	createdContainer: T,
	originalMeasure: MeasureContainer,
	user: User,
	txConnection: CommonQueryMethods
) {
	const copy = createCopyOf(
		originalMeasure,
		createdContainer.organization,
		createdContainer.organizational_unit
	);

	const copiedMeasure = (await createContainer({
		...copy,
		user: [{ predicate: predicates.enum['is-creator-of'], subject: user.guid }],
		relation: [
			...copy.relation,
			{
				object: createdContainer.guid,
				predicate: predicates.enum['is-part-of-program'],
				position:
					originalMeasure.relation.find(
						({ predicate }) => predicate === predicates.enum['is-part-of-program']
					)?.position ?? 0
			}
		]
	} as NewContainer)(txConnection)) as MeasureContainer;

	const isCopyOfRelation = copiedMeasure.relation.find(
		({ object, predicate }) => predicate === predicates.enum['is-copy-of'] && object !== undefined
	);

	await copyMeasure(copiedMeasure, isCopyOfRelation as PartialRelation, user, txConnection);

	return copiedMeasure;
}

async function copyGoalsFromOriginal(
	createdMeasure: MeasureContainer,
	originalGoals: GoalContainer[],
	userGuid: string,
	txConnection: CommonQueryMethods
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
	txConnection: CommonQueryMethods
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

async function copyEffectsFromOriginal(
	createdMeasure: MeasureContainer,
	originals: Container[],
	isPartOfObjects: Array<MeasureContainer | GoalContainer>,
	userGuid: string,
	txConnection: CommonQueryMethods
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
				resolveObject: (origIndicatorGuid) => origIndicatorGuid
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
	createdContainer: AnyContainer,
	originals: Container[],
	isPartOfObjects: Array<AnyContainer>,
	userGuid: string,
	txConnection: CommonQueryMethods
) {
	for (const copyFrom of originals.filter(({ guid, relation }) =>
		relation.some(
			({ predicate, subject }) => predicate === predicates.enum['is-section-of'] && subject === guid
		)
	)) {
		const copy = createCopyOf(
			copyFrom,
			createdContainer.organization,
			createdContainer.organizational_unit
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

async function copyMeasure(
	createdContainer: MeasureContainer,
	isCopyOfRelation: PartialRelation,
	user: User,
	txConnection: CommonQueryMethods
) {
	const containersRelatedToOriginal = filterVisible(
		await getAllContainersRelatedToMeasure(isCopyOfRelation.object as string, {}, '')(txConnection),
		user
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
		user.guid,
		txConnection
	);

	await copyTasksFromOriginal(
		createdContainer,
		containersRelatedToOriginal,
		isPartOfObjects,
		user.guid,
		txConnection
	);

	await copyEffectsFromOriginal(
		createdContainer,
		containersRelatedToOriginal,
		isPartOfObjects,
		user.guid,
		txConnection
	);

	await copySectionsFromOriginal(
		createdContainer,
		containersRelatedToOriginal,
		isPartOfObjects,
		user.guid,
		txConnection
	);
}

async function copyProgram(
	createdProgram: ProgramContainer,
	isCopyOfRelation: PartialRelation,
	user: User,
	txConnection: CommonQueryMethods
) {
	const containersRelatedToOriginal = filterVisible(
		await getAllContainersRelatedToProgram(isCopyOfRelation.object as string, {})(txConnection),
		user
	);

	const originalParts = containersRelatedToOriginal
		.filter(({ relation }) =>
			relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-program'])
		)
		.filter(({ guid }) => guid !== isCopyOfRelation.object);

	const isPartOfObjects = [createdProgram] as AnyContainer[];

	for (const copyFrom of originalParts) {
		if (isMeasureContainer(copyFrom)) {
			isPartOfObjects.push(
				await copyMeasureFromOriginal(createdProgram, copyFrom, user, txConnection)
			);
		} else {
			const copy = createCopyOf(
				copyFrom,
				createdProgram.organization,
				createdProgram.organizational_unit
			);

			copy.relation.push({
				object: createdProgram.guid,
				predicate: predicates.enum['is-part-of-program'],
				position:
					copyFrom.relation.find(
						({ predicate }) => predicate === predicates.enum['is-part-of-program']
					)?.position ?? 0
			});

			isPartOfObjects.push(await createContainer(copy as NewContainer)(txConnection));
		}
	}

	const relations = [];

	for (const copyFrom of containersRelatedToOriginal) {
		relations.push(
			...(mapRelationsByPredicate(copyFrom, {
				predicate: predicates.enum['is-part-of'],
				resolveObject: (origObj) => findCopiedTargetGuid(origObj, isPartOfObjects),
				resolveSubject: (origObj) => findCopiedTargetGuid(origObj, isPartOfObjects)
			}).filter(({ subject }) => subject !== undefined) as Relation[])
		);
	}

	await createManyContainerRelations(relations)(txConnection);
}

async function copyOrganizationalUnitContainer(
	createdContainer: OrganizationalUnitContainer,
	isCopyOfRelation: PartialRelation,
	user: User,
	txConnection: CommonQueryMethods
) {
	const containersRelatedToOriginal = filterVisible(
		await getAllRelatedContainers(
			[],
			isCopyOfRelation.object as string,
			['is-section-of'],
			{},
			''
		)(txConnection),
		user
	);

	await copySectionsFromOriginal(
		createdContainer,
		containersRelatedToOriginal,
		[createdContainer],
		user.guid,
		txConnection
	);
}

async function copyReportContainer(
	createdContainer: ReportContainer,
	isCopyOfRelation: PartialRelation,
	user: User,
	txConnection: CommonQueryMethods
) {
	const containersRelatedToOriginal = filterVisible(
		await getAllRelatedContainers(
			[],
			isCopyOfRelation.object as string,
			['is-section-of'],
			{},
			''
		)(txConnection),
		user
	);

	await copySectionsFromOriginal(
		createdContainer,
		containersRelatedToOriginal,
		[createdContainer],
		user.guid,
		txConnection
	);
}

export const GET = (async ({ locals, url }) => {
	const expectedParams = z.object({
		administrativeType: z.array(administrativeTypes).default([]),
		assignee: z.array(z.string().uuid()).default([]),
		audience: z.array(audience).catch([]).default([]),
		federalState: z.array(z.string()).default([]),
		guid: z.array(z.string().uuid()).default([]),
		indicator: z.array(z.string().uuid()).default([]),
		indicatorCategory: z.array(indicatorCategories).default([]),
		indicatorType: z.array(indicatorTypes).default([]),
		limit: z.coerce.number().int().positive().optional(),
		offset: z.coerce.number().int().nonnegative().default(0),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z
			.array(z.string().uuid())
			.or(
				z
					.array(z.literal(''))
					.length(1)
					.transform(() => null)
			)
			.default([]),
		payloadType: z.array(payloadTypes).default([]),
		policyFieldBNK: z.array(policyFieldBNK).catch([]).default([]),
		programType: z.array(programTypes).default([]),
		relatedTo: z.array(z.string().uuid()).default([]),
		relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
		sdg: z.array(sustainableDevelopmentGoals).catch([]).default([]),
		sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
		taskCategory: z.array(taskCategories).default([]),
		terms: z.array(z.string()).default([]),
		topic: z.array(topics).catch([]).default([])
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

	const organizations = await locals.pool.connect(
		getManyOrganizationContainers({ default: true }, '')
	);

	const categoryContext = await loadCategoryContext({
		connect: locals.pool.connect,
		scope:
			organizations.length > 0
				? [organizations[0].guid, ...parseResult.data.organization]
				: parseResult.data.organization,
		user: locals.user
	});

	const customCategories = extractCustomCategoryFilters(url, categoryContext?.keys ?? []);

	const containers = await locals.pool.connect(
		getManyContainers(
			parseResult.data.organization,
			{
				// Skip legacy filters for any key that is handled as a custom category,
				// to avoid conflicting AND conditions against different JSON paths.
				audience: customCategories['audience'] ? [] : parseResult.data.audience,
				customCategories,
				guid: parseResult.data.guid,
				indicators: parseResult.data.indicator,
				indicatorCategories: parseResult.data.indicatorCategory,
				indicatorTypes: parseResult.data.indicatorType,
				organizationalUnits: parseResult.data.organizationalUnit,
				policyFieldsBNK: customCategories['policyFieldBNK'] ? [] : parseResult.data.policyFieldBNK,
				programTypes: parseResult.data.programType,
				sdg: customCategories['sdg'] ? [] : parseResult.data.sdg,
				terms: parseResult.data.terms[0],
				topics: customCategories['topic'] ? [] : parseResult.data.topic,
				type: parseResult.data.payloadType
			},
			parseResult.data.sort[0],
			parseResult.data.limit,
			parseResult.data.offset
		)
	);

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
					await copyMeasure(createdContainer, isCopyOfRelation, locals.user, txConnection);
				} else if (isCopyOfRelation && isProgramContainer(createdContainer)) {
					await copyProgram(createdContainer, isCopyOfRelation, locals.user, txConnection);
				} else if (isCopyOfRelation && isReportContainer(createdContainer)) {
					await copyReportContainer(createdContainer, isCopyOfRelation, locals.user, txConnection);
				} else if (isCopyOfRelation && isOrganizationalUnitContainer(createdContainer)) {
					await copyOrganizationalUnitContainer(
						createdContainer,
						isCopyOfRelation,
						locals.user,
						txConnection
					);
				}

				return createdContainer;
			})
		);

		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;

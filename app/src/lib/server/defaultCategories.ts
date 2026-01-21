import { Roarr as log } from 'roarr';
import type { DatabasePool } from 'slonik';
import de from '$lib/locales/de.json' assert { type: 'json' };
import {
	audience,
	containerOfType,
	isCategoryContainer,
	isTermContainer,
	payloadTypes,
	policyFieldBNK,
	predicates,
	sustainableDevelopmentGoals,
	topics,
	visibility,
	type CategoryContainer,
	type ModifiedContainer,
	type NewContainer,
	type Relation,
	type TermContainer
} from '$lib/models';
import {
	createContainer,
	createManyContainerRelations,
	getManyContainers,
	getManyOrganizationContainers,
	updateContainer,
	updateManyContainerRelations
} from '$lib/server/db';

const translations = de as Record<string, unknown>;

function translate(key: string) {
	const direct = translations[key];
	if (typeof direct === 'string') {
		return direct;
	}

	const [namespace, remainder] = key.split('.', 2);
	if (!remainder) {
		return (translations[key] as string | undefined) ?? key;
	}

	const group = translations[namespace];
	if (group && typeof group === 'object' && group !== null) {
		const value = (group as Record<string, string>)[remainder];
		if (value) {
			return value;
		}
	}

	return key;
}

type TermSeed = {
	value: string;
	title: string;
	description?: string;
};

type CategorySeed = {
	description?: string;
	key: string;
	level?: number;
	title: string;
	terms: TermSeed[];
};

const defaultCategorySeeds: CategorySeed[] = [
	{
		key: 'category',
		title: translate('category'),
		terms: sustainableDevelopmentGoals.options.map((value) => ({
			title: translate(value),
			value
		}))
	},
	{
		key: 'topic',
		title: translate('topic'),
		terms: topics.options.map((value) => ({
			title: translate(value),
			value
		}))
	},
	{
		key: 'policyFieldBNK',
		title: translate('policy_field_bnk'),
		terms: policyFieldBNK.options.map((value) => ({
			title: translate(value),
			value
		}))
	},
	{
		key: 'audience',
		title: translate('audience'),
		terms: audience.options.map((value) => ({
			title: translate(value),
			value
		}))
	}
];

let initializationPromise: Promise<boolean> | null = null;

export function ensureDefaultCategoryTerms(pool: DatabasePool) {
	if (!initializationPromise) {
		initializationPromise = seedDefaultCategories(pool)
			.catch((error) => {
				log.error(error, 'Failed to seed default categories');
				throw error;
			})
			.finally(() => {
				initializationPromise = null;
			});
	}

	return initializationPromise;
}

async function seedDefaultCategories(pool: DatabasePool): Promise<boolean> {
	const [defaultOrganization] = await pool.connect(
		getManyOrganizationContainers({ default: true }, 'alpha')
	);

	if (!defaultOrganization) {
		log.warn('No default organization found; retrying default category seeding later');
		return false;
	}

	return seedForOrganization(pool, defaultOrganization);
}

async function seedForOrganization(
	pool: DatabasePool,
	organization: { guid: string; realm: string }
) {
	const categories = (
		await pool.connect(getManyContainers([], { type: [payloadTypes.enum.category] }, 'alpha'))
	)
		.filter(isCategoryContainer)
		.filter((container) => container.organization === organization.guid);

	// Removed ensureCategoryKeys call

	const terms = (
		await pool.connect(getManyContainers([], { type: [payloadTypes.enum.term] }, 'alpha'))
	)
		.filter(isTermContainer)
		.filter((container) => container.organization === organization.guid);

	for (const seed of defaultCategorySeeds) {
		let category = categories.find((candidate) => candidate.payload.key === seed.key);

		if (!category) {
			const byTitle = categories.find(
				(candidate) =>
					candidate.payload.title === seed.title || candidate.payload.title === seed.key
			);

			if (byTitle) {
				if (byTitle.payload.key !== seed.key) {
					byTitle.payload = { ...byTitle.payload, key: seed.key };
					const updated = await pool.connect(updateContainer(byTitle as ModifiedContainer));
					category = { ...updated, relation: byTitle.relation } as CategoryContainer;
				} else {
					category = byTitle;
				}
			}
		}

		if (!category) {
			category = await createCategory(pool, organization.guid, organization.realm, seed);
			categories.push(category);
		}

		category = await ensureCategoryMetadata(pool, category, seed);
		category = await ensurePublicVisibility(pool, category);

		await ensureTermsForCategory(pool, category, seed, terms);
	}

	return true;
}

async function createCategory(
	pool: DatabasePool,
	organizationGuid: string,
	realm: string,
	seed: CategorySeed
) {
	const newCategory = containerOfType(
		payloadTypes.enum.category,
		organizationGuid,
		null,
		organizationGuid,
		realm
	) as NewContainer;

	const payload = newCategory.payload as CategoryContainer['payload'];
	payload.key = seed.key;
	payload.level = seed.level ?? payload.level ?? 0;
	payload.title = seed.title;
	if (seed.description) {
		payload.description = seed.description;
	}
	payload.visibility = visibility.enum.public;

	const created = await pool.connect(createContainer(newCategory));

	if (!isCategoryContainer(created)) {
		throw new Error('Unexpected payload when creating default category');
	}

	return created;
}

async function ensureTermsForCategory(
	pool: DatabasePool,
	category: CategoryContainer,
	seed: CategorySeed,
	allTerms: TermContainer[]
) {
	const relationsToUpdate: Relation[] = [];

	for (const [index, termSeed] of seed.terms.entries()) {
		let term = allTerms.find((candidate) => candidate.payload.value === termSeed.value);

		if (!term) {
			term = await createTerm(pool, category, termSeed, index);
			allTerms.push(term);
		} else {
			term = await ensureTermMetadata(pool, term, termSeed);
			await ensurePublicVisibility(pool, term);
			await ensureRelation(pool, category.guid, term, index);
		}

		relationsToUpdate.push({
			object: category.guid,
			position: index,
			predicate: predicates.enum['is-part-of-category'],
			subject: term.guid
		});
	}

	if (relationsToUpdate.length > 0) {
		await pool.connect(updateManyContainerRelations(relationsToUpdate));
	}
}

async function ensureRelation(
	pool: DatabasePool,
	categoryGuid: string,
	term: TermContainer,
	position: number
) {
	const hasRelation = term.relation.some(
		({ object, predicate }) =>
			object === categoryGuid && predicate === predicates.enum['is-part-of-category']
	);

	if (!hasRelation) {
		await pool.connect(
			createManyContainerRelations([
				{
					object: categoryGuid,
					position,
					predicate: predicates.enum['is-part-of-category'],
					subject: term.guid
				}
			])
		);
		term.relation = [
			...term.relation,
			{
				object: categoryGuid,
				position,
				predicate: predicates.enum['is-part-of-category'],
				subject: term.guid
			}
		];
	}
}

async function ensurePublicVisibility<T extends CategoryContainer | TermContainer>(
	pool: DatabasePool,
	container: T
) {
	if (container.payload.visibility === visibility.enum.public) {
		return container;
	}

	container.payload.visibility = visibility.enum.public;

	await pool.connect(updateContainer(container as ModifiedContainer));

	return container;
}

async function ensureCategoryMetadata(
	pool: DatabasePool,
	category: CategoryContainer,
	seed: CategorySeed
) {
	const needsKeyUpdate = category.payload.key !== seed.key;
	const needsTitleUpdate = category.payload.title !== seed.title;
	const needsLevelUpdate = seed.level !== undefined && category.payload.level !== seed.level;
	const needsDescriptionUpdate =
		seed.description !== undefined && category.payload.description !== seed.description;

	if (!needsKeyUpdate && !needsTitleUpdate && !needsLevelUpdate && !needsDescriptionUpdate) {
		return category;
	}

	const level = needsLevelUpdate
		? (seed.level ?? category.payload.level ?? 0)
		: (category.payload.level ?? 0);

	category.payload = {
		...category.payload,
		key: needsKeyUpdate ? seed.key : category.payload.key,
		title: needsTitleUpdate ? seed.title : category.payload.title,
		level,
		description: needsDescriptionUpdate ? seed.description : category.payload.description
	};

	const updated = await pool.connect(updateContainer(category as ModifiedContainer));

	return { ...updated, relation: category.relation } as CategoryContainer;
}

async function ensureTermMetadata(pool: DatabasePool, term: TermContainer, seed: TermSeed) {
	const needsTitleUpdate = term.payload.title !== seed.title;
	const needsDescriptionUpdate =
		seed.description !== undefined && term.payload.description !== seed.description;

	if (!needsTitleUpdate && !needsDescriptionUpdate) {
		return term;
	}

	term.payload = {
		...term.payload,
		title: needsTitleUpdate ? seed.title : term.payload.title,
		description: needsDescriptionUpdate ? seed.description : term.payload.description
	};

	const updated = await pool.connect(updateContainer(term as ModifiedContainer));

	return { ...updated, relation: term.relation } as TermContainer;
}

async function createTerm(
	pool: DatabasePool,
	category: CategoryContainer,
	seed: TermSeed,
	position: number
) {
	const newTerm = containerOfType(
		payloadTypes.enum.term,
		category.organization,
		category.organizational_unit,
		category.managed_by,
		category.realm
	) as NewContainer;

	const payload = newTerm.payload as TermContainer['payload'];
	payload.title = seed.title;
	payload.value = seed.value;
	if (seed.description) {
		payload.description = seed.description;
	}
	payload.visibility = visibility.enum.public;

	newTerm.relation = [
		{
			object: category.guid,
			position,
			predicate: predicates.enum['is-part-of-category']
		}
	];

	const created = await pool.connect(createContainer(newTerm));

	if (!isTermContainer(created)) {
		throw new Error('Unexpected payload when creating default term');
	}

	return created;
}

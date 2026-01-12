import { Roarr as log } from 'roarr';
import type { DatabasePool } from 'slonik';
import de from '$lib/locales/de.json' assert { type: 'json' };
import {
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
		key: 'sdg',
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
		key: 'policy_field_bnk',
		title: translate('policy_field_bnk'),
		terms: policyFieldBNK.options.map((value) => ({
			title: translate(value),
			value
		}))
	}
];

let initializationPromise: Promise<void> | null = null;

export function ensureDefaultCategoryTerms(pool: DatabasePool) {
	if (!initializationPromise) {
		initializationPromise = seedDefaultCategories(pool)
			.then((seeded) => {
				if (!seeded) {
					initializationPromise = null;
				}
			})
			.catch((error) => {
				log.error(error, 'Failed to seed default categories');
				initializationPromise = null;
				throw error;
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

	const categories = (await pool.connect(
		getManyContainers([], { type: [payloadTypes.enum.category] }, 'alpha')
	))
		.filter(isCategoryContainer)
		.filter((container) => container.organization === defaultOrganization.guid);

	const terms = (await pool.connect(
		getManyContainers([], { type: [payloadTypes.enum.term] }, 'alpha')
	))
		.filter(isTermContainer)
		.filter((container) => container.organization === defaultOrganization.guid);

	const categoriesByKey = new Map(categories.map((category) => [category.payload.key, category]));

	for (const seed of defaultCategorySeeds) {
		let category = categoriesByKey.get(seed.key);
		if (!category) {
			category = await createCategory(pool, defaultOrganization.guid, defaultOrganization.realm, seed);
			categoriesByKey.set(seed.key, category);
			categories.push(category);
		}

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
		({ object, predicate }) => object === categoryGuid && predicate === predicates.enum['is-part-of-category']
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

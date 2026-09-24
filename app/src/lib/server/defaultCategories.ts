import { Roarr as log } from 'roarr';
import type { DatabasePool } from 'slonik';
import de from '$lib/locales/de.json' with { type: 'json' };
import {
	type AnyPayload,
	audience,
	type CategoryPayload,
	type Container,
	containerOfType,
	isCategoryContainer,
	isTermContainer,
	type ModifiedContainer,
	type NewContainer,
	payloadTypes,
	policyFieldBNK,
	predicates,
	type Relation,
	sustainableDevelopmentGoals,
	type TermPayload,
	topics,
	visibility
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
	title: string;
	description?: string;
};

type CategorySeed = {
	description?: string;
	title: string;
	terms: TermSeed[];
};

const defaultCategorySeeds: CategorySeed[] = [
	{
		title: translate('category'),
		terms: sustainableDevelopmentGoals.options.map((value) => ({
			title: translate(value)
		}))
	},
	{
		title: translate('topic'),
		terms: topics.options.map((value) => ({
			title: translate(value)
		}))
	},
	{
		title: translate('policy_field_bnk'),
		terms: policyFieldBNK.options.map((value) => ({
			title: translate(value)
		}))
	},
	{
		title: translate('audience'),
		terms: audience.options.map((value) => ({
			title: translate(value)
		}))
	}
];

let initializationPromise: Promise<boolean> | null = null;

export function ensureDefaultCategoryTerms(pool: DatabasePool) {
	if (!initializationPromise) {
		initializationPromise = seedDefaultCategories(pool)
			.then((result) => {
				// When we couldn't seed (e.g., missing default org), allow a retry later.
				if (!result) {
					initializationPromise = null;
				}
				return result;
			})
			.catch((error) => {
				log.error(error, 'Failed to seed default categories');
				initializationPromise = null; // allow retry after a failure
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

	return seedForOrganization(pool, defaultOrganization);
}

async function seedForOrganization(pool: DatabasePool, organization: Container<AnyPayload>) {
	const categories = (
		await pool.connect(getManyContainers([], { type: [payloadTypes.enum.category] }, 'alpha'))
	)
		.filter(isCategoryContainer)
		.filter((container) => container.organization === organization.guid);

	// Skip seeding entirely when categories already exist for the organization.
	if (categories.length > 0) {
		return true;
	}

	const terms = (
		await pool.connect(getManyContainers([], { type: [payloadTypes.enum.term] }, 'alpha'))
	)
		.filter(isTermContainer)
		.filter((container) => container.organization === organization.guid);

	for (const seed of defaultCategorySeeds) {
		let category = categories.find((candidate) => candidate.payload.title === seed.title);

		if (!category) {
			category = await createCategory(pool, organization, seed);
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
	organization: Container<AnyPayload>,
	seed: CategorySeed
) {
	const newCategory = containerOfType(payloadTypes.enum.category, organization) as NewContainer;

	const payload = newCategory.payload as Container<CategoryPayload>['payload'];
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
	category: Container<CategoryPayload>,
	seed: CategorySeed,
	allTerms: Container<TermPayload>[]
) {
	const relationsToUpdate: Relation[] = [];

	for (const [index, termSeed] of seed.terms.entries()) {
		let term = allTerms.find((candidate) => candidate.payload.title === termSeed.title);

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
	term: Container<TermPayload>,
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

async function ensurePublicVisibility<T extends Container<CategoryPayload | TermPayload>>(
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
	category: Container<CategoryPayload>,
	seed: CategorySeed
) {
	const needsTitleUpdate = category.payload.title !== seed.title;
	const needsDescriptionUpdate =
		seed.description !== undefined && category.payload.description !== seed.description;

	if (!needsTitleUpdate && !needsDescriptionUpdate) {
		return category;
	}

	category.payload = {
		...category.payload,
		title: needsTitleUpdate ? seed.title : category.payload.title,
		description: needsDescriptionUpdate ? seed.description : category.payload.description
	};

	const updated = await pool.connect(updateContainer(category as ModifiedContainer));

	return { ...updated, relation: category.relation } as Container<CategoryPayload>;
}

async function ensureTermMetadata(
	pool: DatabasePool,
	term: Container<TermPayload>,
	seed: TermSeed
) {
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

	return { ...updated, relation: term.relation } as Container<TermPayload>;
}

async function createTerm(
	pool: DatabasePool,
	category: Container<CategoryPayload>,
	seed: TermSeed,
	position: number
) {
	const newTerm = containerOfType(payloadTypes.enum.term, category) as NewContainer;

	const payload = newTerm.payload as TermPayload;
	payload.title = seed.title;
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

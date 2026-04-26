import { type DatabaseTransactionConnection } from 'slonik';
import * as z from 'zod';
import {
	categoryContainer,
	categoryPayload,
	CategoryContainer,
	createContainer,
	createRelation,
	getCategoryContainer,
	getTermContainersForCategory,
	getPool,
	termContainer,
	termPayload,
	TermContainer,
	updateContainer
} from './db.ts';
import { getAdministrativeAreasDifu } from './difu.ts';

const categoryKey = 'kommunaltyp';
const categoryTitle = 'Kommunaltyp';
const categoryRelationPredicate = 'is-part-of-category';
const creatorPredicate = 'is-creator-of';
const envSchema = z.object({
	DIFU_FILE: z.string().min(1),
	IMPORT_ORGANIZATION: z.uuid(),
	IMPORT_USER: z.uuid(),
	PUBLIC_KC_REALM: z.string().default('knot-dots')
});

(async function main() {
	const env = envSchema.parse(process.env);

	const difu = getAdministrativeAreasDifu(env.DIFU_FILE);

	const termsSorted = [...new Set(difu.values().map(({ code }) => code))].toSorted();

	const stats = {
		categoryCreated: false,
		categoryUpdated: false,
		termsCreated: 0,
		termsUpdated: 0
	};

	const pool = await getPool();

	await pool.transaction(async (tx) => {
		const category = await ensureCategory(tx, env.IMPORT_ORGANIZATION, env, stats);
		const termsByCode = buildTermMap(
			await getTermContainersForCategory(
				tx,
				env.IMPORT_ORGANIZATION,
				category.guid,
				categoryRelationPredicate
			)
		);

		for (const code of difu.values().map(({ code }) => code)) {
			const position = termsSorted.findIndex((term) => term === code);
			await ensureTerm(tx, category, code, position, termsByCode, env, stats);
		}
	});

	console.log(`Parsed ${difu.size} DIFU rows from ${env.DIFU_FILE}`);
	console.log(
		[
			`Category created: ${stats.categoryCreated}`,
			`Category updated: ${stats.categoryUpdated}`,
			`Terms created: ${stats.termsCreated}`,
			`Terms updated: ${stats.termsUpdated}`
		].join('\n')
	);
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

function buildTermMap(terms: Readonly<Array<TermContainer>>) {
	const byCode = new Map<string, TermContainer>();

	for (const term of terms) {
		const code = String(term.payload.value ?? '').trim();
		if (!code) {
			continue;
		}

		if (byCode.has(code)) {
			throw new Error(`Found duplicate active term "${code}" in category "${categoryKey}"`);
		}

		byCode.set(code, term);
	}

	return byCode;
}

async function ensureCategory(
	tx: DatabaseTransactionConnection,
	organization: string,
	env: z.infer<typeof envSchema>,
	stats: {
		categoryCreated: boolean;
		categoryUpdated: boolean;
	}
): Promise<CategoryContainer> {
	const existing = await getCategoryContainer(tx, organization, categoryKey);

	if (!existing) {
		stats.categoryCreated = true;
		return (await createContainer(
			categoryContainer.parse({
				managed_by: organization,
				organization: organization,
				organizational_unit: null,
				payload: {
					type: 'category',
					key: categoryKey,
					objectTypes: ['organizational_unit'],
					title: categoryTitle
				},
				realm: env.PUBLIC_KC_REALM,
				user: [{ predicate: creatorPredicate, subject: env.IMPORT_USER }]
			})
		)(tx)) as CategoryContainer;
	}

	const needsUpdate =
		existing.payload.key !== categoryKey ||
		existing.payload.title !== categoryTitle ||
		existing.payload.visibility !== 'public' ||
		existing.payload.objectTypes.length !== 1 ||
		existing.payload.objectTypes[0] !== 'organizational_unit';

	if (!needsUpdate) {
		return existing;
	}

	stats.categoryUpdated = true;
	return (await updateContainer({
		...existing,
		payload: categoryPayload.parse({
			...existing.payload,
			key: categoryKey,
			objectTypes: ['organizational_unit'],
			title: categoryTitle
		})
	})(tx)) as CategoryContainer;
}

async function ensureTerm(
	tx: DatabaseTransactionConnection,
	category: CategoryContainer,
	code: string,
	position: number,
	termsByCode: Map<string, TermContainer>,
	env: z.infer<typeof envSchema>,
	stats: { termsCreated: number; termsUpdated: number }
) {
	const existing = termsByCode.get(code);

	if (!existing) {
		const created = (await createContainer(
			termContainer.parse({
				managed_by: category.managed_by,
				organization: category.organization,
				organizational_unit: category.organizational_unit,
				payload: { type: 'term', title: code, value: code },
				realm: env.PUBLIC_KC_REALM,
				user: [{ predicate: creatorPredicate, subject: env.IMPORT_USER }]
			})
		)(tx)) as TermContainer;

		await createRelation([
			{
				object: category.guid,
				position,
				predicate: categoryRelationPredicate,
				subject: created.guid
			}
		])(tx);
		termsByCode.set(code, created);
		stats.termsCreated++;
		return created;
	}

	const needsUpdate =
		existing.payload.title !== code ||
		existing.payload.value !== code ||
		existing.payload.visibility !== 'public';

	if (!needsUpdate) {
		return existing;
	}

	const updated = (await updateContainer({
		...existing,
		payload: termPayload.parse({ ...existing.payload, title: code, value: code })
	})(tx)) as TermContainer;
	termsByCode.set(code, updated);
	stats.termsUpdated++;
	return updated;
}

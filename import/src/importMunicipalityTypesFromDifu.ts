import { type DatabaseTransactionConnection } from 'slonik';
import * as z from 'zod';
import {
	categoryContainer,
	categoryPayload,
	CategoryContainer,
	createContainer,
	createRelation,
	getCategoryContainer,
	getOrganizationalUnitContainers,
	getTermContainersForCategory,
	getPool,
	OrganizationalUnitContainer,
	OrganizationalUnitPayload,
	termContainer,
	termPayload,
	TermContainer,
	updateContainer
} from './db.ts';
import { type AdministrativeAreaDifu, getAdministrativeAreasDifu } from './difu.ts';
import assert from 'node:assert';

const categoryKey = 'kommunaltyp';
const categoryTitle = 'Kommunaltyp';
const categoryRelationPredicate = 'is-part-of-category';
const creatorPredicate = 'is-creator-of';

const env = z
	.object({
		DIFU_FILE: z.string().min(1),
		IMPORT_ORGANIZATION: z.uuid(),
		IMPORT_USER: z.uuid(),
		PUBLIC_KC_REALM: z.string().default('knot-dots')
	})
	.parse(process.env);

type Assignment = {
	codes: string[];
	official_municipality_key: string;
	rows: AdministrativeAreaDifu[];
};

function addAssignment(assignments: Map<string, Assignment>, row: AdministrativeAreaDifu) {
	const existing = assignments.get(row.official_municipality_key);

	if (!existing) {
		assignments.set(row.official_municipality_key, {
			codes: [row.code],
			official_municipality_key: row.official_municipality_key,
			rows: [row]
		});
		return;
	}

	if (!existing.codes.includes(row.code)) {
		existing.codes.push(row.code);
	}
	existing.rows.push(row);
}

function buildOrganizationalUnitMap(containers: Readonly<Array<OrganizationalUnitContainer>>) {
	const byKey = new Map<string, Array<OrganizationalUnitContainer>>();

	for (const container of containers) {
		const key = String(container.payload.officialMunicipalityKey ?? '').trim();
		if (!key) {
			continue;
		}

		const existing = byKey.get(key) ?? [];
		existing.push(container);
		byKey.set(key, existing);
	}

	return byKey;
}

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
	stats: { categoryCreated: boolean; categoryUpdated: boolean }
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

function withAssignedCategory(payload: OrganizationalUnitPayload, codes: string[]) {
	return {
		...payload,
		category: {
			...payload.category,
			[categoryKey]: Array.from(
				new Set(
					categoryKey in payload.category ? [...payload.category[categoryKey], ...codes] : codes
				)
			)
		}
	};
}

function isSame<T>(a: T, b: T) {
	try {
		assert.deepEqual(a, b);
		return true;
	} catch (_) {
		return false;
	}
}

(async function main() {
	const rows = getAdministrativeAreasDifu(env.DIFU_FILE);
	const assignments = new Map<string, Assignment>();

	for (const row of rows.values()) {
		addAssignment(assignments, row);
	}

	const termPositions = new Map(
		[...new Set(rows.values().map(({ code }) => code))].sort().map((code, index) => [code, index])
	);
	const stats = {
		categoryCreated: false,
		categoryUpdated: false,
		assignmentsMatched: 0,
		assignmentsUnchanged: 0,
		assignmentsUpdated: 0,
		duplicateKeys: 0,
		termsCreated: 0,
		termsUpdated: 0,
		unmatchedRows: [] as AdministrativeAreaDifu[]
	};

	const pool = await getPool();

	await pool.transaction(async (tx) => {
		const category = await ensureCategory(tx, env.IMPORT_ORGANIZATION, stats);
		const termsByCode = buildTermMap(
			await getTermContainersForCategory(
				tx,
				env.IMPORT_ORGANIZATION,
				category.guid,
				categoryRelationPredicate
			)
		);
		const organizationalUnitsByKey = buildOrganizationalUnitMap(
			await getOrganizationalUnitContainers(tx, env.IMPORT_ORGANIZATION)
		);

		for (const assignment of assignments.values()) {
			const matches = organizationalUnitsByKey.get(assignment.official_municipality_key) ?? [];

			if (matches.length === 0) {
				stats.unmatchedRows.push(...assignment.rows);
				continue;
			}

			if (matches.length > 1) {
				stats.duplicateKeys++;
			}

			for (const code of assignment.codes) {
				const position = termPositions.get(code);
				if (position === undefined) {
					throw new Error(`Missing term position for code ${code}`);
				}

				await ensureTerm(tx, category, code, position, termsByCode, stats);
			}

			for (const organizationalUnit of matches) {
				const nextPayload = withAssignedCategory(organizationalUnit.payload, assignment.codes);

				stats.assignmentsMatched++;

				if (isSame(organizationalUnit.payload, nextPayload)) {
					stats.assignmentsUnchanged++;
					continue;
				}

				const updated = (await updateContainer({ ...organizationalUnit, payload: nextPayload })(
					tx
				)) as OrganizationalUnitContainer;
				organizationalUnitsByKey.set(assignment.official_municipality_key, [updated]);
				stats.assignmentsUpdated++;
			}
		}
	});

	console.log(`Parsed ${rows.size} DIFU rows from ${env.DIFU_FILE}`);
	console.log(
		[
			`Category created: ${stats.categoryCreated}`,
			`Category updated: ${stats.categoryUpdated}`,
			`Terms created: ${stats.termsCreated}`,
			`Terms updated: ${stats.termsUpdated}`,
			`Assignments matched: ${stats.assignmentsMatched}`,
			`Assignments updated: ${stats.assignmentsUpdated}`,
			`Assignments unchanged: ${stats.assignmentsUnchanged}`,
			`Duplicate municipality keys (assigned to all matches): ${stats.duplicateKeys}`,
			`Unmatched rows: ${stats.unmatchedRows.length}`
		].join('\n')
	);

	if (stats.unmatchedRows.length > 0) {
		console.log('Unmatched DIFU rows:');
		for (const row of stats.unmatchedRows) {
			console.log(
				JSON.stringify({
					code: row.code,
					name: row.name,
					official_municipality_key: row.official_municipality_key,
					row_number: row.row_number,
					source_sheet: row.source_sheet
				})
			);
		}
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

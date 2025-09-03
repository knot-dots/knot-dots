import { error, fail } from '@sveltejs/kit';
import { parse } from 'csv-parse';
import stream from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import de from '$lib/locales/de.json';
import {
	containerOfType,
	editorialState,
	emptyContainer,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	createContainer,
	getAllRelatedUsers,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const reverseTranslationMap = new Map<string, string>(
	Object.entries(de)
		.filter((e): e is [string, string] => typeof e[1] === 'string')
		.map(([k, v]) => [v, k])
);

export const actions = {
	default: async ({ locals, url, request }) => {
		if (!createFeatureDecisions(locals.features).useImportFromCsv()) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		if (!locals.user.isAuthenticated) {
			error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
		}

		const organization = await locals.pool.connect(
			getContainerByGuid(url.hostname?.split('.').at(0) ?? ('' as string))
		);
		const organizationalUnits = await locals.pool.connect(
			getManyOrganizationalUnitContainers({
				organization: organization.guid
			})
		);
		const programs = await locals.pool.connect(
			getManyContainers([organization.guid], { type: [payloadTypes.enum.program] }, '')
		);

		const data = await request.formData();
		const csv = data.get('csv');
		const creator = data.get('creator');

		if (!csv) {
			return fail(400, { errors: [unwrapFunctionStore(_)('import.error.missing')] });
		}

		if (!(csv instanceof File) || csv.type != 'text/csv') {
			return fail(400, { errors: [unwrapFunctionStore(_)('import.error.unsupported_media_type')] });
		}

		const parser = stream.Readable.fromWeb(csv.stream() as ReadableStream).pipe(
			parse({
				columns: [
					'position',
					'type',
					'title',
					'summary',
					'description',
					'status',
					'organizationalUnit',
					'program',
					'topic',
					'category',
					'startDate',
					'endDate',
					'audience'
				],
				delimiter: ';',
				from: 2,
				skipRecordsWithError: false
			})
		);

		const containers: NewContainer[] = [];
		const errors = [];

		try {
			for await (const record of parser) {
				try {
					const organizationalUnit = organizationalUnits.find(
						({ payload }) => payload.name == record.organizationalUnit
					);
					const program = programs.find(({ payload }) => payload.title == record.program);
					const container = emptyContainer.parse({
						managed_by: organizationalUnit?.guid ?? organization.guid,
						organization: organization.guid,
						organizational_unit: organizationalUnit?.guid ?? null,
						payload: {
							...(record.audience
								? {
										audience: record.audience
											.split(', ')
											.map((t: string) => reverseTranslationMap.get(t))
									}
								: {}),
							category: record.category?.toLowerCase().split(', ') ?? [],
							description: record.description,
							...(record.endDate ? { endDate: record.endDate } : {}),
							...(record.status ? { status: reverseTranslationMap.get(record.status) } : {}),
							...(record.startDate ? { startDate: record.startDate } : {}),
							...(record.summary ? { summary: record.summary } : {}),
							editorialState: editorialState.enum['editorial_state.draft'],
							title: record.title,
							...(record.topic
								? {
										topic: record.topic
											?.trim()
											.split(', ')
											.map((t: string) => reverseTranslationMap.get(t))
									}
								: {}),
							type: reverseTranslationMap.get(record.type)
						},
						realm: env.PUBLIC_KC_REALM,
						relation: program
							? [
									{
										object: program.guid,
										position: parseInt(record.position),
										predicate: predicates.enum['is-part-of-program']
									}
								]
							: [],
						user: [
							{
								predicate: predicates.enum['is-creator-of'],
								subject: typeof creator === 'string' ? creator : locals.user.guid
							}
						]
					}) as NewContainer;
					containers.push(container);
				} catch (error) {
					errors.push(
						unwrapFunctionStore(_)('import.error.invalid_record', {
							values: { line: record.position, errors: String(error) }
						})
					);
				}
			}
		} catch (error) {
			return fail(400, { errors: [String(error)] });
		}

		if (errors.length > 0) {
			return fail(422, { errors });
		}

		await locals.pool.transaction(async (connection) => {
			for (const container of containers) {
				await createContainer(container)(connection);
			}
		});
	}
} satisfies Actions;

export const load = (async ({ locals, parent }) => {
	if (!createFeatureDecisions(locals.features).useImportFromCsv()) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (
		!defineAbilityFor(locals.user).can(
			'create',
			containerOfType(
				payloadTypes.enum.program,
				currentOrganization.guid,
				currentOrganizationalUnit?.guid ?? null,
				currentOrganizationalUnit?.guid ?? currentOrganization.guid,
				env.PUBLIC_KC_REALM
			)
		)
	) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	return {
		users: locals.pool.connect(
			getAllRelatedUsers(currentOrganizationalUnit?.guid ?? currentOrganization.guid, [
				predicates.enum['is-admin-of'],
				predicates.enum['is-head-of']
			])
		)
	};
}) satisfies PageServerLoad;

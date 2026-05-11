import { error, fail } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { parse } from 'csv-parse';
import stream from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	containerOfType,
	editorialState,
	emptyContainer,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	type NewContainer,
	payloadTypes,
	predicates,
	type ProgramContainer
} from '$lib/models';
import { reverseTranslationMap } from '$lib/server/csv';
import {
	createContainer,
	getAllRelatedUsers,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const actions = {
	default: async ({ locals, params, request }) => {
		const featureDecisions = createFeatureDecisions(locals.features);

		if (!featureDecisions.useImportFromCsv()) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		if (!locals.user.isAuthenticated) {
			error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
		}

		let currentOrganizationGuid: string;
		let currentOrganizationalUnitGuid: string | undefined;

		try {
			const containerFromParams = await locals.pool.connect(getContainerByGuid(params.guid));
			if (
				isOrganizationalUnitContainer(containerFromParams) &&
				defineAbilityFor(locals.user).can('read', containerFromParams)
			) {
				currentOrganizationalUnitGuid = containerFromParams.guid;
				currentOrganizationGuid = containerFromParams.organization;
			} else if (
				isOrganizationContainer(containerFromParams) &&
				defineAbilityFor(locals.user).can('read', containerFromParams)
			) {
				currentOrganizationGuid = containerFromParams.guid;
			} else {
				error(404, { message: unwrapFunctionStore(_)('error.not_found') });
			}
		} catch (e: unknown) {
			if (e instanceof NotFoundError) {
				error(404, { message: unwrapFunctionStore(_)('error.not_found') });
			} else {
				throw e;
			}
		}

		if (
			!defineAbilityFor(locals.user).can(
				'create',
				containerOfType(
					payloadTypes.enum.program,
					currentOrganizationGuid,
					currentOrganizationalUnitGuid ?? null,
					currentOrganizationalUnitGuid ?? currentOrganizationGuid,
					env.PUBLIC_KC_REALM
				)
			)
		) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}

		const organizationalUnits = await locals.pool.connect(
			getManyOrganizationalUnitContainers({
				include: {
					organization: currentOrganizationGuid
				}
			})
		);
		const programs = (await locals.pool.connect(
			getManyContainers([currentOrganizationGuid], { type: [payloadTypes.enum.program] }, '')
		)) as ProgramContainer[];

		const data = await request.formData();
		const csv = data.get('csv');
		const creator = data.get('creator');

		if (!csv) {
			return fail(400, { errors: [unwrapFunctionStore(_)('import.error.missing')] });
		}

		if (!(csv instanceof File) || (!csv.name.endsWith('.csv') && csv.type !== 'text/csv')) {
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
					'sdg',
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

					const audience = record.audience?.trim()
						? record.audience
								.split(',')
								.map((v: string) => v.trim())
								.map((v: string) => reverseTranslationMap.get(v))
								.filter((v: string | undefined): v is string => v !== undefined)
						: [];
					const policyFieldBNK = record.policyFieldBNK?.trim()
						? record.policyFieldBNK
								.split(',')
								.map((v: string) => v.trim())
								.map((v: string) => reverseTranslationMap.get(v))
								.filter((v: string | undefined): v is string => v !== undefined)
						: [];
					const sdg = record.sdg?.trim()
						? record.sdg
								.split(',')
								.map((v: string) => v.trim().toLowerCase())
								.filter(Boolean)
						: [];
					const topic = record.topic?.trim()
						? record.topic
								.split(',')
								.map((v: string) => v.trim())
								.map((v: string) => reverseTranslationMap.get(v))
								.filter((v: string | undefined): v is string => v !== undefined)
						: [];

					const program = programs.find(({ payload }) => payload.title == record.program);
					const container = emptyContainer.parse({
						managed_by: organizationalUnit?.guid ?? currentOrganizationGuid,
						organization: currentOrganizationGuid,
						organizational_unit: organizationalUnit?.guid ?? null,
						payload: {
							category: {
								...(audience.length > 0 ? { audience } : {}),
								...(policyFieldBNK.length > 0 ? { policyFieldBNK } : {}),
								...(sdg.length > 0 ? { sdg } : {}),
								...(topic.length > 0 ? { topic } : {})
							},
							description: record.description,
							...(record.endDate ? { endDate: record.endDate } : {}),
							...(record.status ? { status: reverseTranslationMap.get(record.status) } : {}),
							...(record.startDate ? { startDate: record.startDate } : {}),
							...(record.summary ? { summary: record.summary } : {}),
							editorialState: editorialState.enum['editorial_state.draft'],
							title: record.title,
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
			const ability = defineAbilityFor(locals.user);
			for (const container of containers) {
				if (ability.can('create', container)) {
					await createContainer(container)(connection);
				}
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

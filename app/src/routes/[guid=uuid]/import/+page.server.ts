import { error, fail } from '@sveltejs/kit';
import { parse } from 'csv-parse';
import stream from 'node:stream';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	anyInitialPayload,
	type AnyPayload,
	type Container,
	containerOfType,
	createNewContainerSchema,
	editorialState,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	type NewContainer,
	type OrganizationPayload,
	payloadTypes,
	predicates,
	type ProgramPayload
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	detectDelimiter,
	reverseTranslationMapForPayloadType,
	reverseTranslationMapForStatus
} from '$lib/server/csv';
import {
	createContainer,
	getAllRelatedUsers,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationContainers,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';
import { findCategoryGuid, resolveCategoryTerms } from '$lib/categoryOptions';

const importFieldAliases: Record<string, string> = {
	['inhalt']: 'description',
	['titel']: 'title',
	['laufzeit ende']: 'endDate',
	['kurze projektbeschreibung']: 'summary',
	['zuständige organisation']: 'organizationalUnit',
	['objekt']: 'type',
	['nummer']: 'position',
	['programm']: 'program',
	['laufzeit beginn']: 'startDate',
	['status']: 'status'
};

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

		// the scope the import creates into; its computed grants authorize creating
		let scopeContainer: Container<AnyPayload>;
		try {
			const containerFromParams = await locals.pool.connect(getContainerByGuid(params.guid));
			scopeContainer = containerFromParams;
			if (
				isOrganizationalUnitContainer(containerFromParams) &&
				defineAbilityFor(locals.user).can('read', containerFromParams)
			) {
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
				containerOfType(payloadTypes.enum.program, scopeContainer)
			)
		) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}

		const defaultOrganizations = (await locals.pool.connect(
			getManyOrganizationContainers({ default: true }, '')
		)) as Container<OrganizationPayload>[];
		const scope = [currentOrganizationGuid, ...defaultOrganizations.map(({ guid }) => guid)].filter(
			(guid, index, values) => values.indexOf(guid) === index
		);
		const categoryContext = await loadCategoryContext({
			connect: locals.pool.connect,
			scope,
			user: locals.user
		});

		const organizationalUnits = await locals.pool.connect(
			getManyOrganizationalUnitContainers({
				include: {
					organization: [currentOrganizationGuid]
				}
			})
		);
		const programs = (await locals.pool.connect(
			getManyContainers(
				[currentOrganizationGuid],
				{ template: false, type: [payloadTypes.enum.program] },
				''
			)
		)) as Container<ProgramPayload>[];

		const data = await request.formData();
		const csv = data.get('csv');
		const creator = data.get('creator');

		if (!csv) {
			return fail(400, { errors: [unwrapFunctionStore(_)('import.error.missing')] });
		}

		if (!(csv instanceof File) || (!csv.name.endsWith('.csv') && csv.type !== 'text/csv')) {
			return fail(400, { errors: [unwrapFunctionStore(_)('import.error.unsupported_media_type')] });
		}

		const csvText = await csv.text();
		const firstLine = csvText.split('\n')[0] ?? '';
		const delimiter = detectDelimiter(firstLine);

		const parser = stream.Readable.from(csvText).pipe(
			parse({
				bom: true,
				columns: true,
				delimiter,
				relax_column_count: true,
				skip_empty_lines: true,
				skipRecordsWithError: false
			})
		);

		const containers: NewContainer[] = [];
		const errors = [];
		let lineNumber = 1;

		try {
			for await (const record of parser) {
				lineNumber++;
				try {
					const fields: Record<string, string> = {};
					const categoryValues: Record<string, string[]> = {};

					for (const [header, value] of Object.entries(record)) {
						const trimmedHeader = header.trim();
						const trimmedValue = (value as string).trim();
						if (!trimmedValue) continue;

						const fieldKey = importFieldAliases[trimmedHeader.toLowerCase()];
						if (fieldKey) {
							fields[fieldKey] = trimmedValue;
						} else {
							const categoryGuid = findCategoryGuid(trimmedHeader, categoryContext);
							if (categoryGuid) {
								const terms = resolveCategoryTerms(trimmedValue, categoryGuid, categoryContext);
								if (terms.length > 0) {
									categoryValues[categoryGuid] = terms;
								}
							}
						}
					}

					const organizationalUnit = organizationalUnits.find(
						({ payload }) => payload.name == fields.organizationalUnit
					);

					const program = programs.find(({ payload }) => payload.title == fields.program);
					const container = createNewContainerSchema(anyInitialPayload).parse({
						managed_by: organizationalUnit?.guid ?? currentOrganizationGuid,
						organization: currentOrganizationGuid,
						organizational_unit: organizationalUnit?.guid ?? null,
						payload: {
							category: categoryValues,
							description: fields.description,
							...(fields.endDate ? { endDate: fields.endDate } : {}),
							...(fields.status
								? { status: reverseTranslationMapForStatus.get(fields.status) ?? fields.status }
								: {}),
							...(fields.startDate ? { startDate: fields.startDate } : {}),
							...(fields.summary ? { summary: fields.summary } : {}),
							editorialState: editorialState.enum['editorial_state.draft'],
							title: fields.title,
							type: reverseTranslationMapForPayloadType.get(fields.type) ?? fields.type
						},
						realm: env.PUBLIC_KC_REALM,
						relation: program
							? [
									{
										object: program.guid,
										position: parseInt(fields.position || '0'),
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
							values: { line: lineNumber, errors: String(error) }
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
				if (ability.can('create', containerOfType(container.payload.type, scopeContainer))) {
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
			containerOfType(payloadTypes.enum.program, currentOrganizationalUnit ?? currentOrganization)
		)
	) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	return {
		title: unwrapFunctionStore(_)('import'),
		users: locals.pool.connect(
			getAllRelatedUsers(currentOrganizationalUnit?.guid ?? currentOrganization.guid, [
				predicates.enum['is-admin-of'],
				predicates.enum['is-head-of']
			])
		)
	};
}) satisfies PageServerLoad;

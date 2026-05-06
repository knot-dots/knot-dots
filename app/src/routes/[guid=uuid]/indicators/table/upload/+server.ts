import { error, json } from '@sveltejs/kit';
import { parse } from 'csv-parse';
import stream from 'node:stream';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	type ActualDataContainer,
	containerOfType,
	editorialState,
	emptyContainer,
	type IndicatorTemplateContainer,
	isActualDataContainer,
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	detectDelimiter,
	parseSdgValues,
	resolveColumnHeader,
	reverseTranslationMap
} from '$lib/server/csv';
import {
	createContainer,
	getContainerByGuid,
	getManyContainers,
	updateContainer
} from '$lib/server/db';
import type { RequestHandler } from './$types';

function reverseTranslateList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(', ')
		.map((t) => reverseTranslationMap.get(t))
		.filter((x): x is string => x !== undefined);
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const featureDecisions = createFeatureDecisions(locals.features);

	if (!featureDecisions.useImportFromCsv()) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	let currentOrganizationGuid: string;
	let currentOrganizationalUnitGuid: string | undefined;

	const ability = defineAbilityFor(locals.user);

	try {
		const containerFromParams = await locals.pool.connect(getContainerByGuid(params.guid));
		if (
			isOrganizationalUnitContainer(containerFromParams) &&
			ability.can('read', containerFromParams)
		) {
			currentOrganizationalUnitGuid = containerFromParams.guid;
			currentOrganizationGuid = containerFromParams.organization;
		} else if (
			isOrganizationContainer(containerFromParams) &&
			ability.can('read', containerFromParams)
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
		!ability.can(
			'create',
			containerOfType(
				payloadTypes.enum.indicator_template,
				currentOrganizationGuid,
				currentOrganizationalUnitGuid ?? null,
				currentOrganizationalUnitGuid ?? currentOrganizationGuid,
				env.PUBLIC_KC_REALM
			)
		)
	) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	// Fetch existing custom indicators for upsert matching.
	// Only match against indicators in the "Eigene" (custom) category to avoid
	// accidentally overwriting indicators from other sets (e.g. Wegweiser Kommune).
	const existingIndicators = (await locals.pool.connect(
		getManyContainers(
			[currentOrganizationGuid],
			{
				type: [payloadTypes.enum.indicator_template],
				indicatorCategories: ['indicator_category.custom']
			},
			'alpha'
		)
	)) as Array<IndicatorTemplateContainer>;

	const existingByTitle = new Map(existingIndicators.map((c) => [c.payload.title, c]));

	const existingIndicatorGuids = existingIndicators.map((c) => c.guid);
	const existingActualData =
		existingIndicatorGuids.length > 0
			? await locals.pool.connect(
					getManyContainers(
						[currentOrganizationGuid],
						{
							indicators: existingIndicatorGuids,
							...(currentOrganizationalUnitGuid
								? { organizationalUnits: [currentOrganizationalUnitGuid] }
								: undefined),
							type: [payloadTypes.enum.actual_data]
						},
						'alpha'
					)
				)
			: [];

	// Build a map from indicator GUID to its actual_data container
	const actualDataByIndicator = new Map(
		existingActualData.filter(isActualDataContainer).map((c) => [c.payload.indicator, c])
	);

	const data = await request.formData();
	const csv = data.get('csv');

	if (!csv) {
		return json({ errors: [unwrapFunctionStore(_)('import.error.missing')] }, { status: 400 });
	}

	if (!(csv instanceof File) || (!csv.name.endsWith('.csv') && csv.type !== 'text/csv')) {
		return json(
			{ errors: [unwrapFunctionStore(_)('import.error.unsupported_media_type')] },
			{ status: 400 }
		);
	}

	const csvText = await csv.text();
	const firstLine = csvText.split('\n')[0] ?? '';
	const delimiter = detectDelimiter(firstLine);

	const parser = stream.Readable.from(csvText).pipe(
		parse({
			bom: true,
			columns: true,
			comment: '#',
			delimiter,
			relax_column_count: true,
			skip_empty_lines: true,
			skipRecordsWithError: false
		})
	);

	const containers: {
		indicator: Omit<NewContainer, 'payload'> & Pick<IndicatorTemplateContainer, 'payload'>;
		yearValues: [number, number][];
	}[] = [];
	const errors: string[] = [];
	let lineNumber = 1;

	try {
		for await (const record of parser) {
			lineNumber++;
			try {
				const fields: Record<string, string> = {};
				const yearValues: [number, number][] = [];

				for (const [header, value] of Object.entries(record)) {
					const trimmedValue = (value as string).trim();
					if (!trimmedValue) continue;

					const resolved = resolveColumnHeader(header);
					if (!resolved) continue;

					if (resolved.type === 'field') {
						fields[resolved.key] = trimmedValue;
					} else if (resolved.type === 'year') {
						const num = parseFloat(trimmedValue.replace(',', '.'));
						if (!isNaN(num)) {
							yearValues.push([resolved.year, num]);
						}
					}
				}

				if (!fields.title) {
					errors.push(
						unwrapFunctionStore(_)('import.error.invalid_record', {
							values: {
								line: lineNumber,
								errors: unwrapFunctionStore(_)('indicator_csv.error.missing_title')
							}
						})
					);
					continue;
				}

				// Always include indicator_category.custom so CSV-uploaded indicators
				// can be identified and matched for future upserts.
				const parsedCategories = reverseTranslateList(fields.indicatorCategory);
				const indicatorCategory = parsedCategories.includes('indicator_category.custom')
					? parsedCategories
					: [...parsedCategories, 'indicator_category.custom'];

				const unit = fields.unit ? (reverseTranslationMap.get(fields.unit) ?? '') : '';
				const visibility = fields.visibility
					? (reverseTranslationMap.get(fields.visibility) ?? 'organization')
					: 'organization';
				const editorialStateValue = fields.editorialState
					? (reverseTranslationMap.get(fields.editorialState) ??
						editorialState.enum['editorial_state.draft'])
					: editorialState.enum['editorial_state.draft'];

				yearValues.sort((a, b) => a[0] - b[0]);

				const topic = reverseTranslateList(fields.topic);
				const sdg = fields.sdg ? parseSdgValues(fields.sdg) : [];
				const policyFieldBNK = reverseTranslateList(fields.policyFieldBNK);
				const audience = reverseTranslateList(fields.audience);

				containers.push({
					indicator: emptyContainer.parse({
						managed_by: currentOrganizationalUnitGuid ?? currentOrganizationGuid,
						organization: currentOrganizationGuid,
						organizational_unit: currentOrganizationalUnitGuid ?? null,
						payload: {
							title: fields.title,
							...(fields.description ? { description: fields.description } : {}),
							indicatorCategory,
							indicatorType: reverseTranslateList(fields.indicatorType),
							category: {
								...(audience.length > 0 ? { audience } : {}),
								...(policyFieldBNK.length > 0 ? { policyFieldBNK } : {}),
								...(sdg.length > 0 ? { sdg } : {}),
								...(topic.length > 0 ? { topic } : {})
							},
							unit,
							visibility,
							editorialState: editorialStateValue,
							type: payloadTypes.enum.indicator_template
						},
						realm: env.PUBLIC_KC_REALM,
						user: [
							{
								predicate: predicates.enum['is-creator-of'],
								subject: locals.user.guid
							}
						]
					}) as Omit<NewContainer, 'payload'> & Pick<IndicatorTemplateContainer, 'payload'>,
					yearValues
				});
			} catch (e) {
				errors.push(
					unwrapFunctionStore(_)('import.error.invalid_record', {
						values: { line: lineNumber, errors: String(e) }
					})
				);
			}
		}
	} catch (e) {
		return json({ errors: [String(e)] }, { status: 400 });
	}

	if (errors.length > 0) {
		return json({ errors }, { status: 422 });
	}

	const createdIndicators: IndicatorTemplateContainer[] = [];

	await locals.pool.transaction(async (connection) => {
		for (const { indicator, yearValues } of containers) {
			let indicatorGuid: string;

			const existingContainer = existingByTitle.get(indicator.payload.title);

			if (existingContainer) {
				// Overwriting unchanged values is fine and keeps the upsert logic simple.
				if (ability.can('update', existingContainer)) {
					await updateContainer({
						...existingContainer,
						payload: { ...existingContainer.payload, ...indicator.payload }
					})(connection);
				}
				indicatorGuid = existingContainer.guid;
			} else if (ability.can('create', indicator)) {
				// Create new indicator
				const created = await createContainer(indicator)(connection);
				indicatorGuid = created.guid;
				createdIndicators.push(created as IndicatorTemplateContainer);
			} else {
				indicatorGuid = '';
			}

			if (!indicatorGuid) {
				continue;
			}

			if (yearValues.length > 0) {
				const existingActualDataContainer = actualDataByIndicator.get(indicatorGuid);

				if (existingActualDataContainer && ability.can('update', existingActualDataContainer)) {
					// Overwrite existing actual data values
					await updateContainer({
						...existingActualDataContainer,
						payload: {
							...existingActualDataContainer.payload,
							values: yearValues
						}
					})(connection);
				} else {
					// Create new actual_data container
					const actualDataContainer = containerOfType(
						payloadTypes.enum.actual_data,
						currentOrganizationGuid,
						currentOrganizationalUnitGuid ?? null,
						currentOrganizationalUnitGuid ?? currentOrganizationGuid,
						env.PUBLIC_KC_REALM
					) as Omit<NewContainer, 'payload'> & { payload: ActualDataContainer['payload'] };

					actualDataContainer.payload = {
						...actualDataContainer.payload,
						indicator: indicatorGuid,
						title: indicator.payload.title,
						values: yearValues
					};

					actualDataContainer.user = [
						{
							predicate: predicates.enum['is-creator-of'],
							subject: locals.user.guid
						}
					];

					if (ability.can('create', actualDataContainer))
						await createContainer(actualDataContainer)(connection);
				}
			}
		}
	});

	return json({ success: true, containers: createdIndicators });
};

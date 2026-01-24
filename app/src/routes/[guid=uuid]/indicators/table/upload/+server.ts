import { error, json } from '@sveltejs/kit';
import { parse } from 'csv-parse';
import stream from 'node:stream';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import { createFeatureDecisions } from '$lib/features';
import {
	type ActualDataPayload,
	containerOfType,
	editorialState,
	type IndicatorTemplatePayload,
	isContainerWithPayloadType,
	newContainer,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	detectDelimiter,
	parseSdgValues,
	reverseTranslationMap,
	resolveColumnHeader
} from '$lib/server/csv';
import {
	createContainer,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { RequestHandler } from './$types';

function filterDefined(arr: (string | undefined)[]): string[] {
	return arr.filter((x): x is string => x !== undefined);
}

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!createFeatureDecisions(locals.features).useImportFromCsv()) {
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
			isContainerWithPayloadType(payloadTypes.enum.organizational_unit, containerFromParams) &&
			defineAbilityFor(locals.user).can('read', containerFromParams)
		) {
			currentOrganizationalUnitGuid = containerFromParams.guid;
			currentOrganizationGuid = containerFromParams.organization;
		} else if (
			isContainerWithPayloadType(payloadTypes.enum.organization, containerFromParams) &&
			defineAbilityFor(locals.user).can('read', containerFromParams)
		) {
			currentOrganizationGuid = containerFromParams.guid;
		} else {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}
	} catch {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	if (
		!defineAbilityFor(locals.user).can(
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

	const organizationalUnits = await locals.pool.connect(
		getManyOrganizationalUnitContainers({
			include: { organization: currentOrganizationGuid }
		})
	);

	// Fetch existing indicator titles (both old and new system)
	const [existingIndicators, existingTemplates] = await Promise.all([
		locals.pool.connect(
			getManyContainers([currentOrganizationGuid], { type: [payloadTypes.enum.indicator] }, 'alpha')
		),
		locals.pool.connect(
			getManyContainers([], { type: [payloadTypes.enum.indicator_template] }, 'alpha')
		)
	]);
	const existingTitles = new Set(
		[...existingIndicators, ...existingTemplates].map((c) => c.payload.title)
	);

	// Track titles created during this import to handle duplicates within the same batch
	const usedTitles = new Set(existingTitles);

	const data = await request.formData();
	const csv = data.get('csv');

	if (!csv) {
		return json({ errors: [unwrapFunctionStore(_)('import.error.missing')] }, { status: 400 });
	}

	if (!(csv instanceof File) || csv.type !== 'text/csv') {
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
		indicator: NewContainer<IndicatorTemplatePayload>;
		title: string;
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

				// Resolve organizational unit by name
				const orgUnit = fields.organizationalUnit
					? organizationalUnits.find(({ payload }) => payload.name === fields.organizationalUnit)
					: organizationalUnits.find(({ guid }) => guid === currentOrganizationalUnitGuid);

				// Build payload fields, translating labels back to enum keys
				const indicatorCategory = fields.indicatorCategory
					? filterDefined(
							fields.indicatorCategory.split(', ').map((t: string) => reverseTranslationMap.get(t))
						)
					: [];

				const indicatorType = fields.indicatorType
					? filterDefined(
							fields.indicatorType.split(', ').map((t: string) => reverseTranslationMap.get(t))
						)
					: [];

				const topic = fields.topic
					? filterDefined(fields.topic.split(', ').map((t: string) => reverseTranslationMap.get(t)))
					: [];

				const sdg = fields.sdg ? parseSdgValues(fields.sdg) : [];

				const policyFieldBNK = fields.policyFieldBNK
					? filterDefined(
							fields.policyFieldBNK.split(', ').map((t: string) => reverseTranslationMap.get(t))
						)
					: [];

				const audience = fields.audience
					? filterDefined(
							fields.audience.split(', ').map((t: string) => reverseTranslationMap.get(t))
						)
					: [];

				const unit = fields.unit ? (reverseTranslationMap.get(fields.unit) ?? '') : '';
				const visibility = fields.visibility
					? (reverseTranslationMap.get(fields.visibility) ?? 'organization')
					: 'organization';
				const editorialStateValue = fields.editorialState
					? (reverseTranslationMap.get(fields.editorialState) ??
						editorialState.enum['editorial_state.draft'])
					: editorialState.enum['editorial_state.draft'];

				yearValues.sort((a, b) => a[0] - b[0]);

				// Deduplicate title
				let title = fields.title;
				if (usedTitles.has(title)) {
					let suffix = 1;
					while (usedTitles.has(`${fields.title} (${suffix})`)) {
						suffix++;
					}
					title = `${fields.title} (${suffix})`;
				}
				usedTitles.add(title);

				containers.push({
					title,
					indicator: newContainer.parse({
						managed_by: orgUnit?.guid ?? currentOrganizationGuid,
						organization: currentOrganizationGuid,
						organizational_unit: orgUnit?.guid ?? null,
						payload: {
							title,
							...(fields.description ? { description: fields.description } : {}),
							indicatorCategory,
							indicatorType,
							topic,
							sdg,
							policyFieldBNK,
							audience,
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
					}) as NewContainer<IndicatorTemplatePayload>,
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

	await locals.pool.transaction(async (connection) => {
		for (const { indicator, title, yearValues } of containers) {
			const created = await createContainer(indicator)(connection);

			if (yearValues.length > 0) {
				const actualDataContainer = containerOfType(
					payloadTypes.enum.actual_data,
					indicator.organization,
					indicator.organizational_unit,
					indicator.managed_by,
					env.PUBLIC_KC_REALM
				) as NewContainer<ActualDataPayload>;

				actualDataContainer.payload = {
					...actualDataContainer.payload,
					indicator: created.guid,
					title,
					values: yearValues
				};

				actualDataContainer.user = [
					{
						predicate: predicates.enum['is-creator-of'],
						subject: locals.user.guid
					}
				];

				await createContainer(actualDataContainer)(connection);
			}
		}
	});

	return json({ success: true });
};

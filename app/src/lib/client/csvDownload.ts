import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { isActualDataContainer, type Container, type IndicatorContainer } from '$lib/models';

const $_ = unwrapFunctionStore(_);

/**
 * Escapes a CSV field value for semicolon-delimited CSV.
 * Wraps in quotes if the value contains semicolons, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
	if (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Translates an array of enum values to their German labels, joined by ", ".
 */
function translateValues(values: string[]): string {
	return values.map((v) => $_(v) as string).join(', ');
}

/**
 * Generates a semicolon-delimited CSV string from indicator rows.
 * Includes a BOM for Excel compatibility.
 */
export function generateIndicatorCsv(
	rows: Container[],
	allYears: number[],
	organizationalUnits: Map<string, string>,
	actualDataContainers: Container[]
): string {
	const BOM = '\uFEFF';

	const fixedHeaders = [
		$_('title'),
		$_('description'),
		$_('visibility.label'),
		$_('indicator_category'),
		$_('indicator_type'),
		$_('topic'),
		$_('category'),
		$_('policy_field_bnk'),
		$_('audience'),
		$_('editorial_state'),
		$_('organizational_unit'),
		$_('label.unit')
	];

	const yearHeaders = allYears.map(String);
	const headers = [...fixedHeaders, ...yearHeaders];

	const csvRows = [headers.map(escapeCsvField).join(';')];

	for (const row of rows) {
		const p = row.payload as IndicatorContainer['payload'];

		const actualData = actualDataContainers
			.filter(isActualDataContainer)
			.find(({ payload }) => payload.indicator === row.guid);
		const valuesMap = new Map<number, number>(actualData?.payload.values ?? []);

		const fields: string[] = [
			p.title ?? '',
			p.description ?? '',
			p.visibility ? ($_(`visibility.${p.visibility}`) as string) : '',
			'indicatorCategory' in p ? translateValues(p.indicatorCategory ?? []) : '',
			'indicatorType' in p ? translateValues(p.indicatorType ?? []) : '',
			'topic' in p ? translateValues(p.topic ?? []) : '',
			'sdg' in p ? translateValues(p.sdg ?? []) : '',
			'policyFieldBNK' in p ? translateValues(p.policyFieldBNK ?? []) : '',
			'audience' in p ? translateValues(p.audience ?? []) : '',
			'editorialState' in p ? ($_(`${p.editorialState}`) as string) : '',
			row.organizational_unit ? (organizationalUnits.get(row.organizational_unit) ?? '') : '',
			p.unit ? ($_(`${p.unit}`) as string) : ''
		];

		for (const year of allYears) {
			const val = valuesMap.get(year);
			fields.push(val !== undefined ? String(val) : '');
		}

		csvRows.push(fields.map(escapeCsvField).join(';'));
	}

	return BOM + csvRows.join('\n');
}

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCsv(csvContent: string, filename: string): void {
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

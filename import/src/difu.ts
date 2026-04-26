import { z } from 'zod';
import xlsx from 'node-xlsx';

export const municipalityKey = z.preprocess((value) => {
	const digits = String(value ?? '').replace(/\D/g, '');
	return digits ? digits.padStart(8, '0') : undefined;
}, z.string().length(8));

export const parsedRow = z.object({
	code: z.string().trim().min(1),
	name: z.string().trim().min(1),
	official_municipality_key: municipalityKey,
	row_number: z.number().int().positive(),
	source_sheet: z.enum(['Kreistypen 2021', 'Gemeindetypen 2022'])
});

type ParsedWorkbook = ReturnType<typeof xlsx.parse>;

function getValue(record: Record<string, unknown>, header: string | readonly string[]) {
	const headers = Array.isArray(header) ? header : [header];

	for (const key of headers) {
		const value = String(record[key] ?? '').trim();
		if (value) {
			return value;
		}
	}
}

function readSheet(workbook: ParsedWorkbook, sheetName: string) {
	const worksheet = workbook.find((sheet) => sheet.name === sheetName);

	if (!worksheet) {
		throw new Error(
			`Sheet "${sheetName}" was not found. Available sheets: ${workbook.map(({ name }) => name).join(', ')}`
		);
	}

	const [headerRow = [], ...rows] = worksheet.data as unknown[][];
	const headers = headerRow.map((value) => String(value ?? '').trim());

	return rows
		.filter((row) => row.some((value) => String(value ?? '').trim() !== ''))
		.map((row) =>
			Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
		) as Record<string, unknown>[];
}

function parseSheet(
	workbook: ParsedWorkbook,
	sheetName: 'Kreistypen 2021' | 'Gemeindetypen 2022',
	headers: { code: string; name: string; key: string }
) {
	return readSheet(workbook, sheetName).map((record: Record<string, unknown>, index: number) => {
		try {
			return parsedRow.parse({
				code: getValue(record, headers.code),
				name: getValue(record, headers.name),
				official_municipality_key: getValue(record, headers.key),
				row_number: index + 2,
				source_sheet: sheetName
			});
		} catch (error) {
			throw new Error(
				`Could not parse row ${index + 2} in "${sheetName}". ` +
					`Available headers: ${Object.keys(record).join(', ')}. ` +
					`Reason: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	});
}

export function getAdministrativeAreasDifu(file: string) {
	const workbook = xlsx.parse(file, { raw: false, blankrows: false });
	const rows = [
		...parseSheet(workbook, 'Kreistypen 2021', {
			code: 'Kreistyp',
			name: 'Kreise (2021) Name',
			key: 'Kreise Kennziffer'
		}),
		...parseSheet(workbook, 'Gemeindetypen 2022', {
			code: 'Gemeindetyp',
			name: 'GEM_NAME',
			key: 'GEM2022'
		})
	];
	return new Map(rows.map((row) => [row.official_municipality_key, row]));
}

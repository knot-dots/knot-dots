import { z } from 'zod';
import xlsx from 'node-xlsx';

type ParsedWorkbook = ReturnType<typeof xlsx.parse>;

const administrativeAreaDifu = z.object({
	code: z.string(),
	name: z.string().nonempty(),
	official_municipality_key: z.stringFormat('AGS', /\d+/).transform((v) => v.padStart(8, '0'))
});

export type AdministrativeAreaDifu = z.infer<typeof administrativeAreaDifu>;

function readSheet(
	workbook: ParsedWorkbook,
	sheetName: string,
	headers: { code: string; name: string; key: string }
) {
	const worksheet = workbook.find((sheet) => sheet.name === sheetName);

	if (!worksheet) {
		throw new Error(
			`Sheet "${sheetName}" was not found. Available sheets: ${workbook.map(({ name }) => name).join(', ')}`
		);
	}

	const [headerRow = [], ...rows] = worksheet.data as unknown[][];

	return rows
		.filter((row) => row.some((value) => String(value ?? '').trim() !== ''))
		.map((row) => {
			return Object.fromEntries(
				headerRow
					.map((value) => String(value ?? '').trim())
					.map((header, index) => [header, row[index] ?? ''])
			);
		})
		.map((record: Record<string, unknown>, index: number) => {
			try {
				return administrativeAreaDifu.parse({
					code: record[headers.code],
					name: record[headers.name],
					official_municipality_key: record[headers.key]
				});
			} catch (error) {
				throw new Error(
					`Could not parse row ${index + 2} in "${sheetName}". Available headers: ${Object.keys(record).join(', ')}.`,
					{ cause: error }
				);
			}
		});
}

export function getAdministrativeAreasDifu(file: string) {
	const workbook = xlsx.parse(file, { raw: false, blankrows: false });
	const rows = [
		...readSheet(workbook, 'Kreistypen 2021', {
			code: 'Kreistyp',
			name: 'Kreise (2021) Name',
			key: 'Kreise Kennziffer'
		}),
		...readSheet(workbook, 'Gemeindetypen 2022', {
			code: 'Gemeindetyp',
			name: 'GEM_NAME',
			key: 'GEM2022'
		})
	];
	return new Map(rows.map((row) => [row.official_municipality_key, row]));
}

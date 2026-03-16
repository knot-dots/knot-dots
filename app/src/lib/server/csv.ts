import de from '$lib/locales/de.json';

/**
 * Reverse translation map: maps German translated labels back to internal enum keys.
 * Built from the flat entries of the German locale file.
 */
export const reverseTranslationMap = new Map<string, string>(
	Object.entries(de)
		.filter((e): e is [string, string] => typeof e[1] === 'string')
		.map(([k, v]) => [v, k])
);

/**
 * Maps of alternative column header spellings to canonical keys.
 * Used by CSV upload parsers to accept slight naming variations.
 */
export const indicatorColumnAliases = new Map<string, string>([
	['Bezeichnung', 'title'],
	['Bezeichnung des Indikators', 'title'],
	['Titel', 'title'],
	['Title', 'title'],
	['Name', 'title'],
	['Beschreibung', 'description'],
	['Berechnung', 'description'],
	['Description', 'description'],
	['Sichtbarkeit', 'visibility'],
	['Visibility', 'visibility'],
	['Einheit', 'unit'],
	['Unit', 'unit'],
	['Indikator-Kategorie', 'indicatorCategory'],
	['Indicator Category', 'indicatorCategory'],
	['Indikatorkategorie', 'indicatorCategory'],
	['Indikator-Typ', 'indicatorType'],
	['Indikatortyp', 'indicatorType'],
	['Indicator Type', 'indicatorType'],
	['Themenfeld', 'topic'],
	['Topic', 'topic'],
	['SDG', 'sdg'],
	['Nr. des SDGs', 'sdg'],
	['Handlungsfeld BNK', 'policyFieldBNK'],
	['Policy Field BNK', 'policyFieldBNK'],
	['Zielgruppe', 'audience'],
	['Audience', 'audience'],
	['Redaktioneller Status', 'editorialState'],
	['Editorial State', 'editorialState'],
	['Organisationsebene', 'organizationalUnit'],
	['Organizational Unit', 'organizationalUnit']
]);

/**
 * Resolves a CSV column header to a canonical key.
 * First checks the alias map, then checks if the header is a number (year column).
 * Returns the canonical key, the year number, or undefined if unrecognized.
 */
export function resolveColumnHeader(
	header: string
): { type: 'field'; key: string } | { type: 'year'; year: number } | undefined {
	const trimmed = header.trim();

	// Check alias map
	const alias = indicatorColumnAliases.get(trimmed);
	if (alias) {
		return { type: 'field', key: alias };
	}

	// Check if it's a year (4-digit number)
	const yearMatch = trimmed.match(/^\d{4}$/);
	if (yearMatch) {
		return { type: 'year', year: parseInt(trimmed, 10) };
	}

	return undefined;
}

/**
 * Parses an SDG value from CSV which may be:
 * - A plain number like "1" or "17" → mapped to "sdg.01" / "sdg.17"
 * - A label like "1 - Keine Armut" → mapped via reverseTranslationMap
 * - Multiple values separated by ", "
 * Returns an array of resolved SDG enum keys.
 */
export function parseSdgValues(value: string): string[] {
	const parts = value
		.split(', ')
		.map((p) => p.trim())
		.filter(Boolean);
	const results: string[] = [];

	for (const part of parts) {
		// Try plain number (e.g. "1", "17")
		const num = parseInt(part, 10);
		if (!isNaN(num) && num >= 1 && num <= 17 && String(num) === part) {
			results.push(`sdg.${String(num).padStart(2, '0')}`);
			continue;
		}

		// Try label via reverseTranslationMap (e.g. "1 - Keine Armut")
		const key = reverseTranslationMap.get(part);
		if (key) {
			results.push(key);
			continue;
		}

		// Try "N - Label" format: extract leading number
		const match = part.match(/^(\d{1,2})\s*-/);
		if (match) {
			const n = parseInt(match[1], 10);
			if (n >= 1 && n <= 17) {
				results.push(`sdg.${String(n).padStart(2, '0')}`);
			}
		}
	}

	return results;
}

/**
 * Auto-detects the CSV delimiter by counting occurrences of ';' and ',' in the first line.
 */
export function detectDelimiter(firstLine: string): ',' | ';' {
	const semicolons = (firstLine.match(/;/g) ?? []).length;
	const commas = (firstLine.match(/,/g) ?? []).length;
	return semicolons >= commas ? ';' : ',';
}

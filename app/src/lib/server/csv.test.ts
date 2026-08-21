import { describe, expect, it } from 'vitest';
import { resolveColumnHeader, reverseTranslationMap } from '$lib/server/csv';

describe('resolveColumnHeader', () => {
	it.each([
		['Titel', 'title'],
		['Beschreibung', 'description'],
		['Sichtbarkeit', 'visibility'],
		['Indikatoren-Set', 'indicatorCategory'],
		['Art des Indikators', 'indicatorType'],
		['Themenfeld', 'topic'],
		['SDG', 'sdg'],
		['Handlungsfeld (BNK 2.0)', 'policyFieldBNK'],
		['Wirkungsbereich', 'audience'],
		['Redaktionsstatus', 'editorialState'],
		['Organisations-Ebene', 'organizationalUnit'],
		['Einheit', 'unit']
	])('resolves the export header %j to the field %j', (header, key) => {
		expect(resolveColumnHeader(header)).toEqual({ type: 'field', key });
	});

	it('resolves four-digit headers to year columns', () => {
		expect(resolveColumnHeader('2024')).toEqual({ type: 'year', year: 2024 });
	});
});

describe('reverseTranslationMap', () => {
	it('maps indicator type labels to enum keys', () => {
		expect(reverseTranslationMap.get('Schlüsselindikator')).toBe('indicator_type.key');
		expect(reverseTranslationMap.get('Leistungsindikator')).toBe('indicator_type.performance');
		expect(reverseTranslationMap.get('Wirkungsindikator')).toBe('indicator_type.impact');
	});
});
